Spec: Módulo Auth

Ruta base: /api/v1/auth
Capas: routes → controller → service → repository

Endpoints
POST /register — { username, password } → 201 { user } + cookie httpOnly
POST /login — { username, password } → 200 { user } + cookie httpOnly
POST /logout — (auth) → 200 (limpia cookie)
GET /me — (auth) → 200 { user } (restaurar sesión)
Validación (Zod)

Username (register y login):

Email válido (z.string().email())
Se normaliza a lowercase con .transform()

Password en register:

Mínimo 8 caracteres, una mayúscula, una minúscula, un número, un carácter especial
Regex con lookaheads, mensaje descriptivo

Password en login:

Solo z.string().min(1) — no se valida complejidad (el usuario puede tener contraseña vieja)
Lógica de negocio (service)

Register:

Verifica si el username ya existe → AuthServiceError('USERNAME_TAKEN') → controller devuelve 409
Hashea password con bcrypt (10 rounds)
Crea usuario en DB
Firma JWT (24h) y lo setea como cookie httpOnly

Login:

Busca usuario por username
Si no existe, compara contra DUMMY_PASSWORD_HASH para igualar tiempo de respuesta (timing attack prevention)
Si existe, compara password real
Credenciales inválidas → AuthServiceError('INVALID_CREDENTIALS') → controller devuelve 401 con mensaje genérico (no revela si el username existe o no)

Logout:

Limpia cookie httpOnly

Me:

Devuelve { id, username } del usuario autenticado (el middleware authenticate ya validó el JWT)
Decisiones de diseño
Cookie httpOnly en vez de localStorage para el JWT — el frontend nunca ve el token
DUMMY_PASSWORD_HASH generado una vez al levantar el proceso — previene timing attacks sin overhead
El service no sabe de HTTP — lanza errores tipados, el controller mapea a status codes
No se devuelve passwordHash ni createdAt en /me — data minimization