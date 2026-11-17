import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queueStore, rosaryLogStore, rosaryProgressStore } from '@/offline/stores'
import Sessao from './Sessao'
import Terco from './Terco'
import { LAST_INDEX } from './rosary'

const contents = [
  {
    id: '1',
    slug: 'gozosos',
    kind: 'misterio',
    title: 'Mistérios Gozosos',
    category: 'tercos',
    body: 'x',
    author: null,
    origin: null,
    source_url: null,
    published: true,
    updated_at: '2026-01-01T00:00:00Z',
    data: {
      weekdays: [1, 6],
      mysteries: Array.from({ length: 5 }, (_, i) => ({ title: `Mistério ${i + 1}`, fruit: 'f', meditation: 'm' })),
    },
  },
  {
    id: '2',
    slug: 'pai-nosso',
    kind: 'oracao',
    title: 'Pai-Nosso',
    category: 'basicas',
    body: 'Pai nosso, que estais nos céus',
    author: null,
    origin: null,
    source_url: null,
    published: true,
    updated_at: '2026-01-01T00:00:00Z',
    data: null,
  },
]
const get = vi.fn()
vi.mock('@/api/client', () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  getAccessToken: () => null,
  ApiError: class ApiError extends Error {},
  NetworkError: class NetworkError extends Error {},
}))
vi.mock('@/content/loader', () => ({ loadDoc: async () => null }))

const wrap = (initial: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/terco" element={<Terco />} />
          <Route path="/terco/rezar" element={<Sessao />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('Terço', () => {
  beforeEach(async () => {
    get.mockReset()
    get.mockResolvedValue(contents)
    await Promise.all([rosaryProgressStore.reset(), rosaryLogStore.reset(), queueStore.reset()])
  })

  it('oferece retomar do ponto onde parou', async () => {
    rosaryProgressStore.set(() => ({ setId: 'gozosos', index: 20, date: '2026-05-10' }))
    wrap('/terco')
    expect(await screen.findByText('Retomar terço')).toBeInTheDocument()
    expect(screen.getByText(/Dezena 1 de 5/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continuar de onde parei/ })).toBeInTheDocument()
  })

  it('avança, volta e conclui registrando o terço na fila', async () => {
    const user = userEvent.setup()
    rosaryProgressStore.set(() => ({ setId: 'gozosos', index: LAST_INDEX - 1, date: '2026-05-10' }))
    wrap('/terco/rezar')
    expect(await screen.findByRole('heading', { name: 'Oração final' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByRole('heading', { name: 'Sinal da Cruz' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar uma conta' }))
    expect(screen.getByRole('heading', { name: 'Oração final' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await user.click(screen.getByRole('button', { name: 'Concluir terço' }))
    await waitFor(() => expect(rosaryProgressStore.get()).toBeNull())
    expect(rosaryLogStore.get()).toHaveLength(1)
    expect(queueStore.get()[0]).toMatchObject({ type: 'rosary', body: { mystery_set: 'gozosos', completed: true } })
  })

  it('mostra o mistério com meditação ao entrar na dezena', async () => {
    rosaryProgressStore.set(() => ({ setId: 'gozosos', index: 7, date: '2026-05-10' }))
    wrap('/terco/rezar')
    expect(await screen.findByRole('heading', { name: 'Mistério 1' })).toBeInTheDocument()
    expect(screen.getByText('m')).toBeInTheDocument()
  })

  it('sem progresso volta para a lista', async () => {
    wrap('/terco/rezar')
    expect(await screen.findByText(/Reze guiado/)).toBeInTheDocument()
  })
})
