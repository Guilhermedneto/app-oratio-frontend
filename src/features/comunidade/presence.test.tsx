import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
vi.mock('@/api/client', () => ({
  api: { post: (...a: unknown[]) => post(...a), get: vi.fn() },
  ApiError: class ApiError extends Error {},
  NetworkError: class NetworkError extends Error {},
}))

let status: 'authed' | 'anon' = 'authed'
vi.mock('@/features/conta/auth', () => ({ useAuth: () => ({ status }) }))

import { usePresence } from './hooks'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

describe('usePresence', () => {
  beforeEach(() => {
    post.mockReset()
    status = 'authed'
  })

  it('avisa a API e devolve quantas pessoas estão rezando', async () => {
    post.mockResolvedValue({ online: 7 })
    const { result } = renderHook(() => usePresence(), { wrapper })
    await waitFor(() => expect(result.current).toBe(7))
    expect(post).toHaveBeenCalledWith('/presenca')
  })

  it('sem login não chama a API', () => {
    status = 'anon'
    const { result } = renderHook(() => usePresence(), { wrapper })
    expect(result.current).toBeUndefined()
    expect(post).not.toHaveBeenCalled()
  })
})
