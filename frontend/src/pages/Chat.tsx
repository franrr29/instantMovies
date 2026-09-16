import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MovieCard } from '../components/MovieCard';
import { sendMessage } from '../services/chatService';
import type { ChatMessage } from '../types';

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function sendToBackend(text: string) {
    setError(null);
    setIsSending(true);

    try {
      const { reply, movies } = await sendMessage(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, movies }]);
      setLastFailedMessage(null);
    } catch {
      setError('No se pudo enviar el mensaje. Intentá de nuevo.');
      setLastFailedMessage(text);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    void sendToBackend(trimmed);
  }

  function handleRetry() {
    if (lastFailedMessage) {
      void sendToBackend(lastFailedMessage);
    }
  }

  return (
    <div>
      <h1>Chat</h1>

      <div>
        {messages.length === 0 && <p>Preguntame sobre películas.</p>}

        {messages.map((message, index) => (
          <div key={index}>
            <p>
              <strong>{message.role === 'user' ? 'Vos' : 'Asistente'}:</strong> {message.content}
            </p>

            {message.movies && message.movies.length > 0 && (
              <div>
                {message.movies.map((movie) => (
                  <MovieCard
                    key={movie.tmdbId}
                    title={movie.title}
                    overview={movie.overview}
                    posterPath={movie.posterPath}
                    voteAverage={movie.rating}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {isSending && <p>Pensando...</p>}

        {error && (
          <div>
            <p>{error}</p>
            <button onClick={handleRetry}>Reintentar</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSending}
          placeholder="Escribí tu mensaje..."
        />
        <button type="submit" disabled={isSending || !input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
