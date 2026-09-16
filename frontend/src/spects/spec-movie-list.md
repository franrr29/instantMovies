Spec: Pantalla MovieList

Ruta: /movies
Requiere auth: sí (ProtectedRoute)

Qué hace

Muestra películas trending por defecto. Permite buscar películas por texto con debounce. Cada película tiene un botón para dar o quitar like.

Data source
GET /api/v1/movies/trending — películas trending de la semana (TMDB)
GET /api/v1/movies?query=... — búsqueda de películas (TMDB)
GET /api/v1/likes — likes del usuario (para saber cuáles están likeadas)
POST /api/v1/likes — { tmdbId, title, posterPath, overview, voteAverage } → 201 | 409
DELETE /api/v1/likes/:tmdbId → 204
Estados de la pantalla
1. Cargando

Primera carga, mostrando trending. Mostrar loading (spinner o skeleton).

2. Trending (estado por defecto)

El input de búsqueda está vacío. Mostrar las películas trending con un título tipo "Tendencias de la semana".

3. Búsqueda activa

El usuario escribió en el input. Mostrar resultados de búsqueda con un título tipo "Resultados para '{query}'".

4. Búsqueda sin resultados

La búsqueda devolvió array vacío. Mostrar mensaje tipo "No se encontraron películas para '{query}'".

5. Error

Falló la request. Mostrar mensaje de error con opción de reintentar.

Búsqueda con debounce
Input de texto controlado
Debounce de 400ms — no enviar request en cada keystroke
Mientras el usuario escribe (antes de que se dispare el debounce): no mostrar loading todavía
Cuando se dispara el debounce: hacer GET /api/v1/movies?query=...
Si el input se vacía: volver a mostrar trending automáticamente
Implementar el debounce con un custom hook useDebounce(value, delay)
Botón de Like

Cada MovieCard tiene un botón de like (corazón, estrella, o texto — sin estilos por ahora).

Lógica:

Al cargar la pantalla, traer los likes del usuario con GET /api/v1/likes
Comparar cada película con la lista de likes por tmdbMovieId para saber si ya está likeada
Si NO está likeada: click → POST /api/v1/likes con los datos de la película
Si YA está likeada: click → DELETE /api/v1/likes/:tmdbId
Después de like/unlike: refetch de likes para actualizar el estado
Deshabilitar el botón durante la request para evitar doble click

Datos que se envían en POST /likes:
Verificar qué campos espera el backend en el body del POST. Abrir el schema de Zod de likes para saber qué es required.

MovieCard

Reutilizar el componente MovieCard.tsx que ya existe (creado con Recommendations). Mostrar:

Poster (imagen de TMDB)
Título
Overview (truncado si es largo)
Rating
Botón de like con estado visual (likeada / no likeada)
Herramientas
TanStack Query: useQuery para trending, búsqueda y likes. useMutation para like/unlike
Custom hook useDebounce para la búsqueda
axios via services/api.ts (nunca fetch directo)
Crear services/moviesService.ts para las llamadas de trending y búsqueda
No incluir
Paginación ni scroll infinito
Filtros por género, año o rating
Detalle de película en pantalla aparte