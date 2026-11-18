// Test browser opzionali: richiedono `npm install` e `npx playwright install`.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tools/serve.js',
    port: 8080,
    reuseExistingServer: true,
    timeout: 15000
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 5'] } }]
});
