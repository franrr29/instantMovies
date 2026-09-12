import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendChatMessageSchema } from './chat.schemas';
import { handleChatMessage } from './chat.service';


//funcion para manejar el envio de mensajes de chat:
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {

    const { message } = sendChatMessageSchema.parse(req.body);
    const userId = req.user!.id;

    const { reply, movies } = await handleChatMessage(userId, message);

    res.json({ reply, movies });


  } catch (err) {
    
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    next(err);
  }
}
