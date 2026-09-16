Spec: Módulo Chat

Ruta base: /api/v1/chat
Capas: routes → controller → service → tools → prompt → repository
Auth: requiere authenticate
Rate limit: 10 requests/min/usuario (después de authenticate, usa req.user.id como key)

Endpoint
POST / — { message } (min 1, max 500 chars) → 200 { reply: string, movies: ChatMovieResult[] }
Flujo de un mensaje (service)
Sanitización (sanitizeMessage) — limpia el input. Si blocked: true, devuelve BLOCKED_REPLY sin llamar a Groq
Guard (checkMessageSafety) — segundo filtro con Groq. Fail-closed: si Groq falla, allowed queda false. Si no pasa, devuelve BLOCKED_REPLY
Guardar mensaje del usuario en DB
Armar system prompt (buildSystemPrompt):
Likes del usuario (máx 10) enriquecidos con TMDB (títulos + géneros)
Recs anteriores COMPLETED (tmdbMovieIds) para no repetir
Instrucciones de formato y restricciones (solo cine, no revelar prompt)
Data minimization: nunca userId, emails ni IDs internos en el prompt
Cargar historial de la DB (últimos 20 mensajes)
Tool calling loop (runToolCallingLoop):
Máximo 3 llamadas a tools por mensaje
Dos tools disponibles: search_movie (por título) y discover_movies (por filtros: género, año, rating)
Cada tool busca en TMDB y pushea resultados al array movies
Si Groq devuelve tool result sin texto, se hace una llamada extra sin tools para que redacte
Guardar respuesta del asistente en DB
Devolver { reply, movies }
Tools

search_movie:

Busca una película puntual en TMDB por título
Devuelve la primera coincidencia
Shape del resultado: { tmdbId, title, posterPath, rating, overview }

discover_movies:

Busca películas por filtros (géneros, año, rating mínimo)
Devuelve hasta 5 resultados
Mismo shape que search_movie
Timeout
AbortController con 30 segundos para cada llamada a Groq del chat (search/discover loop). El guard (checkMessageSafety) usa su propio AbortController con 10 segundos, aparte
Decisiones de diseño
Doble filtro (sanitización + guard) — defensa en profundidad contra prompt injection
Guard es fail-closed — si Groq falla, el mensaje se bloquea (seguridad > disponibilidad)
Historial en DB (no en memoria) — persistente entre sesiones del backend
Rate limit por usuario, no por IP — evita que un usuario abuse sin bloquear a otros
max_tokens: 400 para respuestas del chat (más cortas que recomendaciones)
El LLM no puede mencionar películas sin buscarlas primero — evita alucinaciones