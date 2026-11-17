import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('@/api/client', () => ({
  api: { post: vi.fn() },
  refreshSession: () => refresh(),
  setAccessToken: () => undefined,
  setSessionLostHandler: () => undefined,
  getAccessToken: () => null,
  ApiError: class ApiError extends Error {},
  NetworkError: class NetworkError extends Error {},
}))
vi.mock('@/offline/sync', () => ({ flush: async () => undefined, syncAfterLogin: async () => undefined }))

import { AuthProvider, firstName, useAuth } from './auth'

const user = { id: 'u1', email: 'a@b.com', name: 'Maria da Silva', role: 'user' as const }

function Probe() {
  const { status, user: u } = useAuth()
  return (
    <p>
      {status}:{firstName(u) ?? '-'}
    </p>
  )
}
const show = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('sessão obrigatória', () => {
  beforeEach(() => {
    refresh.mockReset()
    localStorage.clear()
  })

  it('primeiro nome para a saudação', () => {
    expect(firstName(user)).toBe('Maria')
    expect(firstName({ ...user, name: '  João   Pedro ' })).toBe('João')
    expect(firstName(null)).toBeNull()
  })

  it('sessão válida: entra e guarda o perfil no aparelho', async () => {
    refresh.mockResolvedValue({ access_token: 't', token_type: 'bearer', user })
    show()
    expect(await screen.findByText('authed:Maria')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('oratio-user') ?? '{}').name).toBe('Maria da Silva')
  })

  it('servidor recusa a sessão: exige entrar de novo e apaga o perfil guardado', async () => {
    localStorage.setItem('oratio-user', JSON.stringify(user))
    refresh.mockResolvedValue(null)
    show()
    expect(await screen.findByText('anon:-')).toBeInTheDocument()
    expect(localStorage.getItem('oratio-user')).toBeNull()
  })

  it('sem conexão e já tendo entrado antes: abre o app com o perfil salvo', async () => {
    localStorage.setItem('oratio-user', JSON.stringify(user))
    refresh.mockRejectedValue(new Error('offline'))
    show()
    await waitFor(() => expect(screen.getByText('authed:Maria')).toBeInTheDocument())
  })

  it('sem conexão e sem nunca ter entrado: continua pedindo login', async () => {
    refresh.mockRejectedValue(new Error('offline'))
    show()
    expect(await screen.findByText('anon:-')).toBeInTheDocument()
  })
})
