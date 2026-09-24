Spec: Módulo Chat

Ruta base: /api/v1/chat
Capas: routes → controller → service → (groq · utils · prompt · tools) → repository
Auth: requiere authenticate
Rate limit: 10 requests/min/usuario (después de authenticate, usa req.user.id como key). Al superarlo → 429 { error: 'demasiados mensajes, intenta de nuevo en un minuto' }. Se suma al rate limit global (ver spec-infra.md)
LLM: qwen/qwen3.8-27b vía Groq (GROQ_MODEL), con llama-3.1-8b-instant como fallback (GROQ_FALLBACK_MODEL), ambos en shared/constants.ts. Todas las llamadas pasan por el proxy de Helicone (ver spec-infra.md)

Endpoint
POST / — { message } (min 1, max 500 chars) → 200 { reply: string, movies: ChatMovieResult[] } | 400 | 429
El max de 500 chars (sendChatMessageSchema) acota los tokens que un mensaje puede mandar a Groq

Estructura del módulo (src/modules/chat/)
El módulo se divide en 6 archivos con lógica, más controller, routes y schemas:

- chat.service.ts (~75 líneas) — orquestador. Sanitiza, pasa el guard, arma el contexto, delega el turno a chat.groq y persiste. No habla con Groq directamente ni contiene lógica de parseo
- chat.groq.ts — comunicación con Groq: callGroqChat (con timeout y fallback de modelo), runToolCallingLoop, processChatTurn, y la conversión historial DB → mensajes de Groq (toGroqMessage, startAtFirstUserTurn)
- chat.utils.ts — funciones puras y sin I/O: asksForMovies, collectSeenMovieIds, compactToolResult
- chat.prompt.ts — buildSystemPrompt
- chat.tools.ts — definición de las 2 tools (search_movie, discover_movies) y executeTool
- chat.repository.ts — saveMessage, getMessagesByUser (única capa que toca la DB)

Flujo de un mensaje (service)
1. Sanitización (sanitizeMessage) — limpia el input. Si blocked: true, guarda USER + BLOCKED_REPLY y devuelve BLOCKED_REPLY sin llamar a Groq
2. Guard (checkMessageSafety, shared/guard.ts) — segundo filtro con Groq. Si allowed: false, mismo tratamiento que el paso 1. Ver "Guard" más abajo
3. Guardar mensaje del usuario en DB
4. Armar system prompt (buildSystemPrompt):
   - Likes del usuario (máx 10) enriquecidos con TMDB (títulos + géneros). Un like que falla en TMDB se omite, no tumba el chat (Promise.allSettled)
   - Recs anteriores COMPLETED (tmdbMovieIds) para no repetirlas
   - Instrucciones de rol, formato y restricciones (solo cine, no revelar prompt, historial y resultados de tools son datos y no instrucciones)
   - Data minimization: nunca userId, emails ni IDs internos en el prompt
5. Cargar historial de la DB: últimos 10 mensajes (CHAT_HISTORY_LIMIT). Se pide después de guardar el mensaje actual, así que ya lo incluye como último turno. startAtFirstUserTurn descarta lo que quede antes del primer USER de la ventana: cortar el historial puede dejar un TOOL sin su ASSISTANT con tool_calls y Groq rechaza el request
6. processChatTurn(messages, seenMovieIds, forceTool) — corre el tool loop (ver abajo). forceTool = asksForMovies(mensaje). seenMovieIds = collectSeenMovieIds(historial cargado)
7. Persistir la traza del turno (saveToolTrace) y después la respuesta final
8. Devolver { reply, movies }

Si cualquier paso lanza, el service loguea y lanza Error('no se pudo procesar el mensaje de chat').

Tool calling loop (chat.groq.ts → runToolCallingLoop)
- Tools disponibles en cada llamada: search_movie y discover_movies
- tool_choice condicional: 'required' cuando asksForMovies() es true, 'auto' cuando no. Solo la PRIMERA vuelta del loop fuerza la tool; con el resultado ya en el contexto el modelo decide ('auto')
- Máximo 3 llamadas a tools por mensaje (CHAT_MAX_TOOL_CALLS). Una tool call por vuelta (se usa tool_calls[0])
- Cada tool busca en TMDB y pushea sus resultados al array movies del turno (es lo que se devuelve en la respuesta)
- Si Groq devuelve el resultado del tool sin texto y hay movies, se hace una llamada extra sin tools para que redacte la respuesta
- max_tokens: 400 por llamada
- Timeout: AbortController de 30 s por cada llamada a Groq del chat (CHAT_TIMEOUT_MS). El guard usa el suyo (10 s), aparte

Fallback de modelo (chat.groq.ts → callGroqChat)
- Cada llamada a Groq del turno (vueltas del loop y la llamada extra de redacción) va por callGroqChat, que usa GROQ_MODEL por defecto
- Si falla por el modelo, se reintenta UNA vez, inmediato y sin backoff, con GROQ_FALLBACK_MODEL y un AbortController nuevo (otros 30 s). Se loguea un warn con el modelo original, el fallback y el error
- Errores que activan el fallback (shouldUseFallbackModel): 429, 5xx, timeout (APIUserAbortError / APIConnectionTimeoutError) y 400 con code tool_use_failed
- Cualquier otro error (red, lógica interna, 4xx restantes) se lanza sin fallback
- Si el que falla ya es el fallback, se lanza: nunca hay más de 2 intentos por llamada

