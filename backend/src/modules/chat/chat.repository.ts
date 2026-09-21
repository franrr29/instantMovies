import type { ChatMessageRole, Prisma } from '../../generated/prisma/client';
import { prisma } from '../../shared/db';



export interface ChatMessageRecord {
  id: number;
  userId: number;
  role: ChatMessageRole;
  content: string;
  toolCalls: Prisma.JsonValue | null;
  toolCallId: string | null;
  createdAt: Date;
}

// toolCalls solo va en el assistant que pidio la tool; toolCallId solo en el mensaje tool con su resultado
export interface SaveMessageTrace {
  toolCalls?: unknown;
  toolCallId?: string;
}



export async function saveMessage(
  userId: number,
  role: ChatMessageRole,
  content: string,
  trace: SaveMessageTrace = {},
): Promise<ChatMessageRecord> {
  return prisma.chatMessage.create({
    data: {
      userId,
      role,
      content,
      toolCalls: trace.toolCalls as Prisma.InputJsonValue | undefined,
      toolCallId: trace.toolCallId,
    },
  });
}



export async function getMessagesByUser(
  userId: number,
  limit = 20,
): Promise<ChatMessageRecord[]> {
  // id desempata mensajes de la misma traza guardados en el mismo milisegundo
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });

  return messages.reverse();
}
