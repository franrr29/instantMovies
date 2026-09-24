# InstantMovies

Sistema de recomendación de películas: el usuario explora el catálogo de TMDB, marca las que le gustan y recibe recomendaciones generadas por un LLM (Groq), con un chat conversacional que busca películas en TMDB.

Cada módulo del backend sigue la estructura `routes → controller → service → repository` (+ schema Zod), separando la responsabilidad de routing, traducción HTTP, lógica de negocio, acceso a datos y validación. El módulo `movies` no tiene repository: consulta TMDB directamente.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router, axios
- **Backend:** Node.js 20, Express 4, TypeScript, Zod, JWT (cookie httpOnly) + bcrypt, helmet, cors, express-rate-limit, pino
- **Base de datos:** MySQL 8 con Prisma 6
- **Cola y worker:** Redis 7 + BullMQ (el worker corre como proceso aparte)
- **LLM y catálogo:** Groq (`qwen/qwen3.8-27b`, con `llama-3.1-8b-instant` como fallback) a través del proxy Helicone, y TMDB
- **Infra:** Docker Compose (mysql, redis, api, worker, frontend)
- **Tests:** Vitest (con Testing Library y jsdom en el frontend)

---

## Endpoints

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Crear cuenta (username formato email + password seguro) |
| `POST` | `/api/v1/auth/login` | Iniciar sesión (setea cookie httpOnly) |
| `POST` | `/api/v1/auth/logout` | Cerrar sesión (limpia cookie) |
| `GET` | `/api/v1/auth/me` | Usuario autenticado actual |

### Movies
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/movies/trending` | Películas trending de la semana (TMDB) |
| `GET` | `/api/v1/movies?query=&page=` | Buscar películas por título (TMDB); `page` por defecto 1 |
| `GET` | `/api/v1/movies?page=` | Películas populares (TMDB), cuando no se envía `query` |

### Likes
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/likes` | Listar películas que le gustaron al usuario |
| `POST` | `/api/v1/likes` | Dar like a una película |
| `DELETE` | `/api/v1/likes/:tmdbId` | Quitar like |

### Recommendations
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/recommendations` | Solicitar recomendación (202 — async) |
| `GET` | `/api/v1/recommendations` | Listar recomendaciones del usuario |
| `GET` | `/api/v1/recommendations/:id` | Detalle de una recomendación. El polling de estado lo hace el frontend sobre el listado (`GET /api/v1/recommendations`), no sobre este endpoint |

### Chat
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/chat` | Enviar mensaje al chat conversacional con IA |

### Health
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Health check del servicio |

> Todos los endpoints excepto `/auth/register`, `/auth/login` y `/health` requieren autenticación.

---

## Cómo Ejecutar

