# CLAUDE.md — InstantMovies

Instrucciones para asistentes de IA que trabajen en este repo.
Respetar estas reglas en cada tarea. Ante duda, preguntar antes de improvisar.

## Contexto

InstantMovies es un sistema de recomendación de películas.
El usuario se registra, explora el catálogo (TMDB), marca "me gusta" y pide
recomendaciones generadas por un LLM (Groq).

El corazón del sistema es el flujo asíncrono de recomendación: como Groq tiene
rate-limit, las solicitudes no se procesan en el momento; se encolan y un worker
las consume a ritmo controlado. Ese desacople es la decisión central del diseño.

## Stack (cerrado, no agregar alternativas)

- Frontend: React + TypeScript + Tailwind CSS + TanStack Query
- Backend: Node.js + Express + TypeScript
- Validación: Zod (entrada de usuario, respuestas de TMDB y Groq)
- Auth: bcrypt + JWT + middleware propio
- Seguridad HTTP: helmet + cors + cookie httpOnly + express-rate-limit
- Base de datos: MySQL vía Prisma (ORM)
- Cola / async: Redis + BullMQ + worker dedicado
- Logs: pino
- LLM: Groq. Catálogo: TMDB
- Infra: Docker + Docker Compose

## Arquitectura

Monolito modular organizado por feature. Un solo repo (monorepo): backend/ y frontend/.

Backend = 2 procesos que comparten el mismo código:
- app.ts    → la API (atiende HTTP)
- worker.ts → el worker (consume la cola, llama a Groq)

### Regla de oro de las capas

Routes → Controller → Service → Repository → Models

Cada capa solo conoce a la inmediatamente inferior. Nunca se saltan capas.

- Routes: definen URLs y las conectan con su controller. Sin lógica.
- Controllers: traducen HTTP (req → service → res). NUNCA tocan la DB.
- Services: reglas de negocio. No conocen HTTP ni SQL.
- Repositories: única capa que habla con la DB.
- Models: esquema Prisma.

Consecuencia: cambiar el motor de DB afecta solo a los repositories.

## Estructura de carpetas

instantMovies/
├── CLAUDE.md
├── docker-compose.yml
├── backend/
│ ├── Dockerfile
│ ├── prisma/ // schema y migraciones
│ └── src/
│ ├── modules/
│ │ ├── auth/ // controller, service, repo, rutas
│ │ ├── movies/
│ │ ├── likes/
│ │ └── recommendations/
│ ├── shared/ // middlewares, config, errores
│ ├── queue/ // setup de bullmq
│ ├── app.ts // entrada de la API
│ └── worker.ts // entrada del worker
└── frontend/
└── src/
├── api/client.ts // url base, token, errores centralizados
├── services/ // authService, moviesService, ...
├── components/
├── pages/
├── context/AuthContext.tsx
├── hooks/useAuth.ts
└── App.tsx


Todo lo de un dominio (controller, service, repo, rutas) vive junto en su carpeta.
El módulo es la carpeta.

## Modelo de datos (3 tablas)

- users: id, username, password_hash, created_at
- likes: id, user_id (FK), tmdb_movie_id, created_at — UNIQUE (user_id, tmdb_movie_id)
- recommendations: id, user_id (FK), tmdb_movie_id, reason, status, created_at
  - status: pending | completed | failed

No se guarda catálogo de películas. TMDB es la fuente de verdad; solo se
referencia tmdb_movie_id.

## Endpoints

- POST   /auth/register
- POST   /auth/login
- GET    /movies              (búsqueda por texto + paginación)
- POST   /likes
- GET    /likes
- DELETE /likes/:tmdbId
- POST   /recommendations     (responde 202 Accepted, NO el resultado)
- GET    /recommendations     (lista con su status)

Todo salvo /auth requiere JWT válido.

## Reglas del flujo asíncrono (crítico)

1. POST /recommendations valida cero-likes en el SERVICE antes de encolar.
   Si el usuario no tiene likes, responder error guía. NO encolar. NO llamar a Groq.
2. Si pasa la validación: crear fila con status=pending, encolar job en BullMQ,
   responder 202 Accepted de inmediato. La API no espera a Groq.
3. El worker consume respetando el rate-limit nativo de BullMQ (NO token bucket manual).
4. El worker arma el contexto (likes + géneros de TMDB), llama a Groq,
   valida la salida con Zod.
5. Salida válida → guardar película + reason, status=completed.
   Salida inválida o fallo tras reintentos → status=failed. No persistir basura.
6. El prompt debe excluir películas ya likeadas.
7. Idempotencia: no encolar si el usuario ya tiene una recomendación pending.

## Convenciones de código

- Rutas REST en plural y minúsculas; el verbo HTTP expresa la acción.
- Un módulo por dominio, con sus capas internas.
- El controller nunca accede a la DB ni contiene reglas de negocio.
- Toda entrada externa se valida con Zod en el borde, antes de usarse.
- Contraseñas con bcrypt. Nunca loguear ni registrar contraseñas en texto plano.
- Logs estructurados con pino en los puntos del flujo asíncrono (encolado, consumo, resultado).
- Manejo de errores centralizado: los errores de negocio se traducen a HTTP en una sola capa.
- JWT con expiración definida.

## Qué NO hacer (decisiones ya descartadas)

- NO usar OAuth ni Passport. La auth es username/password propia.
- NO usar axios. Usar fetch nativo.
- NO usar RabbitMQ. La cola es BullMQ.
- NO implementar microservicios. Es monolito modular.
- NO implementar token bucket manual. Usar el rate-limiter nativo de BullMQ.
- NO usar function calling / tools en el LLM. El contexto se prepara antes de llamar.
- NO duplicar el catálogo de TMDB en la DB.

## Comandos

- Levantar todo:        docker compose up --build
- Migraciones Prisma:   corren al arranque del contenedor
- Tests:                (a definir por bloque)

## Principios

KISS · DRY · Separación de responsabilidades · SRP
En cada decisión: la herramienta suficiente, no la más grande.