import { defineConfig, devices } from '@playwright/test'

const skipVideo = process.env.PW_SKIP_VIDEO === '1'
const forcedHeadless = process.env.PW_HEADLESS === '0' ? false : true

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:4178',
    trace: 'on-first-retry',
    headless: forcedHeadless,
    viewport: { width: 1400, height: 900 },
    video: skipVideo ? 'off' : 'on'
  },
  webServer: {
    command: 'npm run dev -- --host --port 4178',
    url: 'http://localhost:4178',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 30_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
