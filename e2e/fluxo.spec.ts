import { expect, test, type Page } from '@playwright/test'

const SENHA = 'senha-forte-123'
let seq = 0

/** Cria uma conta pela API; o cookie de sessão fica no contexto e o app abre já logado. */
async function entrar(page: Page, name = 'Teste E2E'): Promise<string> {
  const email = `e2e-${Date.now()}-${++seq}@example.com`
  const r = await page.context().request.post('/api/auth/register', { data: { email, password: SENHA, name } })
  expect(r.status()).toBe(201)
  return email
}

test('sem login o app não abre: só a tela de entrada aparece', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Oratio', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Continuar sem conta/ })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0)
  // rotas internas também pedem login
  await page.goto('/oracoes')
  await expect(page.getByRole('heading', { name: 'Oratio', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Orações', level: 1 })).toHaveCount(0)
})

test('cria conta pela tela de entrada e é saudado pelo primeiro nome', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar conta' }).first().click()
  await page.getByLabel('Nome').fill('Maria da Silva')
  await page.getByLabel('E-mail').fill(`maria-${Date.now()}@example.com`)
  await page.getByLabel('Senha').fill(SENHA)
  await page.locator('form').getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Hoje', level: 1 })).toBeVisible()
  await expect(page.getByText(/Olá, Maria!/)).toBeVisible()
})

test('entra com e-mail e senha, e sair volta para a tela de entrada', async ({ page }) => {
  const email = await entrar(page, 'João Pedro')
  await page.context().clearCookies() // simula outro aparelho
  await page.goto('/')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(SENHA)
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/Olá, João!/)).toBeVisible()

  await page.goto('/mais/conta')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Oratio', level: 1 })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Oratio', level: 1 })).toBeVisible() // sessão encerrada de verdade
})

test('senha errada mostra erro e não entra', async ({ page }) => {
  const email = await entrar(page)
  await page.context().clearCookies()
  await page.goto('/')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-errada-1')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hoje', level: 1 })).toHaveCount(0)
})

test('mostra a liturgia, reza o terço e conclui', async ({ page }) => {
  await entrar(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hoje', level: 1 })).toBeVisible()
  await expect(page.getByText(/Tempo|Advento|Quaresma|Páscoa|Natal|Tríduo/).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Leituras', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Terço', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Terço', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: /^Rezar Mistérios/ }).click()
  await expect(page).toHaveURL(/\/terco\/rezar/)
  await expect(page.getByRole('heading', { name: 'Sinal da Cruz' })).toBeVisible()

  const next = page.getByRole('button', { name: 'Próxima' })
  for (let i = 0; i < 79; i++) await next.click()
  await expect(page.getByRole('button', { name: 'Concluir terço' })).toBeVisible()
  await page.getByRole('button', { name: 'Concluir terço' }).click()
  await expect(page).toHaveURL(/\/terco$/)
  await expect(page.getByLabel('1 dias seguidos')).toBeVisible()
})

test('retoma o terço do ponto onde parou', async ({ page }) => {
  await entrar(page)
  await page.goto('/terco')
  await page.getByRole('button', { name: /^Rezar Mistérios/ }).click()
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Próxima' }).click()
  await page.getByRole('button', { name: 'Sair e salvar o ponto' }).click()
  await expect(page.getByText('Retomar terço')).toBeVisible()
  await page.getByRole('link', { name: /Continuar de onde parei/ }).click()
  await expect(page.getByText(/Dezena 1 de 5/)).toBeVisible()
})

test('quem já entrou abre o app e lê as orações mesmo offline', async ({ page, context }) => {
  await entrar(page)
  await page.goto('/')
  await expect(page.getByText('Leituras', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // garante o app shell e os dados salvos no aparelho
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.getByRole('link', { name: 'Orações' }).click()
  await page.getByRole('link', { name: 'Pai-Nosso' }).click()
  await expect(page.getByText(/Pai nosso, que estais nos céus/)).toBeVisible()

  await page.waitForTimeout(2000) // dá tempo de o cache de dados ser salvo no aparelho
  await context.setOffline(true)
  await page.goto('/oracoes')
  await expect(page.getByRole('heading', { name: 'Orações', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Ave-Maria' }).click()
  await expect(page.getByText(/cheia de graça/)).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hoje', level: 1 })).toBeVisible()
  await expect(page.getByText(/offline/i).first()).toBeVisible()
  await context.setOffline(false)
})

test('favorito sincroniza com a conta', async ({ page }) => {
  await entrar(page)
  await page.goto('/oracoes/credo')
  await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
  await page.goto('/mais/favoritos')
  await expect(page.getByRole('link', { name: 'Credo' })).toBeVisible()
})

test('conteúdo cadastrado: santos, textos dos grandes nomes e reflexão do dia', async ({ page }) => {
  await entrar(page)
  await page.goto('/')
  await expect(page.getByText('Para refletir hoje')).toBeVisible({ timeout: 15_000 })

  await page.goto('/mais/santos')
  await expect(page.getByRole('heading', { name: 'Santos', level: 1 })).toBeVisible()
  await page.getByRole('searchbox').fill('Teresinha')
  await page.getByRole('link', { name: /Santa Teresinha do Menino Jesus/ }).click()
  await expect(page.getByText(/Carmelita francesa/)).toBeVisible()

  await page.goto('/mais/textos')
  await page.getByRole('searchbox').fill('tarde te amei')
  await page.getByRole('link', { name: 'Tarde te amei' }).click()
  await expect(page.getByText(/Beleza tão antiga e tão nova/)).toBeVisible()
  await expect(page.getByText(/Santo Agostinho \(354–430\)/)).toBeVisible()

  await page.goto('/oracoes')
  await page.getByRole('searchbox').fill('lembrai')
  await page.getByRole('link', { name: /Lembrai-vos/ }).click()
  await expect(page.getByText(/piedosíssima Virgem Maria/)).toBeVisible()
})

test('novena cadastrada pelo gestor: começar e avançar o dia', async ({ page }) => {
  await entrar(page)
  await page.goto('/novenas')
  await page.getByRole('link', { name: /Novena de Teste/ }).click()
  await page.getByRole('button', { name: 'Começar novena hoje' }).click()
  await expect(page.getByRole('heading', { name: 'Tema 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Concluir o dia 1' }).click()
  await expect(page.getByRole('heading', { name: 'Tema 2' })).toBeVisible()
})
