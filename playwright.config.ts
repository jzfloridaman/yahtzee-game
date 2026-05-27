import { defineConfig, devices } from '@playwright/test';

// BASE_URL is overridden inside the docker playwright service to use the
// internal service hostname (http://web:5173) instead of localhost.
const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium-mobile',
            use: { ...devices['iPhone 13'] },
        },
    ],
    outputDir: 'test-results',
});
