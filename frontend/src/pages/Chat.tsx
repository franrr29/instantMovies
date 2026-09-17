import { useEffect, useRef, useState, type FormEvent } from 'react';
import { btnPrimary, btnSecondary, inputClasses } from '../components/ui/styles';
import { TypingDots } from '../components/ui/TypingDots';
import { cn } from '../lib/cn';
import { sendMessage } from '../services/chatService';
import type { ChatMessage, ChatMovieResult } from '../types';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92';

function ChatMoviePreview({ movie }: { movie: ChatMovieResult }) {
  return (
    <div className="flex items-center gap-2.5 border border-divider p-2">
      <div className="h-16 w-11 flex-shrink-0 bg-surface">
        {movie.posterPath && (
          <img
            src={`${TMDB_IMAGE_BASE_URL}${movie.posterPath}`}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 font-display">
        <p className="text-[13px] leading-tight">{movie.title}</p>
        <p className="mt-1 text-[10px] text-accent">★ {movie.rating.toFixed(1)}</p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed',
          isUser ? 'border border-accent/40 bg-accent/[0.14] text-ink' : 'border border-divider text-ink',
        )}
      >
        {message.content}
      </p>

      {message.movies && message.movies.length > 0 && (
        <div className="flex w-[90%] flex-col gap-2">
          {message.movies.map((movie) => (
            <ChatMoviePreview key={movie.tmdbId} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm transition-opacity duration-200"
        />
      )}

      <div
        aria-hidden={!isOpen}
        className={cn(
          'fixed bottom-20 right-6 z-50 flex h-[500px] max-h-[70vh] w-[400px] max-w-[calc(100vw-3rem)]',
          'origin-bottom-right flex-col border border-divider bg-gradient-to-b from-surface-raised to-bg shadow-lg',
          'transition-all duration-200 ease-out',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink">Projectionist</span>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar chat"
            className="ml-auto text-lg leading-none text-ink/60 transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-sm text-ink/60">Preguntame sobre películas.</p>}

          {messages.map((message, index) => (
            <ChatBubble key={index} message={message} />
          ))}

          {isSending && (
            <div className="flex w-fit border border-divider px-3.5 py-2.5">
              <TypingDots />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-red-400">{error}</p>
              <button onClick={handleRetry} className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}>
                Reintentar
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-divider p-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isSending}
            placeholder="Preguntame algo…"
            className={cn(inputClasses, 'min-h-0 flex-1 border-transparent px-2 py-1.5')}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className={cn(btnPrimary, 'px-3.5 py-2 text-xs')}
          >
            Enviar
          </button>
        </form>
      </div>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full
          border border-accent bg-accent text-2xl shadow-lg transition-transform hover:scale-105"
      >
        {isOpen ? '×' : '🤖'}
      </button>
    </>
  );
}
