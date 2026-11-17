import { defineConfig } from '@playwright/test';

const apiPort = 4123;
const webPort = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run test:server --prefix backend',
      url: `http://127.0.0.1:${apiPort}/api/salud`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        E2E_API_PORT: String(apiPort),
      },
    },
    {
      command: `npx expo export --platform web && npx --yes serve@14.2.8 -s dist -l ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        EXPO_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}/api`,
      },
    },
  ],
});
