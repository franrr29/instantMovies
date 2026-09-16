Spec: Componentes compartidos — Navbar y Layout
Layout

Qué hace: Wrapper que envuelve todas las pantallas protegidas. Renderiza la Navbar arriba y el contenido de la página debajo.

Dónde se usa: En el router, como parent de todas las rutas protegidas. Reemplaza el <Outlet /> directo del ProtectedRoute.

<ProtectedRoute>
  <Layout>       ← Navbar + Outlet
    <Outlet />
  </Layout>
</ProtectedRoute>

Comportamiento:

Renderiza Navbar en la parte superior
Renderiza <Outlet /> debajo para el contenido de la ruta activa
No tiene lógica propia, solo estructura
Navbar

Qué hace: Barra de navegación principal. Links a las secciones y botón de logout.

Se muestra: Solo en rutas protegidas (vive dentro de Layout).

Links de navegación:

Películas → /movies
Mis Likes → /likes
Recomendaciones → /recommendations
Chat → /chat

Estado activo: El link de la ruta actual se distingue visualmente (por ahora texto bold o subrayado, sin Tailwind). Usar useLocation o NavLink de React Router.

Botón Logout:

Alineado a la derecha
Click → llamar a logout() del AuthContext
Después del logout, AuthContext limpia el user y el interceptor redirige a /login
Deshabilitar el botón durante la request

Username visible:

Mostrar el username del usuario logueado (de AuthContext) al lado del botón logout

Herramientas:

useAuth() para user y logout
NavLink de React Router para links con estado activo
No crear service nuevo
Cambios en el router
Modificar App.tsx para que las rutas protegidas usen Layout como wrapper
El ProtectedRoute sigue manejando la auth, Layout solo agrega Navbar
No incluir
Menú hamburguesa mobile (eso es Tailwind)
Logo o branding
Notificaciones
Dropdown de usuario