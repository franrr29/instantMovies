import type { ReactNode } from 'react';

import { eyebrowLabel } from './styles';



export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className={`flex items-center gap-3 ${eyebrowLabel}`}>
      <span className="h-px w-8 bg-accent" />
      {children}
    </div>
  );
}
