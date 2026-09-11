// forma que va a tener el registro de usuario una vez que exista la tabla en mysql
export interface AuthUser {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface NewAuthUser {
  username: string;
  passwordHash: string;
}

// firma lista para cuando prisma este configurado: prisma.user.findUnique({ where: { username } })
export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  // todo: conectar prisma, todavia no esta configurada la base de datos
  throw new Error('auth.repository.findUserByUsername: acceso a base de datos pendiente');
}

// firma lista para cuando prisma este configurado: prisma.user.create({ data })
export async function createUser(data: NewAuthUser): Promise<AuthUser> {
  // todo: conectar prisma, todavia no esta configurada la base de datos
  throw new Error('auth.repository.createUser: acceso a base de datos pendiente');
}
