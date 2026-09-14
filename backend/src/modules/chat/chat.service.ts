import type Groq from 'groq-sdk';
import { ChatMessageRole } from '../../generated/prisma/client';
import { groq } from '../../shared/groq';
import { checkMessageSafety } from '../../shared/guard';
import { logger } from '../../shared/logger';
import { sanitizeMessage } from '../../shared/sanitize';
import { getMessagesByUser, saveMessage } from './chat.repository';
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
      ...history.map((entry) => ({
        role: (entry.role === ChatMessageRole.USER ? 'user' : 'assistant') as 'user' | 'assistant',
        content: entry.content,
      })),
    ];

    const movies: ChatMovieResult[] = [];
    const reply = await runToolCallingLoop(messages, movies);

    await saveMessage(userId, ChatMessageRole.ASSISTANT, reply);

    return { reply, movies };
  } catch (err) {
    logger.error({ err, userId }, 'fallo el procesamiento del mensaje de chat');
    throw new Error('no se pudo procesar el mensaje de chat');
  }
}
