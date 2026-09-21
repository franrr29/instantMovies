import { cn } from '../../lib/cn';



// corazon animado: bounce + rojo al likear, fade de vuelta a muted al deslikear
export function LikeIcon({ liked }: { liked: boolean }) {
  return (
    <span
      className={cn(
        'inline-block transition-all duration-300 ease-out',
        liked
          ? 'animate-like-bounce scale-100 text-red-500 opacity-100'
          : 'scale-90 text-ink/60 opacity-60',
      )}
    >
      {liked ? '♥' : '♡'}
    </span>
  );
}
