import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';



// jsdom no implementa scrollIntoView (lo usa Chat.tsx para el auto-scroll)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
  // red de seguridad: si un test que uso fake timers falla antes de restaurarlos,
  // esto evita que el estado quede pisando a los tests siguientes
  vi.useRealTimers();
});
