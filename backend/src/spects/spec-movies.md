Spec: Módulo Movies

Ruta base: /api/v1/movies
Capas: routes → controller → service (sin repository, no hay tabla propia)
Auth: requiere authenticate

Endpoints
GET /trending — → 200 [ TmdbMovie ] (trending de la semana)
GET /?query=... — → 200 [ TmdbMovie ] (búsqueda, si no hay query devuelve populares)
Lógica
Proxy directo a TMDB — no hay lógica de negocio propia
Si query presente → searchMovies(query, page)
Si no → getPopularMovies(page)
Trending → getTrendingMovies(page) (endpoint separado en TMDB: /trending/movie/week)
Decisiones de diseño
Sin repository — no se persiste nada, todo viene de TMDB
El frontend no habla con TMDB directamente — centraliza API keys y manejo de errores en el backend