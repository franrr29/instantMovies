Spec: Pantalla Chat

Ruta: /chat
Requiere auth: sí (ProtectedRoute)

Qué hace

Chat conversacional sobre películas. El usuario escribe un mensaje, el backend lo procesa con Groq (con tool calling a TMDB), y devuelve una respuesta de texto + opcionalmente una lista de películas encontradas.

Data source
POST /api/v1/chat — { message } → { reply: string, movies: ChatMovieResult[] }

No hay GET para historial. El historial se mantiene en estado local del frontend (se pierde al recargar).

Contrato de la API
ts
// Request
{ message: string }

// Response
{
  reply: string;
  movies: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    rating: number;
    overview: string;
  }[];
}

movies puede ser un array vacío si el LLM respondió sin buscar en TMDB.

Estados de la pantalla
1. Sin mensajes

Primera vez que entra. Mostrar estado vacío con un mensaje tipo "Preguntame sobre películas" o similar.

2. Conversación activa

Historial de mensajes visible. Cada mensaje es del usuario o del asistente.

3. Esperando respuesta

El usuario envió un mensaje y está esperando el reply del backend. Mostrar indicador de loading (typing indicator, spinner, o texto tipo "Pensando...") como último mensaje del chat.

4. Error

Falló el POST. Mostrar mensaje de error debajo del último mensaje del usuario. Permitir reintentar.

Historial de mensajes
Se mantiene en un array de estado local (useState)
Cada mensaje tiene: role ('user' | 'assistant'), content (string), movies (array, solo para assistant)
Al enviar, agregar el mensaje del usuario al array inmediatamente (no esperar al backend)
Al recibir respuesta, agregar el mensaje del asistente con el reply y las movies
Scroll automático al último mensaje
Input de mensaje
Input de texto controlado
Botón "Enviar" (o Enter para enviar)
Deshabilitar input y botón mientras espera respuesta
No enviar mensajes vacíos
Cards de películas

Cuando el asistente devuelve movies.length > 0, mostrar las películas debajo del texto de respuesta.

Usar MovieCard para cada película
Mostrar: poster, título, overview, rating
Nota: el campo se llama tmdbId (no tmdbMovieId como en otros endpoints) y rating (no voteAverage)
Herramientas
No usar TanStack Query — el chat no es server state cacheable, es interacción en tiempo real
useMutation tampoco encaja bien acá — usar un handler async con estado local (loading, error)
Crear services/chatService.ts con sendMessage(message: string)
axios via services/api.ts
Reutilizar MovieCard (adaptar si las props difieren: tmdbId vs tmdbMovieId, rating vs voteAverage)
No incluir
Persistencia de historial (no hay GET)
Streaming de respuesta
Indicador de typing animado (texto plano basta)
Dar like desde el chat (eso se hace en MovieList)