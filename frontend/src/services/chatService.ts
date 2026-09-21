import { api } from './api';
import type { ChatMovieResult } from '../types';



export interface SendMessageResult {
  reply: string;
  movies: ChatMovieResult[];
}



export async function sendMessage(message: string): Promise<SendMessageResult> {
  const response = await api.post<SendMessageResult>('/chat', { message });
  return response.data;
}
