import type { ReactNode } from 'react';

import { panel } from './styles';
import { cn } from '../../lib/cn';



interface AuthCardProps {
  tag: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}



export function AuthCard({ tag, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className={cn(panel, 'w-full max-w-md p-8 sm:p-12')}>
      <div className="mb-8 flex items-center gap-2.5 font-display">
        <span className="flex h-5.5 w-5.5 items-center justify-center bg-accent text-[11px] text-accent-ink">▶</span>
        <span className="text-base tracking-tight">InstantMovies</span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.24em] text-ink/50">{tag}</span>
      </div>

      <h1 className="font-display text-3xl leading-none tracking-tight">{title}</h1>
      <p className="mb-7 mt-2 text-[13px] text-ink/60">{subtitle}</p>

      {children}

      <div className="mt-5 text-center text-[13px] text-ink/60">{footer}</div>
    </div>
  );
}
