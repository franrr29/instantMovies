import { z } from 'zod';



export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(500),
});
