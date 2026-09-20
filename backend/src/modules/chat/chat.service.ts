import type Groq from 'groq-sdk';
import { z } from 'zod';
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
const HISTORY_LIMIT = 10;
const BLOCKED_REPLY = 'Solo puedo ayudarte con peliculas y entretenimiento.';

// señales de que el usuario pide peliculas. Siempre empiezan en limite de palabra (nunca son un substring
// de otra palabra): las raices aceptan sufijo (recomendame, peliculas, buscame), el resto es palabra completa
// con plural opcional, y "dame" solo cuenta en "dame mas" / "dame algo" (no en "dame un momento")
const MOVIE_REQUEST_STEMS = ['recomend', 'pelicul', 'film', 'busca', 'sugeri'];
const MOVIE_REQUEST_WORDS = ['movie', 'terror', 'comedia', 'accion', 'thriller', 'drama', 'otra'];
const MOVIE_REQUEST_REGEX = new RegExp(
  [
    `\\b(?:${MOVIE_REQUEST_STEMS.join('|')})\\w*`,
    `\\b(?:${MOVIE_REQUEST_WORDS.join('|')})s?\\b`,
    '\\bdame\\s+(?:mas|algo)\\b',
  ].join('|'),
);

// resultado de tool con solo lo que necesita el historial: la peli por id y titulo
const toolMovieSchema = z.object({ id: z.number(), title: z.string() });
const toolMoviesResultSchema = z.union([z.array(toolMovieSchema), toolMovieSchema.transform((movie) => [movie])]);

// formato compacto con el que se guardan los mensajes TOOL en el historial
const compactMoviesSchema = z.array(z.object({ tmdbId: z.number() }));

export type { ChatMovieResult };

// se compara sin tildes ni mayusculas
export function asksForMovies(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return MOVIE_REQUEST_REGEX.test(normalized);
}

// ids de las peliculas que ya aparecieron en resultados de tool del historial; discover_movies los excluye
// para no repetir recomendaciones
export function collectSeenMovieIds(history: ChatMessageRecord[]): number[] {
  return history
    .filter((entry) => entry.role === ChatMessageRole.TOOL)
    .flatMap((entry) => {
      try {
        const parsed = compactMoviesSchema.safeParse(JSON.parse(entry.content));
        return parsed.success ? parsed.data.map((movie) => movie.tmdbId) : [];
      } catch {
        return [];
      }
    });
}

// el modelo no necesita overview, poster ni rating de turnos anteriores; si el content no es una lista de
// peliculas (ej. { error }) se guarda tal cual
export function compactToolResult(content: string): string {
  try {
    const parsed = toolMoviesResultSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      return content;
    }

    return JSON.stringify(parsed.data.map((movie) => ({ tmdbId: movie.id, title: movie.title })));
  } catch {
    return content;
  }
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
      { model: CHAT_MODEL, messages, tools, tool_choice: toolChoice, max_tokens: 400 },
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
  forceTool: boolean,
  seenMovieIds: number[],
): Promise<string> {
  let toolCallsUsed = 0;

  while (true) {
    // si el mensaje pide peliculas, la primera vuelta del turno obliga a usar una tool; ya con el resultado en el contexto, el modelo decide
    const toolChoice = forceTool && toolCallsUsed === 0 ? 'required' : 'auto';
    const completion = await callGroqChat(messages, [searchMovieTool, discoverMovieTool], toolChoice);
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

    // executeTool ya devuelve un resultado de error si tmdb falla, asi que no lanza por eso
    const toolResultContent = await executeTool(toolCall, movies, seenMovieIds);

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
    const history = await getMessagesByUser(userId, HISTORY_LIMIT);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...startAtFirstUserTurn(history).map(toGroqMessage),
    ];

    // runToolCallingLoop agrega a messages los assistant tool_call y los tool de este turno; eso es la traza a persistir
    const historyLength = messages.length;
    const movies: ChatMovieResult[] = [];
    const reply = await runToolCallingLoop(messages, movies, asksForMovies(clean), collectSeenMovieIds(history));

    await saveToolTrace(userId, messages.slice(historyLength));
    await saveMessage(userId, ChatMessageRole.ASSISTANT, reply);

    return { reply, movies };
  } catch (err) {
    logger.error({ err, userId }, 'fallo el procesamiento del mensaje de chat');
    throw new Error('no se pudo procesar el mensaje de chat');
  }
}
