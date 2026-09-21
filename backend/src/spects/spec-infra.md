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
DATABASE_URL, JWT_SECRET (mín 32 caracteres), TMDB_API_KEY, GROQ_API_KEY, HELICONE_API_KEY (obligatoria: sin ella ni la api ni el worker arrancan), PORT, FRONTEND_URL, REDIS_URL, NODE_ENV.

Observabilidad: Helicone
Todas las llamadas a Groq pasan por Helicone, un proxy que las registra (requests, tokens, latencia, costo).
- Un único cliente Groq (shared/groq.ts) configurado con baseURL: 'https://groq.helicone.ai' y defaultHeaders { 'Helicone-Auth': 'Bearer <HELICONE_API_KEY>' }
- Lo usan todos los consumidores: chat (tool loop), guard del chat y worker de recomendaciones, así que no hay que configurar nada por módulo
- HELICONE_API_KEY se valida con Zod en env.ts (z.string().min(1)) y se obtiene en helicone.ai → Settings → API Keys
- Es solo observabilidad: no cambia el modelo ni el formato de las llamadas

Logs
pino con logs estructurados en los puntos del flujo asíncrono (encolado, consumo, resultado) y en los fallos de TMDB/Groq del chat.
