import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '@/api/client'
import { enqueue, flush } from './sync'
import { queueStore } from './stores'

const ok = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('fila de sincronização offline', () => {
  beforeEach(async () => {
    await queueStore.reset()
    setAccessToken(null)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('mantém ações na fila sem login e sem rede', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    enqueue({ type: 'fav-add', body: { item_type: 'oracao', item_slug: 'ave-maria' } })
    await flush()
    expect(queueStore.get()).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('para na falha de rede e reenvia em ordem quando volta', async () => {
    setAccessToken('tok')
    const calls: string[] = []
    let online = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!online) throw new TypeError('offline')
        calls.push(url)
        return ok({ streak: 2 })
      }),
    )
    enqueue({ type: 'rosary', body: { client_id: 'c1', date: '2026-05-10', mystery_set: 'gozosos', completed: true } })
    enqueue({ type: 'novena', body: { novena_slug: 'sao-jose', started_on: '2026-03-10', current_day: 2, completed: false } })
    await flush()
    expect(queueStore.get()).toHaveLength(2)
    online = true
    await flush()
    expect(queueStore.get()).toHaveLength(0)
    expect(calls).toEqual(['/api/me/rosario', '/api/me/novenas'])
  })

  it('descarta ações rejeitadas pelo servidor (4xx) sem travar a fila', async () => {
    setAccessToken('tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.includes('intencoes') ? ok({ detail: 'não existe' }, 404) : ok({}))),
    )
    enqueue({ type: 'intention-patch', body: { id: 'x', answered: true } })
    enqueue({ type: 'fav-add', body: { item_type: 'oracao', item_slug: 'credo' } })
    await flush()
    expect(queueStore.get()).toHaveLength(0)
  })

  it('renova o token uma vez ao receber 401', async () => {
    setAccessToken('velho')
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        seen.push(`${init.method} ${url}`)
        if (url === '/api/auth/refresh') return ok({ access_token: 'novo', token_type: 'bearer', user: {} })
        const auth = (init.headers as Record<string, string>).Authorization
        return auth === 'Bearer novo' ? ok({ streak: 1 }) : ok({ detail: 'x' }, 401)
      }),
    )
    enqueue({ type: 'rosary', body: { client_id: 'c2', date: '2026-05-10', mystery_set: 'gozosos', completed: true } })
    await flush()
    expect(queueStore.get()).toHaveLength(0)
    expect(seen.filter((s) => s.includes('refresh'))).toHaveLength(1)
  })
})
