import { execFileSync } from 'node:child_process'
import { E2E } from '../playwright.config'

const SENHA = 'senha-forte-123'
const apiDir = E2E.apiDir

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init
  const r = await fetch(`${E2E.api}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!r.ok && r.status !== 409) throw new Error(`${rest.method ?? 'GET'} ${path} -> ${r.status} ${await r.text()}`)
  return r
}

const base = { author: null, origin: null, source_url: null, published: true }
const oracao = (slug: string, title: string, body: string, category = 'basicas') => ({
  ...base, kind: 'oracao', slug, title, body, category,
})

/** Banco limpo + conteúdo mínimo cadastrado pelo gestor (o app não traz mais conteúdo embutido). */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E.dbUrl }
  // banco do E2E sempre do zero: apaga o esquema (o downgrade falharia com os tipos novos já gravados)
  const reset = [
    'import asyncio, asyncpg, os',
    "url = os.environ['DATABASE_URL'].replace('+asyncpg', '')",
    'async def go():',
    '    c = await asyncpg.connect(url)',
    "    await c.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')",
    '    await c.close()',
    'asyncio.run(go())',
  ].join('\n')
  execFileSync(E2E.python, ['-c', reset], { cwd: apiDir, env, stdio: 'ignore' })
  execFileSync(E2E.python, ['-m', 'alembic', 'upgrade', 'head'], { cwd: apiDir, env, stdio: 'ignore' })

  const reg = await call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: E2E.manager, password: SENHA, name: 'Gestor' }),
  })
  const { access_token: token } = (await reg.json()) as { access_token: string }

  const items = [
    oracao('sinal-da-cruz', 'Sinal da Cruz', 'Em nome do Pai e do Filho e do Espírito Santo. Amém.'),
    oracao('credo', 'Credo', 'Creio em Deus Pai todo-poderoso, criador do céu e da terra.'),
    oracao('pai-nosso', 'Pai-Nosso', 'Pai nosso, que estais nos céus, santificado seja o vosso nome.'),
    oracao('ave-maria', 'Ave-Maria', 'Ave, Maria, cheia de graça, o Senhor é convosco.', 'marianas'),
    oracao('gloria', 'Glória ao Pai', 'Glória ao Pai e ao Filho e ao Espírito Santo.'),
    oracao('o-meu-jesus', 'Ó meu Jesus', 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno.'),
    oracao('salve-rainha', 'Salve Rainha', 'Salve, Rainha, Mãe de misericórdia.', 'marianas'),
    oracao('oracao-final-do-terco', 'Oração final do Terço', 'Ó Deus, cujo Filho unigênito nos alcançou o prêmio da vida eterna.', 'marianas'),
    oracao('oracao-da-manha', 'Oração da manhã', 'Senhor, ao começar este dia, eu vos agradeço.', 'diarias'),
    oracao('lembrai-vos', 'Lembrai-vos (Memorare)', 'Lembrai-vos, ó piedosíssima Virgem Maria.', 'marianas'),
    {
      ...base, kind: 'texto', slug: 'agostinho-tarde-te-amei', title: 'Tarde te amei', category: 'agostinho',
      body: 'Tarde te amei, ó Beleza tão antiga e tão nova, tarde te amei!',
      author: 'Santo Agostinho (354–430)', origin: 'Confissões, livro X',
    },
    {
      ...base, kind: 'santo', slug: '10-01', title: 'Santa Teresinha do Menino Jesus', category: 'outubro',
      body: 'Carmelita francesa que morreu aos 24 anos e é doutora da Igreja.', data: { date: '10-01' },
    },
    {
      ...base, kind: 'misterio', slug: 'gozosos', title: 'Mistérios Gozosos', category: 'tercos', body: 'Mistérios gozosos',
      data: {
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        mysteries: ['A Anunciação', 'A Visitação', 'O Nascimento', 'A Apresentação', 'O Encontro no Templo'].map((title) => ({
          title, fruit: 'Humildade', meditation: `Meditação: ${title}`,
        })),
      },
    },
    {
      ...base, kind: 'novena', slug: 'novena-de-teste', title: 'Novena de Teste', category: 'novenas', body: 'Nove dias de oração.',
      data: {
        days: Array.from({ length: 9 }, (_, i) => ({ title: `Tema ${i + 1}`, text: `Texto do dia ${i + 1}` })),
        final_prayer: 'Oração final da novena',
      },
    },
  ]
  for (const item of items) await call('/gestor/conteudos', { method: 'POST', token, body: JSON.stringify(item) })
}
