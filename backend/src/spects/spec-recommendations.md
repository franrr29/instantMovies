Spec: Módulo Recommendations

Ruta base: /api/v1/recommendations
Capas: routes → controller → service → repository
Auth: todas las rutas requieren authenticate
Procesamiento: async vía BullMQ (worker separado)

Endpoints
POST / — → 202 { id, userId, status: PENDING, movies: null, createdAt } | 400 | 409
GET / — → 200 [ EnrichedRecommendation ]
GET /:id — → 200 { EnrichedRecommendation } | 404
Modelo de datos
prisma
model Recommendation {
  id        Int                  @id @default(autoincrement())
  userId    Int
  status    RecommendationStatus @default(PENDING)
  movies    Json?
  createdAt DateTime             @default(now())
}

movies es un array JSON de { tmdbMovieId: number, reason: string }. Nullable porque cuando está PENDING el worker todavía no procesó.

Lógica de negocio (service)

requestRecommendation:

Verifica que el usuario tenga likes → si no, lanza RecommendationsServiceError('NO_LIKES') → 400
Verifica que no haya una rec PENDING → si hay, lanza RecommendationsServiceError('PENDING_ALREADY_EXISTS') → 409 (idempotencia)
Crea registro PENDING en DB
Encola job en BullMQ con { recommendationId, userId }, 3 intentos, backoff exponencial (5s base)

getUserRecommendations:

Trae todas las recs del usuario ordenadas por fecha desc
Enriquece cada una con TMDB

getUserRecommendationById:

Busca rec por id + userId (IDOR protection)
Si no existe → RecommendationsServiceError('NOT_FOUND') → 404
Enriquece con TMDB

enrichRecommendation:

Para cada película en el array movies, llama a getMovieById(tmdbMovieId)
Try/catch individual — si TMDB falla para una, devuelve datos mínimos
Status no cambia — sigue COMPLETED, el fallo es de TMDB al leer, no del job
Worker (proceso separado)
Rate limit nativo de BullMQ: limiter { max: 28, duration: 60000 } (conservador para el free tier de Groq)
Lee likes del usuario de la DB. Sin likes → failRecommendation directo (no se llama a Groq)
Enriquece cada like con TMDB para armar { id, title, genres }
Trae las recs COMPLETED del usuario (getCompletedByUser, solo el campo movies), junta los tmdbMovieId sin repetir y resuelve sus títulos con getMovieById en paralelo (Promise.allSettled): el título que TMDB no resuelve se ignora
Llama a generateRecommendation(likedMovies, previouslyRecommended) (shared/groq.ts), que hace todo el pipeline de abajo y devuelve [{ title, tmdbMovieId, reason }]
El worker mapea a { tmdbMovieId, reason } (lo que se persiste en movies) y llama a completeRecommendation(id, movies)
Si fallo y quedan reintentos → relanza error para que BullMQ reintente
Si fallo en el último intento y el contexto ya está armado (likedMovies) → prueba UNA vez generateRecommendation con GROQ_FALLBACK_MODEL (llama-3.1-8b-instant). Si responde, completeRecommendation y termina
Si el fallback también falla, o el error fue antes de armar el contexto (likes o TMDB) → failRecommendation(id). No se persiste basura

generateRecommendation (shared/groq.ts)
1. Groq NO devuelve tmdbMovieId: solo título y razón. Los LLMs no conocen los IDs de TMDB y los inventan
2. Zod valida la salida con groqRecommendationSchema: { movies: z.array(groqMovieSchema).length(3) } + .transform() al array (Groq exige raíz objeto en json_object). groqMovieSchema tiene solo { title, reason } (sin tmdbMovieId)
3. Después de parsear, busca cada título en TMDB con searchMovies, en paralelo con Promise.allSettled: que falle la búsqueda de uno no tira a las otras
4. El primer resultado de TMDB es el tmdbMovieId real. Un título sin resultados, o cuya búsqueda falló, se descarta con un warn (la rec puede quedar con menos de 3 películas)
5. Si no se resolvió ninguna, lanza Error: el worker reintenta o marca FAILED (nunca se guarda una lista vacía)
El prompt excluye las películas likeadas y, si previouslyRecommended tiene elementos, también las recomendadas en tandas anteriores ("Tampoco recomiendes estas peliculas que ya le recomendaste antes:" + la lista), para no repetir entre tandas.
El prompt le pide JSON { movies: [{ title, reason }] } y no menciona tmdbMovieId. Modelo qwen/qwen3.8-27b por defecto (GROQ_MODEL; generateRecommendation acepta un model opcional para el fallback), response_format json_object, header Helicone-Property-Type: recommendation, vía el proxy de Helicone (ver spec-infra.md).

Decisiones de diseño
movies Json? en vez de tabla hija — las películas siempre se crean, leen y muestran como grupo
Async (worker) en vez de sync — Groq puede tardar segundos, no bloquear la API
3 intentos con backoff exponencial — resiliencia ante fallos transitorios de Groq o TMDB
Fallback de modelo solo en el último intento — los reintentos con backoff cubren fallos transitorios de qwen; llama es la última oportunidad antes de FAILED
Resolver el ID en TMDB en vez de pedírselo a Groq — un ID inventado apunta a otra película o a ninguna; el título sí lo conoce bien el modelo y TMDB es la fuente de verdad
Sin function calling en el worker — el contexto se prepara antes de llamar (regla de CLAUDE.md). La búsqueda en TMDB la hace el código, no el modelo
No se guarda poster/title en DB — se enriquece al leer desde TMDB
max_tokens: 600 — 3 películas no entran en 200
