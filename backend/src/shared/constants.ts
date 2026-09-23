// modelo
export const GROQ_MODEL = 'qwen/qwen3.8-27b';
export const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

// cola y worker
export const GROQ_RATE_LIMIT_MAX = 28;
export const GROQ_RATE_LIMIT_WINDOW_MS = 60_000;
export const GROQ_MAX_RETRIES = 3;
export const GROQ_RETRY_BACKOFF_MS = 5000;

// chat
export const CHAT_TIMEOUT_MS = 30_000;
export const CHAT_MAX_TOOL_CALLS = 3;
export const CHAT_MAX_TOKENS = 400;
export const CHAT_HISTORY_LIMIT = 10;

// auth
export const JWT_EXPIRES_IN = '24h';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
