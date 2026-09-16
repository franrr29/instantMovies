Spec: Pantallas Login y Register

Rutas: /login y /register
Requiere auth: no (rutas públicas, si ya está logueado redirigir a /movies)

Qué hacen

Formularios de autenticación. Login autentica un usuario existente, Register crea uno nuevo. Ambos setean la cookie httpOnly via el backend y redirigen a /movies al tener éxito.

Data source
POST /api/v1/auth/login — { username, password } → 200 { user } (cookie seteada)
POST /api/v1/auth/register — { username, password } → 201 { user } (cookie seteada)
Campos del formulario

Login:

Username (input type email, required)
Password (input type password, required)
Botón "Iniciar sesión"

Register:

Username (input type email, required)
Password (input type password, required)
Confirmar password (input type password, required)
Botón "Crear cuenta"
Validación frontend (antes de enviar)

Username (ambos formularios):

Campo vacío: "El username es obligatorio"
No es email válido: "El username debe ser un email válido"
Transformar a lowercase antes de enviar

Password en Register:

Campo vacío: "La contraseña es obligatoria"
Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial
Si no cumple: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial"

Password en Login:

Campo vacío: "La contraseña es obligatoria"
No validar complejidad (el backend tampoco lo hace en login)

Confirmar password en Register:

No coincide: "Las contraseñas no coinciden"

No enviar la request si la validación falla.

Comportamiento
Submit
Al enviar, llamar a login() o register() del AuthContext
Mostrar loading en el botón durante la request (disabled + texto tipo "Cargando...")
Si éxito: AuthContext setea el user, redirigir a /movies con useNavigate
Si error: mostrar el mensaje de error del backend debajo del formulario (no alert)
Errores del backend
401 en login: "Usuario o contraseña incorrectos"
409 en register: "Ese usuario ya existe"
400 (validación Zod): mostrar el mensaje que devuelve el backend
Otros errores: "Algo salió mal, intentá de nuevo"
Navegación entre pantallas
Login tiene link a Register: "¿No tenés cuenta? Creá una"
Register tiene link a Login: "¿Ya tenés cuenta? Iniciá sesión"
Redirect si ya está logueado
Si el usuario ya está autenticado (AuthContext tiene user), redirigir a /movies automáticamente
No mostrar el formulario
Herramientas
AuthContext (useAuth) para login/register/user
useNavigate de React Router para redirect
No usar TanStack Query — auth es estado de sesión manejado por AuthContext
No crear un service nuevo — AuthContext ya encapsula las llamadas
axios via services/api.ts (nunca fetch directo)
No incluir
Recuperar contraseña
OAuth/social login
Requisitos de formato más allá de los definidos arriba