Spec: Infra y Observabilidad

Docker Compose (docker-compose.yml en la raíz)
5 servicios:

- mysql — mysql:8, puerto 3308→3306, volumen mysql_data, healthcheck con mysqladmin ping
- redis — redis:7-alpine, puerto 6379, volumen redis_data, healthcheck con redis-cli ping
- api — build con ./Dockerfile (multi-stage, corre como usuario node), puerto 3000. Depende de mysql y redis healthy. Al arrancar corre "npx prisma migrate deploy" y luego "node dist/index.js": las migraciones corren al arranque del contenedor
- worker — misma imagen que api, comando "node dist/worker.js". Depende de mysql y redis healthy. Es el segundo proceso del backend (consume la cola de recomendaciones)
- frontend — build con ./frontend/Dockerfile: node:20-alpine, "npm ci" y Vite dev server en el puerto 5173 (server.host 0.0.0.0). Depende de api. VITE_API_URL=http://localhost:3000/api/v1

api y worker comparten código y .env (env_file). El .env.example de la raíz documenta las variables.
Levantar todo: docker compose up --build. Rebuild solo de la api: docker compose up --build api -d.

Variables de entorno (backend, validadas con Zod en shared/env.ts)
Si falta o es inválida alguna, el proceso loguea cuáles y termina (process.exit(1)).
DATABASE_URL, JWT_SECRET (mín 32 caracteres), TMDB_API_KEY, GROQ_API_KEY, HELICONE_API_KEY (opcional), PORT, FRONTEND_URL, REDIS_URL, NODE_ENV.

Constantes (shared/constants.ts)
Valores de configuración que no dependen del entorno, centralizados en un solo archivo:
- Modelos: GROQ_MODEL (qwen/qwen3.8-27b) y GROQ_FALLBACK_MODEL (llama-3.1-8b-instant)
- Cola y worker: GROQ_RATE_LIMIT_MAX (28) / GROQ_RATE_LIMIT_WINDOW_MS (60 s), GROQ_MAX_RETRIES (3), GROQ_RETRY_BACKOFF_MS (5 s)
- Chat: CHAT_TIMEOUT_MS (30 s), CHAT_MAX_TOOL_CALLS (3), CHAT_MAX_TOKENS (400), CHAT_HISTORY_LIMIT (10)
- Auth: JWT_EXPIRES_IN (24h), AUTH_COOKIE_MAX_AGE_MS (7 días)
Los rate limits HTTP (express-rate-limit) se definen junto a su router, no acá.

Rate limits HTTP (express-rate-limit, in-memory por instancia)
- Global (app.ts): 100 req / 15 min por IP, sobre todo /api/v1 (/health queda afuera porque se registra antes)
- Login (auth.routes.ts): 5 intentos/min por IP (ver spec-auth.md)
- Chat (chat.routes.ts): 10 mensajes/min por usuario (ver spec-chat.md)
Todos tienen handler propio y responden 429 con JSON en español: { error: '...' }, el mismo formato que errorHandler. Los límites se suman: un request al login o al chat descuenta también del global.

Observabilidad: Helicone
Todas las llamadas a Groq pasan por Helicone, un proxy que las registra (requests, tokens, latencia, costo).
- Un único cliente Groq (shared/groq.ts). Si HELICONE_API_KEY está definida, se configura con baseURL: 'https://groq.helicone.ai' y defaultHeaders { 'Helicone-Auth': 'Bearer <HELICONE_API_KEY>' }; si no, llama a Groq directo
- Lo usan todos los consumidores: chat (tool loop), guard del chat y worker de recomendaciones, así que no hay que configurar nada por módulo
- Segmentación por tipo: cada llamada envía el header Helicone-Property-Type ('recommendation' en shared/groq.ts, 'chat' en chat.groq.ts, 'guard' en guard.ts), para filtrar métricas por flujo en Helicone
- HELICONE_API_KEY se valida con Zod en env.ts (z.string().optional()) y se obtiene en helicone.ai → Settings → API Keys
- Es solo observabilidad: no cambia el modelo ni el formato de las llamadas

Logs
pino con logs estructurados en los puntos del flujo asíncrono (encolado, consumo, resultado) y en los fallos de TMDB/Groq del chat.
