import { prisma } from '../../shared/db';

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

export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { username } });
}

export async function createUser(data: NewAuthUser): Promise<AuthUser> {
  return prisma.user.create({ data });
}
