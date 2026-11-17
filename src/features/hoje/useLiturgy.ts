import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/api/client'
import type { LiturgyDay } from '@/api/types'
import { addDays, isoDate } from '@/shared/utils'

export const liturgyKey = (date: string) => ['liturgia', date] as const

/** Dia litúrgico: abre com o último dado salvo e atualiza em segundo plano (stale-while-revalidate). */
export function useLiturgyDay(date: string) {
  return useQuery({
    queryKey: liturgyKey(date),
    queryFn: () => api.get<LiturgyDay>(`/liturgia/${date}`),
    staleTime: 5 * 60_000,
    gcTime: 14 * 86_400_000,
    networkMode: 'offlineFirst',
  })
}

/** Pré-carga da semana para uso offline; o front só repassa a data, o cálculo é do back. */
export function usePrefetchWeek() {
  const qc = useQueryClient()
  useEffect(() => {
    if (!navigator.onLine) return
    const start = isoDate()
    api
      .get<LiturgyDay[]>(`/liturgia/semana?de=${start}`)
      .then((days) => days.forEach((d) => qc.setQueryData(liturgyKey(d.date), d)))
      .catch(() => undefined)
  }, [qc])
}

export { addDays }
