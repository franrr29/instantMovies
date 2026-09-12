import { ChatMessageRole } from '../../generated/prisma/client';
import { prisma } from '../../shared/db';

export interface ChatMessageRecord {
  id: number;
  userId: number;
  role: ChatMessageRole;
  content: string;
  createdAt: Date;
}

export async function saveMessage(
  userId: number,
  role: ChatMessageRole,
  content: string,
): Promise<ChatMessageRecord> {
  return prisma.chatMessage.create({ data: { userId, role, content } });
}

export async function getMessagesByUser(
  userId: number,
  limit = 20,
): Promise<ChatMessageRecord[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse();
}

export async function clearChat(userId: number): Promise<void> {
  await prisma.chatMessage.deleteMany({ where: { userId } });
}
