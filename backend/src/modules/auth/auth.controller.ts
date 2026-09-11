import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { loginSchema, registerSchema } from './auth.schemas';
import { AuthServiceError, loginUser, registerUser } from './auth.service';

//registrar usuario:
export async function register(req: Request, res: Response, next: NextFunction) {

  try {

    const { username, password } = registerSchema.parse(req.body);
    const user = await registerUser(username, password);
    res.status(201).json(user);


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
    const { token } = await loginUser(username, password);
    res.status(200).json({ token });

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
