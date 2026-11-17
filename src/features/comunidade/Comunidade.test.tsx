import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrayerRequest } from '@/api/types'

const put = vi.fn()
const del = vi.fn()
const get = vi.fn()
const post = vi.fn()
vi.mock('@/api/client', () => ({
  api: {
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
  },
  ApiError: class ApiError extends Error {},
  NetworkError: class NetworkError extends Error {},
}))

import { PedidoCard } from './PedidoCard'
import { MAX_BURST, Rising } from './Rising'
import { prayerSeenStore } from './hooks'

const req = (over: Partial<PrayerRequest> = {}): PrayerRequest => ({
  id: 'r1',
  text: 'Peço orações pela saúde do meu pai.',
  author_name: 'Ana',
  mine: false,
  created_at: new Date().toISOString(),
  prayed_count: 0,
  comment_count: 0,
  i_prayed: false,
  ...over,
})

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

const mockMotion = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced && q.includes('reduce'),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))

describe('Mãos unidas subindo', () => {
  beforeEach(() => {
    mockMotion(false)
  })

  it('solta no máximo 12 emojis por vez', async () => {
    const { container } = render(<Rising trigger={{ key: 1, count: 40 }} />)
    await waitFor(() => expect(container.querySelectorAll('span span')).toHaveLength(MAX_BURST))
    expect(container.textContent).toContain('🙏')
  })

  it('não anima com movimento reduzido', () => {
    mockMotion(true)
    const { container } = render(<Rising trigger={{ key: 1, count: 5 }} />)
    expect(container.querySelector('[data-testid="rising"]')).toBeNull()
  })

  it('não solta nada quando não há orações novas', () => {
    const { container } = render(<Rising trigger={{ key: 1, count: 0 }} />)
    expect(container.querySelector('[data-testid="rising"]')).toBeNull()
  })
})

describe('Cartão de pedido', () => {
  beforeEach(async () => {
    mockMotion(false)
    put.mockReset()
    del.mockReset()
    get.mockReset()
    post.mockReset()
    await prayerSeenStore.reset()
  })

  it('mostra o texto do pedido como texto, sem interpretar HTML', () => {
    const { container } = wrap(<PedidoCard request={req({ text: '<img src=x onerror=alert(1)> oração' })} moderator={false} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/<img src=x onerror=alert\(1\)> oração/)).toBeInTheDocument()
  })

  it('pedido anônimo não mostra nome', () => {
    wrap(<PedidoCard request={req({ author_name: null })} moderator={false} />)
    expect(screen.getByText('Anônimo')).toBeInTheDocument()
  })

  it('"Orar" marca, atualiza o contador e solta as mãos unidas', async () => {
    put.mockResolvedValue({ prayed_count: 1, i_prayed: true })
    const { container } = wrap(<PedidoCard request={req()} moderator={false} />)
    expect(screen.getByText('Ninguém orou ainda')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Orar/ }))
    expect(put).toHaveBeenCalledWith('/comunidade/pedidos/r1/oracao', {})
    expect(await screen.findByText('1 pessoa orou 🙏')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Orei/ })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(container.querySelector('[data-testid="rising"]')).not.toBeNull())
  })

  it('o autor vê subirem as orações novas desde a última visita (e só uma vez)', async () => {
    prayerSeenStore.set(() => ({ r1: 2 }))
    const { container, rerender } = wrap(<PedidoCard request={req({ mine: true, prayed_count: 5 })} moderator={false} />)
    await waitFor(() => expect(container.querySelectorAll('[data-testid="rising"] span')).toHaveLength(3))
    expect(screen.getByText('5 pessoas oraram 🙏')).toBeInTheDocument()
    expect(prayerSeenStore.get().r1).toBe(5)
    // mesma contagem de novo: nada novo para animar
    await act(async () => {
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <PedidoCard request={req({ mine: true, prayed_count: 5 })} moderator={false} />
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    expect(prayerSeenStore.get().r1).toBe(5)
  })

  it('só o autor ou o gestor veem o botão de remover', () => {
    const { rerender } = wrap(<PedidoCard request={req()} moderator={false} />)
    expect(screen.queryByRole('button', { name: /Excluir|Remover/ })).toBeNull()
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <PedidoCard request={req()} moderator />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: 'Remover (gestor)' })).toBeInTheDocument()
  })

  it('carrega e envia comentários', async () => {
    get.mockResolvedValue([{ id: 'c1', text: 'Rezando por vocês', author_name: 'Beatriz', mine: false, created_at: new Date().toISOString() }])
    post.mockResolvedValue({ id: 'c2', text: 'Amém', author_name: 'Eu', mine: true, created_at: new Date().toISOString() })
    wrap(<PedidoCard request={req({ comment_count: 1 })} moderator={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Comentários \(1\)/ }))
    expect(await screen.findByText('Rezando por vocês')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Escrever comentário'), 'Amém')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(post).toHaveBeenCalledWith('/comunidade/pedidos/r1/comentarios', { text: 'Amém' })
    expect(await screen.findByText('Amém')).toBeInTheDocument()
  })
})
