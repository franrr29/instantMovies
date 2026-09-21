// tests unitarios de worker: job exitoso, job fallido con reintentos agotados, job fallido con reintentos disponibles
import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';



// bullmq (y por lo tanto redis) nunca se conecta de verdad: se captura el
// processor que worker.ts le pasa a `new Worker(...)` y se lo invoca a mano.
// tiene que ser una clase real (no un arrow function) porque `new Worker(...)`
// exige un constructor
const { WorkerMock, getCapturedProcessor } = vi.hoisted(() => {
  let capturedProcessor: ((job: Job) => Promise<void>) | undefined;

  class WorkerMock {
    close = vi.fn();

    constructor(_name: string, processor: (job: Job) => Promise<void>) {
      capturedProcessor = processor;
    }
  }

  return { WorkerMock, getCapturedProcessor: () => capturedProcessor };
});

vi.mock('bullmq', () => ({
  Worker: WorkerMock,
}));

vi.mock('../queue/recommendationQueue', () => ({
  RECOMMENDATIONS_QUEUE_NAME: 'recommendations',
  redisConnection: { quit: vi.fn() },
}));

vi.mock('../shared/db', () => ({
  prisma: { $disconnect: vi.fn() },
}));

vi.mock('../modules/likes/likes.repository', () => ({
  getLikesByUser: vi.fn(),
}));

vi.mock('../modules/recommendations/recommendations.repository', () => ({
  completeRecommendation: vi.fn(),
  failRecommendation: vi.fn(),
}));

vi.mock('../shared/groq', () => ({
  generateRecommendation: vi.fn(),
}));

vi.mock('../shared/tmdb', () => ({
  getMovieById: vi.fn(),
}));



import { getLikesByUser } from '../modules/likes/likes.repository';
import { completeRecommendation, failRecommendation } from '../modules/recommendations/recommendations.repository';
import { generateRecommendation } from '../shared/groq';
import { getMovieById } from '../shared/tmdb';

// dispara el `new Worker(...)` (mockeado) y con eso captura el processor real
import '../worker';



function fakeTmdbMovie(tmdbMovieId: number) {
  return {
    id: tmdbMovieId,
    title: `Pelicula ${tmdbMovieId}`,
    overview: `overview de ${tmdbMovieId}`,
    release_date: '2020-01-01',
    poster_path: `/poster-${tmdbMovieId}.jpg`,
    vote_average: 7.5,
    genres: [{ id: 1, name: 'Accion' }],
  };
}



function buildJob(overrides: { attempts?: number; attemptsMade?: number } = {}): Job {
  return {
    data: { recommendationId: 1, userId: 1 },
    opts: { attempts: overrides.attempts ?? 3 },
    attemptsMade: overrides.attemptsMade ?? 0,
  } as unknown as Job;
}



describe('worker processRecommendationJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registro el processor al crear el Worker', () => {
    expect(getCapturedProcessor()).toBeTypeOf('function');
  });

  it('job exitoso: llama a completeRecommendation con el array de movies', async () => {
    vi.mocked(getLikesByUser).mockResolvedValue([{ id: 1, userId: 1, tmdbMovieId: 27205, createdAt: new Date() }]);
    vi.mocked(getMovieById).mockResolvedValue(fakeTmdbMovie(27205));
    vi.mocked(generateRecommendation).mockResolvedValue([
      { title: 'A', tmdbMovieId: 1, reason: 'razon a' },
      { title: 'B', tmdbMovieId: 2, reason: 'razon b' },
      { title: 'C', tmdbMovieId: 3, reason: 'razon c' },
    ]);

    const processor = getCapturedProcessor();
    await processor!(buildJob());

    expect(completeRecommendation).toHaveBeenCalledWith(1, [
      { tmdbMovieId: 1, reason: 'razon a' },
      { tmdbMovieId: 2, reason: 'razon b' },
      { tmdbMovieId: 3, reason: 'razon c' },
    ]);
    expect(failRecommendation).not.toHaveBeenCalled();
  });

  it('job fallido: agotados los reintentos, llama a failRecommendation', async () => {
    vi.mocked(getLikesByUser).mockResolvedValue([{ id: 1, userId: 1, tmdbMovieId: 27205, createdAt: new Date() }]);
    vi.mocked(getMovieById).mockResolvedValue(fakeTmdbMovie(27205));
    vi.mocked(generateRecommendation).mockRejectedValue(new Error('groq devolvio json invalido'));

    const processor = getCapturedProcessor();

    // attemptsMade = attempts - 1: es el ultimo intento, no debe re-lanzar
    await processor!(buildJob({ attempts: 3, attemptsMade: 2 }));

    expect(failRecommendation).toHaveBeenCalledWith(1);
    expect(completeRecommendation).not.toHaveBeenCalled();
  });

  it('job fallido pero con reintentos disponibles: re-lanza y no marca failed todavia', async () => {
    vi.mocked(getLikesByUser).mockResolvedValue([{ id: 1, userId: 1, tmdbMovieId: 27205, createdAt: new Date() }]);
    vi.mocked(getMovieById).mockResolvedValue(fakeTmdbMovie(27205));
    vi.mocked(generateRecommendation).mockRejectedValue(new Error('groq devolvio json invalido'));

    const processor = getCapturedProcessor();

    await expect(processor!(buildJob({ attempts: 3, attemptsMade: 0 }))).rejects.toThrow(
      'groq devolvio json invalido',
    );

    expect(failRecommendation).not.toHaveBeenCalled();
  });
});
