import type Groq from 'groq-sdk';

import { ChatMessageRole } from '../../generated/prisma/client';
import { CHAT_HISTORY_LIMIT } from '../../shared/constants';
import { checkMessageSafety } from '../../shared/guard';
import { logger } from '../../shared/logger';
import { sanitizeMessage } from '../../shared/sanitize';
import { processChatTurn, startAtFirstUserTurn, toGroqMessage } from './chat.groq';
import { getMessagesByUser, saveMessage } from './chat.repository';
import { buildSystemPrompt } from './chat.prompt';
import type { ChatMovieResult } from './chat.tools';
import { asksForMovies, collectSeenMovieIds, compactToolResult } from './chat.utils';



const BLOCKED_REPLY = 'Solo puedo ayudarte con peliculas y entretenimiento.';

export type { ChatMovieResult };



// sin la traza en el historial, el modelo deja de usar tools en los seguimientos ("recomendame otra")
async function saveToolTrace(userId: number, trace: Groq.Chat.ChatCompletionMessageParam[]): Promise<void> {
  for (const entry of trace) {
    if (entry.role === 'assistant') {
      await saveMessage(userId, ChatMessageRole.ASSISTANT, typeof entry.content === 'string' ? entry.content : '', {
        toolCalls: entry.tool_calls,
      });
    } else if (entry.role === 'tool') {
      const content = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
      await saveMessage(userId, ChatMessageRole.TOOL, compactToolResult(content), { toolCallId: entry.tool_call_id });
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

    const safety = await checkMessageSafety(clean);

    if (!safety.allowed) {
      await saveMessage(userId, ChatMessageRole.USER, clean);
      await saveMessage(userId, ChatMessageRole.ASSISTANT, BLOCKED_REPLY);
      return { reply: BLOCKED_REPLY, movies: [] };
    }

    await saveMessage(userId, ChatMessageRole.USER, clean);

    const systemPrompt = await buildSystemPrompt(userId);
    // se pide despues de guardar el mensaje actual, asi que el historial ya lo incluye como ultimo turno
    const history = await getMessagesByUser(userId, CHAT_HISTORY_LIMIT);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...startAtFirstUserTurn(history).map(toGroqMessage),
    ];

    const historyLength = messages.length;
    const { reply, movies } = await processChatTurn(messages, collectSeenMovieIds(history), asksForMovies(clean));

    // processChatTurn agrega la traza de tools de este turno al final de messages
    await saveToolTrace(userId, messages.slice(historyLength));
    await saveMessage(userId, ChatMessageRole.ASSISTANT, reply);

    return { reply, movies };
  } catch (err) {
    logger.error({ err, userId }, 'fallo el procesamiento del mensaje de chat');
    throw new Error('no se pudo procesar el mensaje de chat');
  }
}
