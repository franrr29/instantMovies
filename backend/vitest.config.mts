import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    // los tests corren sin backend/.env: test.env provee variables dummy para que shared/env.ts no cierre el proceso
    env: dotenv.parse(readFileSync(new URL('./test.env', import.meta.url))),
  },
});
