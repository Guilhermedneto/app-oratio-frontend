// Gera src/api/schema.d.ts a partir do OpenAPI do FastAPI (fonte única do contrato).
//
// Fontes, em ordem:
//   1. OPENAPI_SOURCE  - URL (ex.: https://sua-api.onrender.com/openapi.json) ou caminho de um arquivo .json
//   2. ORATIO_API_DIR  - pasta do repositório do back (padrão: ../app-oratio-banckend ou ../api); usa o Python do venv dele
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../src/api/schema.d.ts')
mkdirSync(dirname(out), { recursive: true })
const win = process.platform === 'win32'
const bin = resolve(here, '../node_modules/.bin/openapi-typescript' + (win ? '.cmd' : ''))
const run = (input) => execFileSync(bin, [input, '-o', out], { stdio: 'inherit', shell: win })

if (process.env.OPENAPI_SOURCE) {
  run(process.env.OPENAPI_SOURCE)
} else {
  const candidates = [process.env.ORATIO_API_DIR, '../app-oratio-banckend', '../api'].filter(Boolean).map((p) => resolve(here, '..', p))
  const apiDir = candidates.find((d) => existsSync(resolve(d, 'app/main.py')))
  if (!apiDir) {
    console.error('Back-end não encontrado. Defina OPENAPI_SOURCE (URL ou arquivo) ou ORATIO_API_DIR.')
    process.exit(1)
  }
  const py = [resolve(apiDir, '.venv/Scripts/python.exe'), resolve(apiDir, '.venv/bin/python')].find(existsSync) ?? 'python'
  const spec = resolve(apiDir, 'openapi.json')
  execFileSync(py, ['-m', 'app.export_openapi', spec], { cwd: apiDir, stdio: 'inherit' })
  run(spec)
}
