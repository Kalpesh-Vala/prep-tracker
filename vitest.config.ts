import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // A shared in-memory MongoDB starts once in globalSetup; allow time for the
    // binary download on the very first run.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Files share one MongoDB; run sequentially to keep data isolated per file.
    fileParallelism: false,
  },
});
