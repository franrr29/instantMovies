Spec: Módulo Likes

Ruta base: /api/v1/likes
Capas: routes → controller → service → repository
Auth: todas las rutas requieren authenticate

Endpoints
POST / — { tmdbMovieId } → 201 { like } | 400 | 409
GET / — → 200 [ EnrichedLike ]
DELETE /:tmdbId — → 204 | 404
Validación (Zod)
tmdbMovieId: z.number().int().positive()
Lógica de negocio (service)

addLike:

Delega al repository que hace prisma.like.create()
Si Prisma lanza P2002 (unique constraint) → repository lanza Error con mensaje ALREADY_LIKED_MESSAGE
Service lo captura y relanza como LikesServiceError('ALREADY_LIKED') → controller devuelve 409

removeLike:

Delega al repository que hace prisma.like.delete() con composite key userId_tmdbMovieId
Si Prisma lanza P2025 (record not found) → repository lanza Error con mensaje LIKE_NOT_FOUND_MESSAGE
Service lo captura y relanza como LikesServiceError('LIKE_NOT_FOUND') → controller devuelve 404

getUserLikes:

Trae todos los likes del usuario de la DB
Enriquece cada uno con TMDB (getMovieById) para devolver título, poster, overview, voteAverage
Try/catch individual por película — si TMDB falla para una, devuelve datos mínimos (title: '', posterPath: null, voteAverage: 0) sin romper el resto
Mismo patrón de resiliencia que enrichRecommendation
Decisiones de diseño
No se guarda data de TMDB en la tabla likes — solo tmdbMovieId. Se enriquece al leer
Los mensajes de error del repository son constantes exportadas (ALREADY_LIKED_MESSAGE, LIKE_NOT_FOUND_MESSAGE) — el service los reconoce sin acoplarse a Prisma
El service no sabe de HTTP — lanza errores tipados, el controller mapea a status codes