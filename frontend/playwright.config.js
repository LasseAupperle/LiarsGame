// End-to-end tests: real backend + production frontend build in Chromium.
// Run: npm run test:e2e   (first time: npx playwright install chromium)
import { defineConfig } from '@playwright/test';

const API_PORT = 3101;
const WEB_PORT = 4174;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'line',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'off',
    viewport: { width: 1280, height: 800 },
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  webServer: [
    {
      // Fast bots so a full solo game finishes quickly
      command: `PORT=${API_PORT} BOT_MIN_MS=60 BOT_MAX_MS=150 node src/server.js`,
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: `VITE_API_URL=http://localhost:${API_PORT} npx vite build --outDir e2e-dist --emptyOutDir && npx vite preview --outDir e2e-dist --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
