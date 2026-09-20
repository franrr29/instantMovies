Spec: Testing Backend

Ubicación: backend/src/__tests__/ (o backend/tests/)
Framework: Vitest
Tipo: Unitarios con mocks (sin DB real, sin Groq real, sin Redis real)

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

Groq respuesta malformada:

Mockear generateRecommendation para que devuelva JSON inválido (falta un campo, no es array de 3, tmdbMovieId no es número)
Zod debe rechazar → el worker marca la rec como FAILED

Enriquecimiento parcial (TMDB falla):

Mockear getMovieById para que falle en 1 de 3 películas
enrichRecommendation debe devolver las 3: 2 completas, 1 con datos mínimos (title: '', posterPath: null)

Método: mockear likes.repository, recommendations.repository, shared/groq, shared/tmdb con vi.mock().

Likes — likes.test.ts

Like duplicado:

addLike(userId, tmdbMovieId) cuando ya existe → lanza LikesServiceError con code ALREADY_LIKED

Like no encontrado:

removeLike(userId, tmdbMovieId) cuando no existe → lanza LikesServiceError con code LIKE_NOT_FOUND

Enriquecimiento parcial:

Mockear getMovieById para que falle en 1 de N likes
getUserLikes debe devolver todos: los que se enriquecieron completos y el que falló con datos mínimos

Método: mockear likes.repository y shared/tmdb.

Chat — chat.test.ts

Mensaje bloqueado por sanitización:

Input con contenido malicioso → sanitizeMessage devuelve { blocked: true }
handleChatMessage devuelve BLOCKED_REPLY sin llamar a Groq

Mensaje bloqueado por guard:

checkMessageSafety devuelve { allowed: false }
handleChatMessage devuelve BLOCKED_REPLY sin llamar a Groq

Método: mockear shared/guard, shared/sanitize, chat.repository, shared/groq.

Señales de pedido de películas (asksForMovies):

"hola" → false, "dame un momento" → false, "terrorismo en las noticias" → false (la keyword no puede ser substring de otra palabra)
"recomendame una" → true, "otra" → true, "quiero una de acción" → true

Compactación del resultado de tool (compactToolResult):

Lista de películas → solo tmdbId y title
JSON de error o string que no es JSON → se mantiene igual

Películas ya vistas (collectSeenMovieIds): junta los tmdbId de los mensajes TOOL del historial

Tools — chat.tools.test.ts

discover_movies excluye los ids ya vistos; si la página queda vacía pide la siguiente (máx. page 3)
discover_movies con TMDB caído devuelve { error } sin lanzar; search_movie no filtra por ids vistos

Método: mockear shared/tmdb y shared/logger.

Worker — worker.test.ts

Job exitoso:

Mockear generateRecommendation con respuesta válida de 3 películas
Worker debe llamar a completeRecommendation con el array de movies

Job fallido:

Mockear generateRecommendation para que lance error
Worker debe llamar a failRecommendation

Método: mockear shared/groq, recommendations.repository.

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