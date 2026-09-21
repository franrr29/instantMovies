import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../../shared/env';
import { createUser, findUserByUsername } from './auth.repository';



const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '24h';

// hash generado una sola vez al levantar el proceso, se usa para comparar
// cuando el usuario no existe y asi el login tarda lo mismo en ambos casos
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-para-timing', SALT_ROUNDS);



type AuthErrorCode = 'USERNAME_TAKEN' | 'INVALID_CREDENTIALS';



// el controller decide el status http a partir de este code, el service no sabe de http
export class AuthServiceError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}



export interface PublicUser {
  id: number;
  username: string;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}



export async function registerUser(username: string, password: string): Promise<AuthResult> {

  const existingUser = await findUserByUsername(username);

  if (existingUser) {
    throw new AuthServiceError('USERNAME_TAKEN', 'ese nombre de usuario ya esta en uso');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ username, passwordHash });
  const token = signToken(user.id, user.username);

  return { user: { id: user.id, username: user.username, createdAt: user.createdAt }, token };
}



export async function loginUser(username: string, password: string): Promise<AuthResult> {

  const user = await findUserByUsername(username);

  // se compara siempre, exista o no el usuario, para no filtrar por tiempo de respuesta si el username existe
  const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatches) {
    throw new AuthServiceError('INVALID_CREDENTIALS', 'usuario o contraseña invalidos');
  }

  const token = signToken(user.id, user.username);
  return { user: { id: user.id, username: user.username, createdAt: user.createdAt }, token };
}



function signToken(userId: number, username: string): string {
  return jwt.sign({ sub: userId, username }, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
