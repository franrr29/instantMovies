import { z } from 'zod';



export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(500, 'el mensaje no puede superar los 500 caracteres'),
});
