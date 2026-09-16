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
Lee likes del usuario de la DB
Enriquece cada like con TMDB para armar { id, title, genres }
Llama a generateRecommendation(likedMovies) → Groq devuelve { movies: [3 películas] }
Zod valida con wrapper { movies: z.array().length(3) } + .transform() (Groq exige raíz objeto en json_object)
Si éxito → completeRecommendation(id, movies)
Si fallo y quedan reintentos → relanza error para que BullMQ reintente
Si fallo y se agotaron reintentos → failRecommendation(id)
Decisiones de diseño
movies Json? en vez de tabla hija — las 3 películas siempre se crean, leen y muestran como grupo
Async (worker) en vez de sync — Groq puede tardar segundos, no bloquear la API
3 intentos con backoff exponencial — resiliencia ante fallos transitorios de Groq
No se guarda poster/title en DB — se enriquece al leer desde TMDB
max_tokens: 600 — 3 películas no entran en 200