import { api, ApiError, getAccessToken, NetworkError } from '@/api/client'
import type { FavoriteOut, IntentionOut, MeOut, NovenaOut } from '@/api/types'
import {
  favoritesStore,
  intentionsStore,
  novenasStore,
  queueStore,
  serverStreakStore,
  settingsStore,
  uid,
  type SyncOp,
  type Theme,
} from './stores'

type NewOp = SyncOp extends infer U ? (U extends SyncOp ? Omit<U, 'id'> : never) : never

export function enqueue(op: NewOp) {
  queueStore.set((q) => [...q, { ...op, id: uid() } as SyncOp])
  void flush()
}

async function send(op: SyncOp): Promise<void> {
  switch (op.type) {
    case 'rosary': {
      const r = await api.post<{ streak: number }>('/me/rosario', op.body)
      serverStreakStore.set(() => r.streak)
      return
    }
    case 'novena':
      await api.put('/me/novenas', {
        novena_slug: op.body.novena_slug,
        started_on: op.body.started_on,
        current_day: op.body.current_day,
        completed: op.body.completed,
      })
      return
    case 'fav-add':
      await api.post('/me/favoritos', op.body)
      return
    case 'fav-del':
      await api.delete(`/me/favoritos/${op.body.item_type}/${op.body.item_slug}`)
      return
    case 'intention-create':
      await api.post('/me/intencoes', op.body)
      return
    case 'intention-patch': {
      const { id, ...rest } = op.body
      await api.patch(`/me/intencoes/${id}`, rest)
      return
    }
    case 'intention-delete':
      await api.delete(`/me/intencoes/${op.body.id}`)
      return
    case 'settings':
      await api.patch('/me/settings', op.body)
      return
  }
}

let flushing: Promise<void> | null = null

/** Reenvia a fila em ordem. Para na primeira falha de rede; descarta ações rejeitadas (4xx). */
export function flush(): Promise<void> {
  if (!getAccessToken()) return Promise.resolve()
  flushing ??= (async () => {
    try {
      for (;;) {
        const op = queueStore.get()[0]
        if (!op) break
        try {
          await send(op)
        } catch (e) {
          if (e instanceof NetworkError) break
          if (e instanceof ApiError && e.status === 401) break
          if (e instanceof ApiError && e.status >= 500) break
        }
        queueStore.set((q) => q.filter((o) => o.id !== op.id))
      }
    } finally {
      flushing = null
    }
  })()
  return flushing
}

/** Depois do login: empurra o que existe no aparelho e traz o que existe na conta (união). */
export async function syncAfterLogin(): Promise<void> {
  await Promise.all([
    favoritesStore.ready,
    novenasStore.ready,
    intentionsStore.ready,
    settingsStore.ready,
    queueStore.ready,
  ])
  const queued = new Set(queueStore.get().map((o) => o.type + JSON.stringify(o.body)))
  const push = (op: NewOp) => {
    const key = op.type + JSON.stringify(op.body)
    if (!queued.has(key)) queueStore.set((q) => [...q, { ...op, id: uid() } as SyncOp])
  }
  favoritesStore.get().forEach((f) => push({ type: 'fav-add', body: f }))
  novenasStore.get().forEach((n) => push({ type: 'novena', body: n }))
  intentionsStore.get().forEach((i) => push({ type: 'intention-create', body: { id: i.id, text: i.text } }))
  await flush()
  try {
    await pull()
  } catch {
    /* offline: tenta de novo no próximo início */
  }
}

export async function pull(): Promise<void> {
  const [me, favs, novenas, intentions] = await Promise.all([
    api.get<MeOut>('/me'),
    api.get<FavoriteOut[]>('/me/favoritos'),
    api.get<NovenaOut[]>('/me/novenas'),
    api.get<IntentionOut[]>('/me/intencoes'),
  ])
  serverStreakStore.set(() => me.rosary_streak)
  favoritesStore.set((local) => {
    const keys = new Set(local.map((f) => `${f.item_type}/${f.item_slug}`))
    const extra = favs
      .filter((f) => !keys.has(`${f.item_type}/${f.item_slug}`))
      .map((f) => ({ item_type: f.item_type as 'oracao', item_slug: f.item_slug }))
    return [...local, ...extra]
  })
  novenasStore.set((local) => {
    const byKey = new Map(local.map((n) => [`${n.novena_slug}|${n.started_on}`, n]))
    for (const s of novenas) {
      const key = `${s.novena_slug}|${s.started_on}`
      const cur = byKey.get(key)
      if (!cur || s.current_day > cur.current_day || (s.completed_at && !cur.completed))
        byKey.set(key, {
          novena_slug: s.novena_slug,
          started_on: s.started_on,
          current_day: Math.max(s.current_day, cur?.current_day ?? 1),
          completed: Boolean(s.completed_at) || Boolean(cur?.completed),
        })
    }
    return [...byKey.values()]
  })
  intentionsStore.set((local) => {
    const ids = new Set(local.map((i) => i.id))
    return [...local, ...intentions.filter((i) => !ids.has(i.id))]
  })
  const s = me.settings
  settingsStore.set((cur) => ({
    ...cur,
    theme: s.theme as Theme,
    fontScale: s.font_scale,
    notifyTime: s.notify_time ? s.notify_time.slice(0, 5) : cur.notifyTime,
    timezone: s.timezone,
    notifyCommunity: s.notify_community ?? true,
  }))
}

export function startOnlineSync() {
  const handler = () => void flush()
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
