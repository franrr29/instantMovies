import type { ReactNode } from 'react';



export function PosterFallback({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-full items-center justify-center px-3 text-center
        font-display text-xs uppercase tracking-[0.2em] text-ink/40"
    >
      {children}
    </div>
  );
}
