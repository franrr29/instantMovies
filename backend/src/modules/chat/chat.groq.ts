import type Groq from 'groq-sdk';

import { ChatMessageRole } from '../../generated/prisma/client';
import { CHAT_MAX_TOKENS, CHAT_MAX_TOOL_CALLS, CHAT_TIMEOUT_MS, GROQ_MODEL } from '../../shared/constants';
import { env } from '../../shared/env';
import { groq } from '../../shared/groq';
import type { ChatMessageRecord } from './chat.repository';
import { type ChatMovieResult, discoverMoviesTool, executeTool, searchMovieTool } from './chat.tools';



// una ventana de historial cortada puede dejar un mensaje tool sin su assistant tool_call, y groq
// rechaza el request; por eso el historial arranca siempre en un turno de usuario
export function startAtFirstUserTurn(history: ChatMessageRecord[]): ChatMessageRecord[] {
  const firstUserIndex = history.findIndex((entry) => entry.role === ChatMessageRole.USER);
  return firstUserIndex === -1 ? [] : history.slice(firstUserIndex);
}



export function toGroqMessage(entry: ChatMessageRecord): Groq.Chat.ChatCompletionMessageParam {
  if (entry.role === ChatMessageRole.TOOL) {
    return { role: 'tool', tool_call_id: entry.toolCallId ?? '', content: entry.content };
  }

  if (entry.role === ChatMessageRole.ASSISTANT && entry.toolCalls) {
    return {
      role: 'assistant',
      content: entry.content || null,
      tool_calls: entry.toolCalls as unknown as Groq.Chat.ChatCompletionMessageToolCall[],
    };
  }

  return { role: entry.role === ChatMessageRole.USER ? 'user' : 'assistant', content: entry.content };
}



async function callGroqChat(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  tools?: Groq.Chat.ChatCompletionTool[],
  toolChoice?: 'auto' | 'required',
): Promise<Groq.Chat.ChatCompletion> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    return await groq.chat.completions.create(
      { model: GROQ_MODEL, messages, tools, tool_choice: toolChoice, max_tokens: CHAT_MAX_TOKENS },
      {
        signal: controller.signal,
        ...(env.HELICONE_API_KEY ? { headers: { 'Helicone-Property-Type': 'chat' } } : {}),
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}



async function runToolCallingLoop(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  collectedMovies: ChatMovieResult[],
  forceTool: boolean,
  seenMovieIds: number[],
): Promise<string> {
  let toolCallsUsed = 0;

  // sale cuando el modelo responde sin tool_call o al llegar a CHAT_MAX_TOOL_CALLS
  while (true) {
    // solo la primera vuelta fuerza la tool; con el resultado ya en el contexto el modelo decide
    const toolChoice = forceTool && toolCallsUsed === 0 ? 'required' : 'auto';
    const completion = await callGroqChat(messages, [searchMovieTool, discoverMoviesTool], toolChoice);
    const responseMessage = completion.choices[0]?.message;
    const toolCall = responseMessage?.tool_calls?.[0];

    if (!toolCall || toolCallsUsed >= CHAT_MAX_TOOL_CALLS) {
      const content = responseMessage?.content;

      // groq a veces devuelve el resultado del tool sin texto; le pedimos que lo redacte, ya sin tools
      if (!content && collectedMovies.length > 0) {
        const finalCompletion = await callGroqChat(messages);
        return finalCompletion.choices[0]?.message?.content ?? '';
      }

      return content ?? '';
    }

    toolCallsUsed += 1;

    messages.push({
      role: 'assistant',
      content: responseMessage?.content ?? null,
      tool_calls: [toolCall],
    });

    // executeTool no lanza si tmdb falla: devuelve un resultado de error para el modelo
    const toolResultContent = await executeTool(toolCall, collectedMovies, seenMovieIds);

    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResultContent,
    });
  }
}



// agrega a messages los assistant tool_call y los tool del turno; el llamador los persiste como traza
export async function processChatTurn(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  seenMovieIds: number[],
  forceTool: boolean,
): Promise<{ reply: string; movies: ChatMovieResult[] }> {
  const movies: ChatMovieResult[] = [];
  const reply = await runToolCallingLoop(messages, movies, forceTool, seenMovieIds);

  return { reply, movies };
}
