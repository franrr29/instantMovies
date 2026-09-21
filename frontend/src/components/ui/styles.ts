// clases compartidas del lenguaje visual "cine nocturno / blueprint":
// fondo casi negro, texto marfil, acento ambar, bordes finos sin redondear.
// paleta y tipografia en tailwind.config.ts.
import { cn } from '../../lib/cn';



export const eyebrowLabel = 'font-display text-[11px] uppercase tracking-[0.28em] text-muted';

export const sectionHeading = 'font-display leading-none tracking-tight text-ink';

export const panel = 'border border-divider bg-gradient-to-b from-surface-raised to-bg';

export const inputClasses = cn(
  'w-full min-h-[38px] border border-divider bg-transparent px-3 py-2',
  'font-sans text-sm text-ink placeholder:text-muted transition-colors',
  'hover:border-ink/45 focus:border-accent focus:outline-none',
);

export const fieldLabel = 'mb-1.5 block font-display text-[10px] uppercase tracking-[0.24em] text-muted';

const btnBase = cn(
  'inline-flex items-center justify-center gap-1.5 border font-display font-semibold',
  'text-sm tracking-wide transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-45',
);

export const btnPrimary = cn(btnBase, 'border-accent bg-accent px-6 py-3 text-accent-ink hover:bg-accent-light');

export const btnSecondary = cn(btnBase, 'border-divider bg-transparent px-6 py-3 text-ink hover:bg-ink/[0.07]');

export const tagOutline = cn(
  'inline-flex items-center border border-accent px-3 py-1.5',
  'font-display text-[11px] uppercase tracking-[0.16em] text-accent',
);

const likeButtonBase = cn(
  'inline-flex items-center gap-1.5 border px-3 py-1.5 font-display',
  'text-[11px] uppercase tracking-[0.14em] transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export const likeButtonLiked = cn(likeButtonBase, 'border-accent bg-accent/10 text-accent');

export const likeButtonIdle = cn(
  likeButtonBase,
  'border-divider text-ink/70 hover:border-accent hover:text-accent',
);
