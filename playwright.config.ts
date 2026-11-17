import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const win = process.platform === 'win32'
// O E2E precisa do repositório do back ao lado: ORATIO_API_DIR (padrão ../app-oratio-banckend, ou ../api no monorepo local).
const apiDir = process.env.ORATIO_API_DIR
  ? resolve(import.meta.dirname, process.env.ORATIO_API_DIR)
  : [resolve(import.meta.dirname, '../app-oratio-banckend'), resolve(import.meta.dirname, '../api')].find((d) => existsSync(resolve(d, 'app/main.py'))) ??
    resolve(import.meta.dirname, '../api')
const py = resolve(apiDir, '.venv', win ? 'Scripts/python.exe' : 'bin/python')

// O E2E usa portas e banco próprios (oratio_e2e), para nunca tocar nos dados de desenvolvimento.
export const E2E = {
  api: 'http://localhost:8011',
  web: 'http://localhost:4184',
  dbUrl: 'postgresql+asyncpg://oratio:oratio@localhost:5433/oratio_e2e',
  manager: 'gestor@example.com',
  python: py,
  apiDir,
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: E2E.web, ...devices['Pixel 7'], serviceWorkers: 'allow' },
  webServer: [
    {
      command: `"${py}" -m uvicorn app.main:app --port 8011`,
      cwd: apiDir,
      url: `${E2E.api}/health`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E.dbUrl,
        LITURGY_SOURCES: 'sample',
        RATE_LIMIT_ENABLED: 'false',
        ENV: 'dev',
        MANAGER_EMAILS: E2E.manager,
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 4184 --strictPort',
      url: E2E.web,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { ORATIO_API: E2E.api },
    },
  ],
})
