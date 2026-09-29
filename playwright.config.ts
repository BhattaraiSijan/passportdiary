import { defineConfig, devices } from '@playwright/test';

// Runs against the production build, so bundling problems (e.g. the map worker) are caught.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4183',
    launchOptions: {
      // Software WebGL, so the globe renders on machines without a GPU.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4183 --strictPort',
    url: 'http://localhost:4183',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
