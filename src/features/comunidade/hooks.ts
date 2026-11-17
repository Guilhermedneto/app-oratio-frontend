import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/api/client'
import type { NewRequests, PrayerFeed } from '@/api/types'
import { useAuth } from '@/features/conta/auth'
import { createStore } from '@/offline/store'

/** Último total de orações que o autor já "viu subir", por pedido (para animar só o que é novo). */
export const prayerSeenStore = createStore<Record<string, number>>('prayer-seen', {})

export type FeedTab = 'todos' | 'meus'

export function useFeed(tab: FeedTab, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['comunidade', tab],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '20' })
      if (pageParam) qs.set('before', pageParam)
      if (tab === 'meus') qs.set('mine', 'true')
      return api.get<PrayerFeed>(`/comunidade/pedidos?${qs}`)
    },
    getNextPageParam: (last) => last.next_before ?? undefined,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 0, // ao abrir, mostra o último feed salvo e atualiza na hora
    gcTime: 14 * 86_400_000,
    networkMode: 'offlineFirst',
  })
}

/** Consulta periódica (60 s e ao voltar o foco) por pedidos novos de outras pessoas. */
export function useNewRequests() {
  const { status } = useAuth()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['comunidade-novos'],
    enabled: status === 'authed',
    queryFn: () => api.get<NewRequests>('/comunidade/novos'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    networkMode: 'online',
  })
  useEffect(() => {
    if (status !== 'authed') qc.removeQueries({ queryKey: ['comunidade-novos'] })
  }, [status, qc])
  return query.data
}

export async function markSeen(qc: ReturnType<typeof useQueryClient>) {
  await api.post('/comunidade/visto').catch(() => undefined)
  qc.setQueryData<NewRequests>(['comunidade-novos'], { count: 0, latest_id: null, latest_text: null })
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}
