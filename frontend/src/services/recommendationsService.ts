import { api } from './api';
import type { Recommendation } from '../types';

export async function getRecommendations(): Promise<Recommendation[]> {
  const response = await api.get<Recommendation[]>('/recommendations');
  return response.data;
}

export async function getRecommendationById(id: number): Promise<Recommendation> {
  const response = await api.get<Recommendation>(`/recommendations/${id}`);
  return response.data;
}

export async function requestRecommendation(): Promise<Recommendation> {
  const response = await api.post<Recommendation>('/recommendations');
  return response.data;
}
