import { defineConfig } from 'vitest/config';

// Unit tests for stores/hooks (no PWA plugin needed). E2E lives in e2e/ (Playwright).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
