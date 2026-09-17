import { z } from 'zod';
import { groq } from './groq';
import { logger } from './logger';

const guardResponseSchema = z.object({
  allowed: z.boolean(),
});

export interface MessageSafety {
  allowed: boolean;
}

const GUARD_TIMEOUT_MS = 10000;
const GUARD_JSON_FALLBACK_REGEX = /\{[\s\S]*?"allowed"\s*:\s*(true|false)[\s\S]*?\}/;

class GuardParseError extends Error {}

async function requestGuardCompletion(message: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GUARD_TIMEOUT_MS);

  try {
    return await groq.chat.completions.create(
      {
        model: 'qwen/qwen3.8-27b',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Evaluá si el siguiente mensaje de un usuario puede ser parte de una conversacion con un asistente de peliculas, series, cine o entretenimiento audiovisual. Permití saludos, despedidas y mensajes conversacionales generales (como "hola", "gracias", "como estas"), aunque no mencionen peliculas explicitamente: son una parte normal de esa conversacion. Bloqueá unicamente mensajes claramente ajenos a ese dominio, como politica, codigo, matematicas u otros temas sin relacion con cine o entretenimiento. Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta: { "allowed": boolean }.',
          },
          { role: 'user', content: message },
        ],
        max_tokens: 50,
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseGuardContent(rawContent: string): MessageSafety {
  const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  try {
    return guardResponseSchema.parse(JSON.parse(cleanContent));
  } catch {
    const match = cleanContent.match(GUARD_JSON_FALLBACK_REGEX);
    if (!match) {
      throw new GuardParseError('no se pudo parsear la respuesta del guard');
    }

    try {
      return guardResponseSchema.parse(JSON.parse(match[0]));
    } catch {
      throw new GuardParseError('no se pudo parsear la respuesta del guard tras el fallback de regex');
    }
  }
}

async function attemptGuardCheck(message: string): Promise<MessageSafety> {
  const completion = await requestGuardCompletion(message);
  const rawContent = completion.choices[0]?.message?.content ?? '';
  return parseGuardContent(rawContent);
}

// LLM como guard antes de procesar el chat. Un allowed:false explicito (JSON valido) se respeta siempre.
// Si tras reintentar una vez sigue fallando por parseo o red, fail-open (allowed:true): el system prompt
// del chat ya acota el dominio, y fail-closed intermitente por fallas de qwen3.8-27b bloqueaba mensajes validos.
export async function checkMessageSafety(message: string): Promise<MessageSafety> {
  try {
    return await attemptGuardCheck(message);
  } catch (firstErr) {
    logger.error({ err: firstErr }, 'fallo el primer intento de validacion de seguridad del mensaje de chat, reintentando');

    try {
      return await attemptGuardCheck(message);
    } catch (secondErr) {
      logger.error({ err: secondErr }, 'fallo el segundo intento de validacion de seguridad del mensaje de chat, se permite por fail-open');
      return { allowed: true };
    }
  }
}
