Spec: Pantalla Likes

Ruta: /likes
Requiere auth: sí (ProtectedRoute)

Qué hace

Muestra la lista de películas que el usuario marcó como "me gusta". Permite quitar el like de cada una.

Data source
GET /api/v1/likes — lista de likes del usuario (enriquecidos con TMDB)
DELETE /api/v1/likes/:tmdbId → 204
Contrato de la API

Cada like devuelto tiene esta forma:

ts
{
  tmdbMovieId: number;
  title: string;          // puede ser '' si TMDB falló
  overview: string;       // puede ser '' si TMDB falló
  posterPath: string | null;
  voteAverage: number;    // 0 si TMDB falló
  createdAt: string;
}
Estados de la pantalla
1. Cargando

Primera carga. Mostrar loading.

2. Sin likes

GET /likes devuelve array vacío.

Mostrar mensaje tipo "Todavía no tenés películas favoritas"
Link a /movies para explorar
3. Con likes

Mostrar la lista de películas likeadas con MovieCard.

Cada card tiene un botón "Quitar like"
Películas con datos completos: MovieCard normal
Películas con datos vacíos (TMDB falló): card simplificada mostrando tmdbMovieId y un placeholder en vez de poster
Botón Quitar Like
Click → DELETE /api/v1/likes/:tmdbId
Deshabilitar el botón durante la request
Después del delete: refetch de likes para actualizar la lista
La película desaparece de la lista al refetchear
Herramientas
TanStack Query: useQuery para GET likes, useMutation para DELETE
Reutilizar MovieCard
Reutilizar services/likesService.ts (ya tiene getLikes y removeLike)
axios via services/api.ts
No incluir
Ordenar o filtrar likes
Paginación
Dar like desde esta pantalla (eso se hace en MovieList)