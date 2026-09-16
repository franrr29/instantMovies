Spec: Testing Frontend

Ubicación: frontend/src/__tests__/
Framework: Vitest + React Testing Library + jsdom
Tipo: Unitarios con mocks (sin backend real)

Configuración

Instalar dependencias de desarrollo:

vitest
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
jsdom

Archivos de configuración:

vitest.config.ts en la raíz del frontend: environment jsdom, setup file
src/test/setup.ts: importar @testing-library/jest-dom/vitest
Scripts en package.json: "test" → vitest run, "test:watch" → vitest
Qué testeamos

Componentes con lógica de estado, interacción con el backend, o comportamiento condicional. No testeamos componentes puramente visuales.

Tests por componente
AuthContext — auth-context.test.tsx

Restaurar sesión:

Mockear GET /auth/me → 200 con user → el contexto tiene user después del mount
Mockear GET /auth/me → 401 → el contexto queda sin user

Login:

Mockear POST /auth/login → 200 → el contexto actualiza el user

Logout:

Mockear POST /auth/logout → 200 → el contexto limpia el user

Método: renderizar un componente dummy que consume useAuth() y muestra el estado. Mockear services/api.ts con vi.mock().

Recommendations — recommendations.test.tsx

Sin likes:

Mockear GET /likes → array vacío
Debe mostrar mensaje "Dale like a algunas películas primero"
Botón de pedir deshabilitado

Estado PENDING con polling:

Mockear GET /recommendations → una rec con status PENDING
Debe mostrar indicador de loading
Botón deshabilitado

Estado COMPLETED:

Mockear GET /recommendations → una rec COMPLETED con 3 películas
Debe renderizar 3 MovieCards con título y reason

Estado FAILED:

Mockear GET /recommendations → una rec FAILED
Debe mostrar mensaje de error

Método: mockear services/recommendationsService.ts y services/likesService.ts. Wrappear en QueryClientProvider para TanStack Query.

MovieList — movie-list.test.tsx

Trending como estado inicial:

Mockear GET /movies/trending → array de películas
Debe renderizar MovieCards con los títulos

Búsqueda con debounce:

Escribir en el input → no llama a la API inmediatamente
Después del debounce (fake timers) → llama a GET /movies?query=...
Debe mostrar resultados de búsqueda

Toggle like:

Mockear GET /likes → array vacío (ninguna likeada)
Click en botón like → llama a POST /likes
Mockear GET /likes → array con esa película (ya likeada)
El botón muestra estado likeado

Método: mockear services/moviesService.ts y services/likesService.ts. Usar vi.useFakeTimers() para el debounce. Wrappear en QueryClientProvider.

Chat — chat.test.tsx

Enviar mensaje:

Escribir en el input + submit → el mensaje del usuario aparece en el historial
Mockear POST /chat → { reply, movies: [] } → la respuesta aparece en el historial

Movies cards en la respuesta:

Mockear POST /chat → { reply, movies: [3 películas] }
Debe renderizar 3 MovieCards debajo de la respuesta

Loading:

Después de enviar, antes de la respuesta → debe mostrar "Pensando..."
Input y botón deshabilitados

Método: mockear services/chatService.ts. No wrappear en QueryClientProvider (chat no usa TanStack Query).

No incluir
Tests de Login/Register (validación de formularios es simple, no justifica el setup)
Tests de Navbar/Layout (puramente visual)
Tests de MovieCard (componente presentacional)
Tests e2e con Playwright/Cypress
Coverage mínimo