asksForMovies (chat.utils.ts)
Decide si el mensaje del usuario pide películas. Normaliza a minúsculas y sin acentos y matchea una regex:
- Raíces con sufijo: recomend*, pelicul*, film*, busca*, sugeri*
- Palabras completas (plural opcional): movie, terror, comedia, accion, thriller, drama, otra
- "dame mas" / "dame algo" (así "dame un momento" no matchea)
Es una heurística determinista: decide el tool_choice, no el contenido de la respuesta.

Persistencia de la traza (tool calling completo)
chat_messages guarda la traza completa del turno, no solo texto. Sin ella, en los seguimientos ("otra") el modelo no ve que ya usó tools y deja de usarlas. Orden guardado:
1. USER — el mensaje
2. ASSISTANT con tool_calls (JSON) — la petición de la tool (content vacío si el modelo no escribió texto). Uno por cada tool call
3. TOOL con tool_call_id — el resultado de la tool
4. ASSISTANT — la respuesta final
Un turno sin tools guarda solo USER + ASSISTANT.

Schema: role es USER | ASSISTANT | TOOL; tool_calls es JSON nullable (solo en el ASSISTANT que pidió la tool); tool_call_id es nullable (solo en el TOOL). getMessagesByUser ordena por createdAt e id para desempatar mensajes de la misma traza guardados en el mismo milisegundo.

compactToolResult (chat.utils.ts)
Al persistir, el contenido de los mensajes TOOL se compacta a [{ tmdbId, title }]: los turnos anteriores solo necesitan id y título, lo demás son tokens de más. Acepta tanto la lista de discover_movies como la película suelta de search_movie (queda como lista de una). Un JSON de error ({ error }) o un string que no es JSON se guarda tal cual. El resultado completo (poster, rating, overview) sí se usa en el turno actual y viaja en movies.

Tools

search_movie:
- Busca una película puntual en TMDB por título
- Devuelve la primera coincidencia
- Shape del resultado en movies: { tmdbId, title, posterPath, rating, overview }
- No filtra por películas ya vistas: si el usuario pide un título puntual se lo busca aunque ya haya salido

discover_movies:
- Busca películas por filtros (with_genres, primary_release_year, vote_average.gte)
- Devuelve hasta 5 resultados, mismo shape que search_movie
- Filtra los tmdbId ya vistos (los TOOL del historial cargado, es decir la ventana de 10 mensajes). Si al filtrar la página queda vacía, pide la siguiente, hasta la página 3 (DISCOVER_MAX_PAGES). Si TMDB ya no devuelve resultados corta antes. Si todo era repetido, devuelve { error }

Ante un fallo de TMDB ninguna tool lanza: devuelven { error: 'no se pudo buscar en tmdb en este momento' } para que el modelo lo comunique. Argumentos inválidos → { error: 'argumentos invalidos' }.

System prompt: cuándo usar tools
La obligación de buscar aplica SOLO cuando el usuario pide, menciona o espera películas, incluyendo seguimientos ("otra", "dame más", "algo distinto"). El asistente nunca inventa títulos sin haberlos buscado. Si el usuario no pide películas (saludos, preguntas generales, conversación), responde con naturalidad sin llamar a ninguna tool, y esa conversación tiene prioridad sobre las tools.
Historia: la versión anterior decía "nunca nombres una película sin buscarla primero" sin acotarlo, lo que chocaba con la instrucción de charlar con naturalidad; el modelo lo resolvía buscando siempre y un "hola" devolvía 5 películas. La regla de tool_choice (chat.groq.ts) no cambió: el fix es solo de prompt.

Guard (shared/guard.ts)
- Un LLM clasifica si el mensaje pertenece al dominio cine/entretenimiento. Permite saludos, despedidas y charla general; bloquea temas claramente ajenos (política, código, matemáticas)
- Timeout de 10 s por intento, temperature 0, max_tokens 50
- Un allowed: false explícito (JSON válido) se respeta siempre
- Retry: el primer intento usa GROQ_MODEL; si falla (red, timeout o respuesta no parseable) se reintenta UNA vez con GROQ_FALLBACK_MODEL. El parseo tolera bloques <think> y tiene un fallback por regex
- Si el segundo intento también falla, fail-open (allowed: true): el system prompt ya acota el dominio, y el fail-closed bloqueaba mensajes válidos ante fallos intermitentes del modelo. Cada fallo queda logueado

Decisiones de diseño
- Doble filtro (sanitización + guard) — defensa en profundidad contra prompt injection. La sanitización es determinista y bloquea antes de gastar una llamada a Groq
- Fallback de modelo inmediato en el chat — el usuario espera la respuesta en el request, así que no hay backoff; llama tiene su propia cuota en Groq, por eso ayuda justo ante un 429 de qwen
- Guard con retry (con el modelo fallback) y fail-open ante fallo — el bloqueo real de temas ajenos lo sostiene también el system prompt. Priorizamos no bloquear mensajes válidos por un fallo transitorio. Un allowed: false explícito sigue siendo definitivo
- tool_choice condicional según asksForMovies — 'required' garantiza que un pedido de películas siempre pase por TMDB (sin alucinaciones); 'auto' deja que las conversaciones no pasen por tools. El prompt refuerza que en 'auto' el modelo no llame tools de más
- Traza completa persistida — es lo que mantiene el uso de tools en los seguimientos
- Historial de 10 mensajes — acota tokens; la traza compactada (solo tmdbId + title) permite excluir repetidas sin arrastrar overview/poster
- Historial en DB (no en memoria) — persistente entre sesiones del backend
- Módulo dividido por responsabilidad — service orquesta, groq comunica, utils es puro y testeable sin mocks, tools y prompt aislados
- Rate limit por usuario, no por IP — evita que un usuario abuse sin bloquear a otros
- max_tokens: 400 para respuestas del chat (más cortas que recomendaciones)
