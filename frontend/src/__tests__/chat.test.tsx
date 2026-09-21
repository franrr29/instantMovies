// tests unitarios de Chat: enviar mensaje, movies cards en la respuesta, loading
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';



vi.mock('../services/chatService', () => ({
  sendMessage: vi.fn(),
}));



import { sendMessage } from '../services/chatService';
import { Chat } from '../pages/Chat';
import type { ChatMovieResult } from '../types';



function fakeMovie(tmdbId: number, title: string): ChatMovieResult {
  return {
    tmdbId,
    title,
    posterPath: null,
    rating: 7.5,
    overview: `overview de ${title}`,
  };
}



function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}



async function sendChatMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByRole('button', { name: 'Abrir chat' }));

  const input = screen.getByPlaceholderText('Preguntame algo…');
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: 'Enviar' }));
}



describe('Chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // el mensaje del usuario se agrega al historial al instante, sin esperar al backend
  it('enviar mensaje: el mensaje del usuario y la respuesta aparecen en el historial', async () => {
    vi.mocked(sendMessage).mockResolvedValue({ reply: 'Hola, en que te ayudo?', movies: [] });

    const user = userEvent.setup();
    render(<Chat />);

    await sendChatMessage(user, 'hola');

    expect(screen.getByText(/hola/)).toBeInTheDocument();
    expect(await screen.findByText(/Hola, en que te ayudo\?/)).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledWith('hola');
  });

  // cuando el LLM encuentra peliculas via tool calling, se muestran como ChatMoviePreview
  it('movies en la respuesta: renderiza 3 ChatMoviePreview debajo de la respuesta', async () => {
    const movies = [fakeMovie(1, 'Pelicula A'), fakeMovie(2, 'Pelicula B'), fakeMovie(3, 'Pelicula C')];
    vi.mocked(sendMessage).mockResolvedValue({ reply: 'Te recomiendo estas', movies });

    const user = userEvent.setup();
    render(<Chat />);

    await sendChatMessage(user, 'recomendame algo');

    for (const movie of movies) {
      expect(await screen.findByText(movie.title)).toBeInTheDocument();
    }
  });

  // promesa controlada a mano para inspeccionar el estado intermedio antes de que resuelva
  it('loading: muestra Escribiendo… y deshabilita input y boton mientras espera la respuesta', async () => {
    const deferred = createDeferred<{ reply: string; movies: ChatMovieResult[] }>();
    vi.mocked(sendMessage).mockReturnValue(deferred.promise);

    const user = userEvent.setup();
    render(<Chat />);

    await sendChatMessage(user, 'hola');

    expect(await screen.findByRole('status', { name: 'Escribiendo…' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Preguntame algo…')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    deferred.resolve({ reply: 'listo', movies: [] });
    expect(await screen.findByText(/listo/)).toBeInTheDocument();
  });
});
