import type { TokenOut } from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Falha de rede (sem resposta do servidor): a ação deve ficar na fila. */
export class NetworkError extends Error {}

let accessToken: string | null = null
let onSessionLost: (() => void) | null = null
let refreshing: Promise<TokenOut | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}
export function getAccessToken() {
  return accessToken
}
export function setSessionLostHandler(cb: (() => void) | null) {
  onSessionLost = cb
}

async function raw(method: string, path: string, body?: unknown, auth = true): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    })
  } catch {
    throw new NetworkError('Sem conexão')
  }
}

/** Renova o access token uma única vez, mesmo com várias chamadas simultâneas. */
export function refreshSession(): Promise<TokenOut | null> {
  refreshing ??= (async () => {
    try {
      const r = await raw('POST', '/auth/refresh', undefined, false)
      if (r.status >= 500) throw new NetworkError('Serviço indisponível')
      if (!r.ok) return null
      const data = (await r.json()) as TokenOut
      accessToken = data.access_token
      return data
    } finally {
      setTimeout(() => (refreshing = null), 0)
    }
  })()
  return refreshing
}

async function parse<T>(r: Response): Promise<T> {
  if (r.status === 204) return undefined as T
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const detail = data && typeof data.detail === 'string' ? data.detail : 'Erro inesperado'
    throw new ApiError(r.status, detail)
  }
  return data as T
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r = await raw(method, path, body)
  if (r.status === 401 && !path.startsWith('/auth/')) {
    const fresh = await refreshSession()
    if (!fresh) {
      accessToken = null
      onSessionLost?.()
      throw new ApiError(401, 'Sessão expirada')
    }
    r = await raw(method, path, body)
  }
  return parse<T>(r)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
