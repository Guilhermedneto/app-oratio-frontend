import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiturgyDay } from '@/api/types'
import { isoDate } from '@/shared/utils'

const get = vi.fn()
vi.mock('@/api/client', () => ({
  api: { get: (...a: unknown[]) => get(...a) },
}))
vi.mock('@/content/loader', () => ({
  loadSaint: async () => null,
  loadDoc: async () => 'Texto de reflexão.\n\nSegundo parágrafo.',
  contentIndex: {
    textos: [{ slug: 'agostinho-x', titulo: 'Inquieto está o coração', categoria: 'agostinho', versao: '1' }],
    reflexoes: [],
  },
}))

import Hoje from './Hoje'

const day = (over: Partial<LiturgyDay> = {}): LiturgyDay => ({
  date: '2026-11-16',
  season: 'comum',
  season_label: 'Tempo Comum',
  week: 33,
  color: 'verde',
  celebration: 'Segunda-feira da 33ª semana do Tempo Comum',
  rank: 'feria',
  cycle_sunday: 'A',
  cycle_weekday: 'II',
  status: 'ok',
  source: 'cnbb',
  credits: 'Texto: CNBB, via Edições CNBB',
  prayers: [
    { kind: 'antifona_entrada', title: 'Antífona de entrada', text: 'Texto da entrada' },
    { kind: 'coleta', title: 'Oração do dia (coleta)', text: 'Texto da coleta' },
    { kind: 'oferendas', title: 'Oração sobre as oferendas', text: 'Texto das oferendas' },
  ],
  readings: [{ kind: 'evangelho', reference: 'Lc 18,35-43', title: 'Evangelho', text: 'Texto do evangelho' }],
  ...over,
})

/** Responde a liturgia do dia; o conteúdo do gestor e as categorias vêm vazios. */
const serve = (value: LiturgyDay) =>
  get.mockImplementation(async (path: string) => (path === '/conteudos' || path === '/categorias' ? [] : value))

const renderHoje = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Hoje />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('Hoje', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('mostra tempo, cor, celebração, leituras e créditos', async () => {
    serve(day())
    renderHoje()
    expect(await screen.findByText(/Segunda-feira da 33ª semana/)).toBeInTheDocument()
    expect(screen.getByText(/Tempo Comum · 33ª semana · Cor verde/)).toBeInTheDocument()
    expect(screen.getByText('Texto do evangelho')).toBeInTheDocument()
    expect(screen.getByText('Texto: CNBB, via Edições CNBB')).toBeInTheDocument()
  })

  it('mostra as orações do dia, abrindo cada uma ao tocar', async () => {
    serve(day())
    renderHoje()
    expect(await screen.findByText('Ritos iniciais')).toBeInTheDocument()
    expect(screen.getByText('Liturgia eucarística e comunhão')).toBeInTheDocument()
    expect(screen.queryByText('Texto da coleta')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Oração do dia \(coleta\)/ }))
    expect(screen.getByText('Texto da coleta')).toBeInTheDocument()
  })

  it('mostra só o título da reflexão do dia, e o card inteiro leva ao texto', async () => {
    serve(day())
    renderHoje()
    const card = await screen.findByRole('link', { name: /Para refletir hoje/ })
    expect(card).toHaveAttribute('href', '/mais/textos/agostinho-x')
    expect(card).toHaveTextContent('Inquieto está o coração')
    expect(screen.queryByText('Texto de reflexão.')).not.toBeInTheDocument()
    expect(screen.queryByText('Ler completo')).not.toBeInTheDocument()
  })

  it('mostra o santo do dia cadastrado pelo gestor e o card leva à página dele', async () => {
    const today = isoDate().slice(5)
    const santo = { id: '1', slug: 'santa-x', kind: 'santo', title: 'Santa X', category: 'santos', body: 'Bio.', data: { date: today } }
    get.mockImplementation(async (path: string) =>
      path === '/conteudos' ? [santo] : path === '/categorias' ? [] : day({ rank: 'feria' }),
    )
    renderHoje()
    const card = await screen.findByRole('link', { name: /Santo do dia/ })
    expect(card).toHaveAttribute('href', '/mais/santos/santa-x')
    expect(card).toHaveTextContent('Santa X')
  })

  it('mostra os atalhos deslizantes, inclusive os pedidos de oração', async () => {
    serve(day())
    renderHoje()
    const nav = await screen.findByRole('navigation', { name: 'Rezar agora' })
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/terco', '/oracoes/oracao-da-manha', '/oracoes/oracao-da-noite', '/mais/comunidade'])
  })

  it('avisa quando as leituras estão indisponíveis, mantendo tempo e cor', async () => {
    serve(day({ status: 'partial', readings: [], source: null, credits: null }))
    renderHoje()
    expect((await screen.findAllByText(/Tempo Comum/)).length).toBeGreaterThan(0)
    expect(screen.getByText('Leituras indisponíveis no momento.')).toBeInTheDocument()
  })

  it('sem API e sem cache mostra erro amigável com atalhos que funcionam offline', async () => {
    get.mockRejectedValue(new Error('offline'))
    renderHoje()
    expect(await screen.findByText(/Não foi possível carregar a liturgia/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Terço do dia/ })).toBeInTheDocument()
  })
})
