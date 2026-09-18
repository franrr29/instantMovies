
Cada módulo del backend sigue la estructura `controller → service → schema (Zod)`, separando la responsabilidad de routing, lógica de negocio y validación.

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
| `GET` | `/api/v1/movies/search?q=` | Buscar películas por título (TMDB) |

### Likes
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/likes` | Listar películas que le gustaron al usuario |
| `POST` | `/api/v1/likes` | Dar like a una película |
| `DELETE` | `/api/v1/likes/:tmdbMovieId` | Quitar like |

### Recommendations
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/recommendations` | Solicitar recomendación (202 — async) |
| `GET` | `/api/v1/recommendations` | Listar recomendaciones del usuario |
| `GET` | `/api/v1/recommendations/:id` | Detalle de una recomendación (con polling de estado) |

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
- API keys de [TMDB](https://developer.themoviedb.org/docs/getting-started) y [Groq](https://console.groq.com)

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

4. Ejecutar migraciones y seed (primera vez):
```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

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
Una recomendación siempre devuelve exactamente 3 películas con su justificación. No se consultan individualmente ni se filtran. Un campo JSON en la tabla `Recommendation` simplifica el modelo sin sacrificar funcionalidad. Si las películas recomendadas necesitaran relaciones propias, ahí sí se justificaría una tabla.

### Enriquecimiento TMDB en backend con resiliencia parcial
Los datos de TMDB (poster, título, rating) se agregan en el backend antes de enviar al frontend. Si TMDB falla para una película, un try/catch individual permite devolver las demás con datos mínimos en vez de fallar toda la respuesta.

### LLM guard con estrategia de resiliencia
El chat incluye un guard que usa el mismo modelo (`qwen/qwen3.8-27b`) para validar que los mensajes del usuario sean sobre cine/entretenimiento antes de procesarlos. El modelo tiene thinking mode, que a veces incluye razonamiento interno en la respuesta en lugar de JSON puro. La estrategia de resiliencia implementa: strip de tags `<think>`, temperature 0 para respuestas determinísticas, regex fallback para extracción de JSON, retry automático, y fail-open en errores de infraestructura (el system prompt del chat ya limita el dominio como segunda barrera). Un rechazo explícito del guard siempre se respeta.

### TanStack Query selectivo
Se usa para server state (movies, likes, recommendations) donde cache e invalidación aportan valor. No se usa para auth (manejado con Context + cookie) ni chat (estado local por naturaleza conversacional).

### Arquitectura de capas: controller → service → schema
Cada módulo separa routing (controller), lógica de negocio (service) y validación de entrada (schema Zod). Esto permite testear la lógica sin HTTP y cambiar validaciones sin tocar servicios.

### Chat como modal flotante
El chat se implementa como un modal flotante accesible desde un botón circular fijo en la esquina inferior derecha. Esto permite al usuario interactuar con el asistente de IA desde cualquier pantalla sin perder el contexto de navegación.

---
## Diagramas de Arquitectura

Diagramas interactivos generados con Archify (abrir los archivos HTML en el navegador):

- **[Arquitectura general](docs/diagrams/architecture.html)** — Servicios, conexiones y flujo de datos
- **[Flujo de recomendaciones](docs/diagrams/recommendations-flow.html)** — Pipeline asíncrono completo
- **[Flujo del chat](docs/diagrams/chat-flow.html)** — Guard, tool calling y respuesta
## Testing

### Backend
- **Framework:** Vitest con mocks de servicios
- **Archivos:** auth, recommendations, likes, chat, worker
- **Ejecutar:** `cd backend && npm test`

### Frontend
- **Framework:** Vitest + Testing Library + jsdom
- **Archivos:** AuthContext, Recommendations, MovieList, Chat
- **Ejecutar:** `cd frontend && npm test`

> Todos los tests pasan (14/14 frontend, backend todo verde).

---

## Herramientas LLM Utilizadas

Esta prueba técnica fue desarrollada utilizando **Claude Code CLI** como herramienta principal de desarrollo.

### Archivos de configuración del agente
- **`CLAUDE.md`** — Instrucciones del proyecto, convenciones de código, stack, y reglas para el agente
- **`backend/src/spects/`** — Specs por módulo del backend (auth, movies, likes, recommendations, chat, testing)
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
- **Paginación** en endpoints de listado (movies, likes, recommendations)
- **Refresh token** con rotación automática para sesiones más largas
- **Rate limiting distribuido** con Redis (actualmente in-memory por instancia)
- **CI/CD** con GitHub Actions (lint, tests, build, deploy)
- **Monitoring** con métricas de uso de LLM (tokens, latencia, costos)