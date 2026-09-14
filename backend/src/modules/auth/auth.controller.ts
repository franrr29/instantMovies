import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { clearAuthCookie, setAuthCookie } from '../../shared/authCookie';
import { loginSchema, registerSchema } from './auth.schemas';
import { AuthServiceError, loginUser, registerUser } from './auth.service';

//registrar usuario:
export async function register(req: Request, res: Response, next: NextFunction) {

  try {

    const { username, password } = registerSchema.parse(req.body);
    const { user, token } = await registerUser(username, password);

    setAuthCookie(res, token);
    res.status(201).json({ user });


  } catch (err) {

    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    if (err instanceof AuthServiceError && err.code === 'USERNAME_TAKEN') {
      res.status(409).json({ error: err.message });
      return;
    }

    next(err);
  }
}


//logear usuario:
export async function login(req: Request, res: Response, next: NextFunction) {

  try {

    const { username, password } = loginSchema.parse(req.body);
    const { user, token } = await loginUser(username, password);

    setAuthCookie(res, token);
    res.status(200).json({ user });

  } catch (err) {

    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    // mismo status y mismo mensaje sin importar si el usuario no existe o la contraseña esta mal
    if (err instanceof AuthServiceError && err.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: err.message });
      return;
    }

    next(err);
  }
}

//cerrar sesion, limpia la cookie de auth:
export async function logout(req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Logged out' });
}

//sesion actual, para que el frontend la restaure al recargar:
export async function me(req: Request, res: Response) {
  res.status(200).json({ user: { id: req.user!.id, username: req.user!.username } });
}
