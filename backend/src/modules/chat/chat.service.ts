import type Groq from 'groq-sdk';
import { ChatMessageRole } from '../../generated/prisma/client';
import { groq } from '../../shared/groq';
import { checkMessageSafety } from '../../shared/guard';
import { logger } from '../../shared/logger';
import { sanitizeMessage } from '../../shared/sanitize';
import { type ChatMessageRecord, getMessagesByUser, saveMessage } from './chat.repository';
import { buildSystemPrompt } from './chat.prompt';
import { type ChatMovieResult, discoverMovieTool, executeTool, searchMovieTool } from './chat.tools';

const CHAT_MODEL = 'qwen/qwen3.8-27b';
const CHAT_TIMEOUT_MS = 30000;
const MAX_TOOL_CALLS = 3;
const BLOCKED_REPLY = 'Solo puedo ayudarte con peliculas y entretenimiento.';

export type { ChatMovieResult };

async function callGroqChat(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  tools?: Groq.Chat.ChatCompletionTool[],
): Promise<Groq.Chat.ChatCompletion> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    return await groq.chat.completions.create(
      { model: CHAT_MODEL, messages, tools, max_tokens: 400 },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// cada vuelta es un round-trip a groq; corta sin tool_calls o al llegar al limite de reintentos de herramienta
async function runToolCallingLoop(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  movies: ChatMovieResult[],
): Promise<string> {
  let toolCallsUsed = 0;

  while (true) {
    const completion = await callGroqChat(messages, [searchMovieTool, discoverMovieTool]);
    const responseMessage = completion.choices[0]?.message;
    const toolCall = responseMessage?.tool_calls?.[0];

    if (!toolCall || toolCallsUsed >= MAX_TOOL_CALLS) {
      const content = responseMessage?.content;

      // groq a veces devuelve el resultado del tool sin texto; le pedimos que lo redacte, ya sin tools
      if (!content && movies.length > 0) {
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

    const toolResultContent = await executeTool(toolCall, movies);

    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResultContent,
    });
  }
}

// la ventana de historial puede cortar una traza por la mitad, y un mensaje tool sin su assistant
// tool_call hace que groq rechace el request; por eso se arranca siempre en un turno de usuario
function startAtFirstUserTurn(history: ChatMessageRecord[]): ChatMessageRecord[] {
  const firstUserIndex = history.findIndex((entry) => entry.role === ChatMessageRole.USER);
  return firstUserIndex === -1 ? [] : history.slice(firstUserIndex);
}

// reconstruye el mensaje tal como lo vio groq: los assistant con tool_calls y los tool con su tool_call_id
function toGroqMessage(entry: ChatMessageRecord): Groq.Chat.ChatCompletionMessageParam {
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

// persiste la traza del tool calling (assistant con tool_call + tool con su resultado) en el orden en que ocurrio,
// para que los turnos siguientes vean el patron completo y el modelo siga usando tools
async function saveToolTrace(userId: number, trace: Groq.Chat.ChatCompletionMessageParam[]): Promise<void> {
  for (const entry of trace) {
    if (entry.role === 'assistant') {
      await saveMessage(userId, ChatMessageRole.ASSISTANT, typeof entry.content === 'string' ? entry.content : '', {
        toolCalls: entry.tool_calls,
      });
    } else if (entry.role === 'tool') {
      await saveMessage(
        userId,
        ChatMessageRole.TOOL,
        typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content),
        { toolCallId: entry.tool_call_id },
      );
    }
  }
}

export async function handleChatMessage(
  userId: number,
  message: string,
): Promise<{ reply: string; movies: ChatMovieResult[] }> {
  try {
    const { clean, blocked } = sanitizeMessage(message);

    if (blocked) {
      await saveMessage(userId, ChatMessageRole.USER, clean);
      await saveMessage(userId, ChatMessageRole.ASSISTANT, BLOCKED_REPLY);
      return { reply: BLOCKED_REPLY, movies: [] };
    }

    // checkMessageSafety ya es fail-closed: si groq falla, allowed queda en false
    const safety = await checkMessageSafety(clean);

    if (!safety.allowed) {
      await saveMessage(userId, ChatMessageRole.USER, clean);
      await saveMessage(userId, ChatMessageRole.ASSISTANT, BLOCKED_REPLY);
      return { reply: BLOCKED_REPLY, movies: [] };
    }

    await saveMessage(userId, ChatMessageRole.USER, clean);

    const systemPrompt = await buildSystemPrompt(userId);
    // se pide despues de guardar el mensaje actual, asi que el historial ya lo incluye como ultimo turno
    const history = await getMessagesByUser(userId);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...startAtFirstUserTurn(history).map(toGroqMessage),
    ];

    // runToolCallingLoop agrega a messages los assistant tool_call y los tool de este turno; eso es la traza a persistir
    const historyLength = messages.length;
    const movies: ChatMovieResult[] = [];
    const reply = await runToolCallingLoop(messages, movies);

    await saveToolTrace(userId, messages.slice(historyLength));
    await saveMessage(userId, ChatMessageRole.ASSISTANT, reply);

    return { reply, movies };
  } catch (err) {
    logger.error({ err, userId }, 'fallo el procesamiento del mensaje de chat');
    throw new Error('no se pudo procesar el mensaje de chat');
  }
}