### Requisitos previos
- Docker y Docker Compose instalados
- API keys de [TMDB](https://developer.themoviedb.org/docs/getting-started), [Groq](https://console.groq.com) y [Helicone](https://www.helicone.ai)

### Pasos

1. Clonar el repositorio:
```bash
git clone https://github.com/franrr29/instantMovies.git
cd instantMovies
```

2. Copiar y configurar las variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus API keys y passwords
```

3. Levantar todos los servicios:
```bash
docker compose up --build
```

4. Cargar los datos de prueba con el seed (primera vez):
```bash
docker compose exec api node dist/seed.js
```

   Las migraciones no requieren un paso manual: el servicio `api` corre `prisma migrate deploy` al arrancar. Esperar a que `api` termine de levantar antes de correr el seed.

5. Acceder:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`
   - Usuario de prueba: `demo@instant.com` / `Demo1234!`

---

## Decisiones Técnicas Clave

### Cookie httpOnly en vez de localStorage para JWT
El token se guarda en una cookie httpOnly, invisible para JavaScript del cliente. Esto elimina la superficie de ataque XSS para robo de tokens. El tradeoff es mayor complejidad en CORS (`credentials: true`, origin explícito), pero la seguridad justifica el costo.

### Procesamiento asíncrono con BullMQ para recomendaciones
Groq tiene rate limits estrictos. En lugar de hacer al usuario esperar la respuesta del LLM en el request HTTP, se encola el job y se responde 202. El worker procesa al ritmo que permite el rate limit. El frontend hace polling hasta que el estado cambia. Esto desacopla la experiencia del usuario de las limitaciones de la API externa.

### Campo `movies Json?` en vez de tabla hija para recomendaciones
Una recomendación devuelve hasta 3 películas con su justificación (Groq propone 3 y se descartan las que TMDB no resuelve). No se consultan individualmente ni se filtran. Un campo JSON en la tabla `Recommendation` simplifica el modelo sin sacrificar funcionalidad. Si las películas recomendadas necesitaran relaciones propias, ahí sí se justificaría una tabla.

### Enriquecimiento TMDB en backend con resiliencia parcial
Los datos de TMDB (poster, título, rating) se agregan en el backend antes de enviar al frontend. Si TMDB falla para una película, un try/catch individual permite devolver las demás con datos mínimos en vez de fallar toda la respuesta.

### LLM guard con estrategia de resiliencia
El chat incluye un guard que usa el mismo modelo (`qwen/qwen3.8-27b`) para validar que los mensajes del usuario sean sobre cine/entretenimiento antes de procesarlos. El modelo tiene thinking mode, que a veces incluye razonamiento interno en la respuesta en lugar de JSON puro. La estrategia de resiliencia implementa: strip de tags `<think>`, temperature 0 para respuestas determinísticas, regex fallback para extracción de JSON, un reintento con el modelo fallback, y fail-open en errores de infraestructura (el system prompt del chat ya limita el dominio como segunda barrera). Un rechazo explícito del guard siempre se respeta.

### Fallback de modelo (qwen → llama)
Si `qwen/qwen3.8-27b` falla, se reintenta con `llama-3.1-8b-instant`, que en Groq tiene su propia cuota de rate limit. Aplica en los tres consumidores de Groq, cada uno según su flujo:
- **Chat:** fallback inmediato dentro del mismo request, solo ante fallas del modelo (429, 5xx, timeout o `tool_use_failed`). Un error interno o de red se propaga sin cambiar de modelo.
- **Guard:** el segundo intento (el reintento que ya existía) usa el modelo fallback. Si también falla, sigue aplicando fail-open.
- **Recomendaciones (worker):** BullMQ reintenta con qwen y backoff exponencial; en el último intento se prueba una vez con llama antes de marcar la recomendación como `FAILED`.

### Rate limiting en capas
| Alcance | Límite | Clave |
|---|---|---|
| Global (todo `/api/v1`) | 100 req / 15 min | IP |
| `POST /auth/login` | 5 intentos / min (contra fuerza bruta) | IP |
| `POST /chat` | 10 mensajes / min | usuario |

Todos responden `429` con JSON en español (`{ "error": "..." }`), el mismo formato que el resto de los errores de la API. El worker, además, respeta el rate limit de Groq con el limiter nativo de BullMQ (28 jobs/min).

### Límite de 500 caracteres en el chat
El mensaje del chat se valida con Zod (`max(500)`) antes de llegar al service. Acota los tokens que un usuario puede mandar a Groq en cada turno.

### Observabilidad segmentada en Helicone
Cada llamada a Groq envía el header `Helicone-Property-Type` (`recommendation`, `chat` o `guard`), lo que permite filtrar en Helicone el consumo, la latencia y los errores de cada flujo por separado.

### Sin repetir recomendaciones entre tandas
Al generar una nueva recomendación, el worker resuelve en TMDB los títulos de las recomendaciones `COMPLETED` anteriores y los agrega al prompt como exclusión, junto con las películas likeadas.

### Constantes centralizadas
Modelos (principal y fallback), rate limit y reintentos del worker, timeouts y límites del chat, y expiración del JWT viven en `backend/src/shared/constants.ts`, en vez de estar repartidos como valores sueltos por los módulos.

### TanStack Query selectivo
Se usa para server state (movies, likes, recommendations) donde cache e invalidación aportan valor. No se usa para auth (manejado con Context + cookie) ni chat (estado local por naturaleza conversacional).

### Arquitectura de capas: routes → controller → service → repository (+ schema Zod)
Cada módulo separa las rutas (routes), la traducción HTTP (controller), la lógica de negocio (service), el acceso a datos (repository) y la validación de entrada (schema Zod). Esto permite testear la lógica sin HTTP y cambiar validaciones sin tocar servicios.

### Chat como modal flotante
El chat se implementa como un modal flotante accesible desde un botón circular fijo en la esquina inferior derecha. Esto permite al usuario interactuar con el asistente de IA desde cualquier pantalla sin perder el contexto de navegación.

---

## Diagramas de Arquitectura

Diagramas interactivos generados con Archify, publicados en GitHub Pages:

- **[Arquitectura general](https://franrr29.github.io/instantMovies/docs/diagrams/architecture.html)** — Los 5 servicios de Docker Compose, Groq vía Helicone y el módulo chat
- **[Flujo de recomendaciones](https://franrr29.github.io/instantMovies/docs/diagrams/recommendations-flow.html)** — Pipeline asíncrono: Groq devuelve títulos y el worker los resuelve en TMDB
- **[Flujo del chat](https://franrr29.github.io/instantMovies/docs/diagrams/chat-flow.html)** — Guard, tool calling con `search_movie` y `discover_movies`, y traza persistida

## Testing

### Backend
- **Framework:** Vitest con mocks de servicios
- **Archivos (7, 54 tests):**
  - `auth.test.ts` — schemas de auth: email, password y normalización a minúsculas (12)
  - `likes.test.ts` — service de likes: duplicado, no encontrado y enriquecimiento parcial de TMDB (3)
  - `recommendations.test.ts` — service de recomendaciones y validación de la respuesta de Groq (7)
  - `worker.test.ts` — job del worker: éxito, reintentos disponibles y reintentos agotados (4)
  - `groq.test.ts` — resolución de los títulos de Groq a IDs de TMDB (4)
  - `chat.test.ts` — chat.service (bloqueo por sanitización y por guard), fallback de modelo en chat.groq y chat.utils (18)
  - `chat.tools.test.ts` — tools del chat: exclusión de películas ya vistas y paginación de `discover_movies` (6)
- **Ejecutar:** `cd backend && npm test`

### Frontend
- **Framework:** Vitest + Testing Library + jsdom
- **Archivos (4, 14 tests):** AuthContext (4), Recommendations (4), MovieList (3), Chat (3)
- **Ejecutar:** `cd frontend && npm test`

> Todos los tests pasan (54/54 backend, 14/14 frontend).

---

## Herramientas LLM Utilizadas

Esta prueba técnica fue desarrollada utilizando **Claude Code CLI** como herramienta principal de desarrollo.

### Archivos de configuración del agente
- **`CLAUDE.md`** — Instrucciones del proyecto, convenciones de código, stack, y reglas para el agente
- **`backend/src/spects/`** — Specs por módulo del backend (auth, movies, likes, recommendations, chat, infra, testing)
- **`frontend/src/spects/`** — Specs por pantalla del frontend (login-register, movie-list, likes, recommendations, chat, shared-components, testing)

### Skills utilizadas
- **Impeccable** — Calidad y consistencia de código
- **Frontend Design** — Guía de diseño visual para componentes
- **Claude Design** — Diseño de la interfaz del frontend

### Metodología
Se siguió un enfoque **Spec Driven Development**: cada módulo/pantalla tiene su spec escrita antes de la implementación (frontend) o verificada contra el código real (backend). Las specs sirven como documentación viva y como instrucciones para el agente.

---

## Mejoras Futuras

- **WebSockets** para recomendaciones en tiempo real (reemplazar polling)
- **Paginación** en los listados de likes y recommendations (`GET /movies` ya acepta `page`; el frontend pagina en cliente)
- **Refresh token** con rotación automática para sesiones más largas
- **Rate limiting distribuido** con Redis (actualmente in-memory por instancia)
- **CI/CD** con GitHub Actions (lint, tests, build, deploy)
- **Monitoring** propio de la app y de la cola (Helicone ya registra las llamadas a Groq, con métricas básicas de uso)