import { expect, test, type Browser, type BrowserContext } from '@playwright/test'
import { E2E } from '../playwright.config'

const GESTOR = E2E.manager
const SENHA = 'senha-forte-123'

/** Cria (ou entra em) uma conta pela API; o cookie de sessão fica no contexto e o app abre logado. */
async function sessao(browser: Browser, email: string, name: string): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL: E2E.web, viewport: { width: 412, height: 915 } })
  const r = await context.request.post('/api/auth/register', { data: { email, password: SENHA, name } })
  if (r.status() === 409) {
    const l = await context.request.post('/api/auth/login', { data: { email, password: SENHA } })
    expect(l.ok()).toBeTruthy()
  } else {
    expect(r.status()).toBe(201)
  }
  return context
}

test('gestor cadastra categoria e conteúdo, comunidade pede/ora/comenta e gestor remove', async ({ browser }) => {
  const id = Date.now()
  const gestor = await sessao(browser, GESTOR, 'Gestor')
  const ana = await sessao(browser, `ana-${id}@example.com`, 'Ana')
  const bia = await sessao(browser, `bia-${id}@example.com`, 'Beatriz')

  // ---- gestor: nova categoria + oração com autor e origem
  const g = await gestor.newPage()
  await g.goto('/mais/gestor')
  await expect(g.getByRole('heading', { name: 'Painel do gestor', level: 1 })).toBeVisible({ timeout: 15_000 })
  await g.getByRole('link', { name: 'Novo conteúdo' }).click()
  const titulo = `Oração teste ${id}`
  const categoria = `Cura e consolo ${id}`
  await g.getByLabel('Título').fill(titulo)
  await g.getByLabel('Categoria', { exact: true }).selectOption({ label: '＋ Nova categoria…' })
  await g.getByLabel('Nome da nova categoria').fill(categoria)
  await g.getByLabel('Autor').fill('Santa Teste')
  await g.getByLabel('Origem').fill('Livro de orações, 1900')
  await g.getByLabel('Texto', { exact: true }).fill('Senhor, **cura** os que sofrem.')
  await g.getByRole('button', { name: 'Salvar' }).click()
  await expect(g.getByText(titulo)).toBeVisible()

  // ---- qualquer usuário vê a oração nova, na categoria nova, com autor e origem
  const a = await ana.newPage()
  await a.goto('/oracoes')
  await a.getByRole('searchbox').fill(String(id))
  await expect(a.getByText(categoria)).toBeVisible({ timeout: 15_000 })
  await a.getByRole('link', { name: titulo }).click()
  await expect(a.getByText('Autor: Santa Teste')).toBeVisible()
  await expect(a.getByText('Origem: Livro de orações, 1900')).toBeVisible()

  // ---- Ana publica um pedido; Bia vê o aviso e ora
  await a.goto('/mais/comunidade')
  await a.getByRole('button', { name: 'Fazer um pedido de oração' }).click()
  const pedido = `Peço orações pela minha família ${id}`
  await a.getByRole('textbox', { name: 'Pedido de oração' }).fill(pedido)
  await a.getByRole('button', { name: 'Publicar pedido' }).click()
  await expect(a.getByText(pedido)).toBeVisible()

  const b = await bia.newPage()
  await b.goto('/mais/comunidade')
  const cartaoB = b.getByRole('article').filter({ hasText: pedido })
  await expect(cartaoB).toBeVisible({ timeout: 15_000 })
  await cartaoB.getByRole('button', { name: /Orar/ }).click()
  await expect(cartaoB.getByText('1 pessoa orou 🙏')).toBeVisible()
  await expect(b.getByTestId('rising').first()).toBeVisible()
  await cartaoB.getByRole('button', { name: /Comentários/ }).click()
  await cartaoB.getByLabel('Escrever comentário').fill('Rezando por vocês, ' + id)
  await cartaoB.getByRole('button', { name: 'Enviar' }).click()
  await expect(cartaoB.getByText('Rezando por vocês, ' + id)).toBeVisible()

  // ---- Ana (autora) vê as mãos unidas subirem e o contador
  await a.reload()
  const cartaoA = a.getByRole('article').filter({ hasText: pedido })
  await expect(cartaoA.getByText('1 pessoa orou 🙏')).toBeVisible({ timeout: 15_000 })
  await expect(a.getByTestId('rising').first()).toBeVisible()

  // ---- gestor remove o comentário fora de conformidade e depois o pedido
  await g.goto('/mais/gestor')
  await g.getByRole('button', { name: 'Moderação' }).click()
  const cartaoG = g.getByRole('article').filter({ hasText: pedido })
  await expect(cartaoG).toBeVisible({ timeout: 15_000 })
  await cartaoG.getByRole('button', { name: /Comentários/ }).click()
  await cartaoG.getByRole('button', { name: 'Remover (gestor)' }).first().click()
  await expect(cartaoG.getByText('Rezando por vocês, ' + id)).toHaveCount(0)
  await cartaoG.getByRole('button', { name: 'Remover (gestor)' }).first().click()
  await expect(g.getByRole('article').filter({ hasText: pedido })).toHaveCount(0)

  // ---- usuário comum não acessa o painel
  await a.goto('/mais/gestor')
  await expect(a.getByText('Acesso restrito ao gestor.')).toBeVisible()

  // ---- limpeza: o gestor apaga o conteúdo de teste
  await g.goto('/mais/gestor')
  g.once('dialog', (d) => void d.accept())
  const linha = g.locator('.manage-row').filter({ hasText: titulo })
  await linha.getByRole('button', { name: 'Excluir' }).click()
  await expect(g.getByText(titulo)).toHaveCount(0)
  await Promise.all([gestor.close(), ana.close(), bia.close()])
})
