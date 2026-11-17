import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiturgyDay } from '@/api/types'

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

  it('mostra a reflexão do dia com link para o texto completo', async () => {
    serve(day())
    renderHoje()
    expect(await screen.findByText('Para refletir hoje')).toBeInTheDocument()
    expect(screen.getByText('Inquieto está o coração')).toBeInTheDocument()
    expect(await screen.findByText('Texto de reflexão.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ler completo' })).toHaveAttribute('href', '/mais/textos/agostinho-x')
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
