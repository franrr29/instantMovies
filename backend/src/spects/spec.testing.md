Spec: Testing Backend

Ubicación: backend/src/__tests__/ (o backend/tests/)
Framework: Vitest
Tipo: Unitarios con mocks (sin DB real, sin Groq real, sin Redis real)
Total: 52 tests backend en 7 archivos. Frontend: 14 tests en 4 archivos (auth-context 4, chat 3, movie-list 3, recommendations 4; ver frontend/src/spects/spec-testing.md)

Archivo — tests
auth.test.ts — 12
likes.test.ts — 3
recommendations.test.ts — 7
chat.test.ts — 16 (service 2 + asksForMovies 9 + compactToolResult 4 + collectSeenMovieIds 1)
chat.tools.test.ts — 6
worker.test.ts — 4
groq.test.ts — 4

Qué testeamos

Lógica de negocio que puede fallar silenciosamente o causar bugs difíciles de detectar. No testeamos wiring de Express ni configuración.

Tests por módulo
Auth — auth.test.ts

Validación de username:

Email válido → pasa
String sin @ → rechaza con "El username debe ser un email válido"
String vacío → rechaza

Validación de password (register):

Demo1234! → pasa
Sin mayúscula → rechaza
Sin minúscula → rechaza
Sin número → rechaza
Sin carácter especial → rechaza
Menos de 8 caracteres → rechaza

Normalización:

DEMO@INSTANT.COM → se transforma a demo@instant.com

Método: testear directamente los schemas de Zod (registerSchema, loginSchema) con .safeParse(). No levantar Express.

Recommendations — recommendations.test.ts

Sin likes:

requestRecommendation(userId) con 0 likes → lanza RecommendationsServiceError con code NO_LIKES

Ya hay una PENDING:

requestRecommendation(userId) con una rec PENDING existente → lanza RecommendationsServiceError con code PENDING_ALREADY_EXISTS

Crea y encola:

Con likes y sin rec PENDING → crea la recomendación y encola el job en BullMQ

Groq respuesta malformada (3 tests):

Se testea groqRecommendationSchema directo con .safeParse(): falta el campo movies, el array no tiene exactamente 3 películas, a una película le falta reason
groqMovieSchema tiene solo title y reason (Groq ya no devuelve tmdbMovieId)
El worker marcando FAILED ante un error se cubre en worker.test.ts

Enriquecimiento parcial (TMDB falla):

Mockear getMovieById para que falle en 1 de 3 películas
enrichRecommendation debe devolver las 3: 2 completas, 1 con datos mínimos (title: '', posterPath: null)

Método: mockear likes.repository, recommendations.repository, queue, shared/groq, shared/tmdb con vi.mock().

Likes — likes.test.ts

Like duplicado:

addLike(userId, tmdbMovieId) cuando ya existe → lanza LikesServiceError con code ALREADY_LIKED

Like no encontrado:

removeLike(userId, tmdbMovieId) cuando no existe → lanza LikesServiceError con code LIKE_NOT_FOUND

Enriquecimiento parcial:

Mockear getMovieById para que falle en 1 de N likes
getUserLikes debe devolver todos: los que se enriquecieron completos y el que falló con datos mínimos

Método: mockear likes.repository y shared/tmdb.

Chat — chat.test.ts (16 tests)

Mensaje bloqueado por sanitización:

Input con contenido malicioso → sanitizeMessage devuelve { blocked: true }
handleChatMessage devuelve BLOCKED_REPLY sin llamar a Groq

Mensaje bloqueado por guard:

checkMessageSafety devuelve { allowed: false }
handleChatMessage devuelve BLOCKED_REPLY sin llamar a Groq

Método: mockear shared/guard, shared/sanitize, chat.repository, shared/groq.
Nota: el guard (shared/guard.ts: retry, fail-open, parseo) no tiene tests propios; acá siempre se mockea. Tampoco el tool loop de chat.groq.ts ni saveToolTrace (persistencia de la traza).

Señales de pedido de películas (asksForMovies, 9 tests) — decide tool_choice: required vs auto:

"hola" → false, "dame un momento" → false, "nuestra casa" → false, "terrorismo en las noticias" → false (la keyword no puede ser substring de otra palabra)
"recomendame una" → true, "otra" → true, "quiero una de acción" → true, "Buscame Inception" → true, "dame mas" → true

Compactación del resultado de tool (compactToolResult, 4 tests):

Lista de películas → solo tmdbId y title
Película suelta (search_movie) → lista de una con tmdbId y title
JSON de error o string que no es JSON → se mantiene igual

Películas ya vistas (collectSeenMovieIds): junta los tmdbId de los mensajes TOOL del historial e ignora el resto

Tools — chat.tools.test.ts (6 tests)

discover_movies excluye los ids ya vistos
Si al filtrar la página queda vacía pide la siguiente; corta en la página 3 y devuelve { error } si todo era repetido
No pide más páginas si TMDB ya no devuelve resultados
discover_movies con TMDB caído devuelve { error } sin lanzar
search_movie no filtra por ids vistos

Método: mockear shared/tmdb y shared/logger.

Worker — worker.test.ts

Job exitoso:

Mockear generateRecommendation con respuesta válida de 3 películas
Worker debe llamar a completeRecommendation con el array de movies

Job fallido:

Mockear generateRecommendation para que lance error, con los reintentos ya agotados
Worker debe llamar a failRecommendation

Job fallido con reintentos disponibles:

Worker relanza el error (para que BullMQ reintente) y NO marca failed todavía

También verifica que el processor se registra al crear el Worker.

Método: mockear bullmq, queue, shared/db, shared/groq, shared/tmdb, likes.repository y recommendations.repository.

Groq — groq.test.ts (4 tests)

generateRecommendation (shared/groq.ts), con groq.chat.completions y shared/tmdb mockeados:
El prompt lista los títulos de los likes y no pide ni menciona tmdbMovieId
Toma el primer resultado de TMDB como match y devuelve el tmdbMovieId real
Descarta el título sin resultados en TMDB y el que hace fallar la búsqueda (Promise.allSettled); conserva el resto
Lanza si TMDB no resuelve ninguna película (el worker reintenta o marca FAILED)

Configuración
Vitest con soporte TypeScript
vitest.config.ts en la raíz del backend
Script "test" en package.json → vitest run
Script "test:watch" → vitest
No incluir
Tests de integración contra DB/Redis/Groq real
Tests de endpoints HTTP (supertest)
Tests de middleware (auth, rate-limit)
Coverage mínimo obligatorio