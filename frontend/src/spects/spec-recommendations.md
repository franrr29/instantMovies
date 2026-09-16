Spec: Pantalla Recommendations

Ruta: /recommendations
Requiere auth: sí (ProtectedRoute)

Qué hace

Muestra el historial de recomendaciones del usuario y permite pedir nuevas. Cada pedido genera 3 películas recomendadas por el LLM, procesadas de forma async (POST 202 → polling).

Data source
GET /api/v1/recommendations — lista de todas las recs del usuario (enriquecidas con TMDB)
POST /api/v1/recommendations — pedir nueva recomendación → 202 { id, status: PENDING }
GET /api/v1/recommendations/:id — detalle de una rec (para polling)
Contrato de la API

Cada recomendación devuelta tiene esta forma:

ts
{
  id: number;
  userId: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  movies: {
    tmdbMovieId: number;
    reason: string;
    title: string;          // puede ser '' si TMDB falló
    overview: string;       // puede ser '' si TMDB falló
    posterPath: string | null;
    voteAverage: number;    // 0 si TMDB falló
  }[] | null;               // null cuando status es PENDING
}
Estados de la pantalla
1. Sin likes

El usuario no tiene likes. No tiene sentido pedir recomendaciones.

Mostrar mensaje tipo "Dale like a algunas películas primero"
Link a /movies
Botón de pedir deshabilitado
Para saber si tiene likes: usar GET /api/v1/likes (o el cache de TanStack Query si ya se cargó)
2. Sin recomendaciones

Tiene likes pero nunca pidió recomendaciones. GET /recommendations devuelve array vacío.

Estado vacío con CTA "Pedir recomendaciones"
3. PENDING

Hay un pedido en proceso. GET /recommendations devuelve una rec con status: PENDING y movies: null.

Mostrar indicador visual (spinner, skeleton, o texto tipo "Analizando tus gustos...")
Botón de pedir deshabilitado
Polling activo
4. COMPLETED

La rec tiene status: COMPLETED y movies con 3 películas.

Mostrar las 3 películas con MovieCard (poster, título, overview) + reason del LLM debajo de cada card
Botón habilitado para pedir otra ronda
5. FAILED

La rec tiene status: FAILED y movies: null.

Mostrar mensaje de error tipo "No pudimos generar recomendaciones, intentá de nuevo"
Botón habilitado para reintentar
Fallo parcial de TMDB al enriquecer

El status sigue COMPLETED (el worker hizo su trabajo). Si TMDB falló para alguna película, esa película llega con title: '', posterPath: null, voteAverage: 0 pero con reason y tmdbMovieId intactos. La UI debe manejar esto:

Películas con datos completos: MovieCard normal
Películas con datos vacíos: card simplificada mostrando el reason del LLM y un placeholder en vez de poster
Polling
Se activa solo cuando hay una rec con status: PENDING en la lista
Usar refetchInterval de TanStack Query sobre GET /api/v1/recommendations
Intervalo: 3 segundos
Se detiene cuando ninguna rec tiene status PENDING (todas son COMPLETED o FAILED)
Botón "Pedir recomendaciones"
Deshabilitado si: hay una rec PENDING, o el usuario no tiene likes
Al click: POST /api/v1/recommendations → esperar 202 → refetch de la lista (activa polling)
Mostrar loading en el botón durante el POST
Historial
Lista de todas las recomendaciones COMPLETED, ordenadas por fecha descendente
Cada grupo de 3 películas es un bloque visual con la fecha del pedido
Las FAILED se muestran en el historial con su mensaje de error
Las PENDING se muestran en el historial con su indicador de carga
Herramientas
TanStack Query para server state (useQuery para GET, useMutation para POST)
Polling con refetchInterval condicional
Reutilizar MovieCard (componente compartido)
axios via services/api.ts (nunca fetch directo)
Validación frontend
Si no tiene likes: no permitir pedir (UX, evitar espera innecesaria)
El backend también valida (devuelve 400 si no hay likes) — la validación frontend es complementaria, no reemplazo