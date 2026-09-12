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

// reviso la seguridad del mensaje de chat antes de procesarlo (LLM como guard); fail-closed en cualquier error
export async function checkMessageSafety(message: string): Promise<MessageSafety> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GUARD_TIMEOUT_MS);

    let completion;
    try {
      completion = await groq.chat.completions.create(
        {
          model: 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content:
                'Evaluá si el siguiente mensaje de un usuario trata sobre peliculas, series, cine o entretenimiento audiovisual. Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta: { "allowed": boolean }.',
            },
            { role: 'user', content: message },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 50,
        },
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const rawContent = completion.choices[0]?.message?.content ?? '';

    return guardResponseSchema.parse(JSON.parse(rawContent));
  } catch (err) {
    logger.error({ err }, 'fallo la validacion de seguridad del mensaje de chat, se bloquea por fail-closed');
    return { allowed: false };
  }
}
