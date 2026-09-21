import { prisma } from '../../shared/db';



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
