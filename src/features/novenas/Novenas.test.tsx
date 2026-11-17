import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { novenasStore, queueStore } from '@/offline/stores'

const get = vi.fn()
vi.mock('@/api/client', () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  getAccessToken: () => null,
  ApiError: class ApiError extends Error {},
  NetworkError: class NetworkError extends Error {},
}))

import { NovenaView, Novenas } from './Novenas'

const novena = {
  id: 'n1',
  slug: 'minha-novena',
  kind: 'novena',
  title: 'Novena de Teste',
  category: 'novenas',
  body: 'Nove dias de oração.',
  author: null,
  origin: null,
  source_url: null,
  published: true,
  updated_at: '2026-01-01T00:00:00Z',
  data: {
    days: Array.from({ length: 9 }, (_, i) => ({ title: `Tema ${i + 1}`, text: `Texto do dia ${i + 1}` })),
    final_prayer: 'Oração final de teste',
  },
}

const wrap = (initial: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/novenas" element={<Novenas />} />
          <Route path="/novenas/:slug" element={<NovenaView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('Novenas cadastradas pelo gestor', () => {
  beforeEach(async () => {
    get.mockReset()
    get.mockImplementation(async (path: string) => (path === '/conteudos' ? [novena] : []))
    await Promise.all([novenasStore.reset(), queueStore.reset()])
  })

  it('lista só as novenas cadastradas e avisa quando não há nenhuma', async () => {
    wrap('/novenas')
    expect(await screen.findByText('Novena de Teste')).toBeInTheDocument()
    get.mockImplementation(async () => [])
    wrap('/novenas')
    expect(await screen.findByText(/Nenhuma novena cadastrada ainda/)).toBeInTheDocument()
  })

  it('começa, avança os dias e conclui', async () => {
    const user = userEvent.setup()
    wrap('/novenas/minha-novena')
    await user.click(await screen.findByRole('button', { name: 'Começar novena hoje' }))
    expect(screen.getByRole('heading', { name: 'Tema 1' })).toBeInTheDocument()
    expect(screen.getByText('Texto do dia 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir o dia 1' }))
    expect(screen.getByRole('heading', { name: 'Tema 2' })).toBeInTheDocument()
    expect(novenasStore.get()[0]).toMatchObject({ novena_slug: 'minha-novena', current_day: 2 })
    novenasStore.set((l) => l.map((n) => ({ ...n, current_day: 9 })))
    await user.click(await screen.findByRole('button', { name: 'Concluir novena' }))
    await waitFor(() => expect(novenasStore.get()[0].completed).toBe(true))
    expect(screen.getByText('Oração final de teste')).toBeInTheDocument()
  })

  it('novena inexistente mostra aviso', async () => {
    wrap('/novenas/nao-existe')
    expect(await screen.findByText('Novena não encontrada.')).toBeInTheDocument()
  })
})
