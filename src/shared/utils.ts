import { useEffect, useState } from 'react'

export function isoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatLong(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseISO(iso))
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Dias consecutivos terminando hoje (ou ontem, se hoje ainda não foi rezado). */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Carrega dados assíncronos (conteúdo empacotado) com estado de erro. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: boolean }>({
    data: undefined,
    loading: true,
    error: false,
  })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: false }))
    fn()
      .then((data) => alive && setState({ data, loading: false, error: false }))
      .catch(() => alive && setState({ data: undefined, loading: false, error: true }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export const RANK_LABEL: Record<string, string> = {
  solenidade: 'Solenidade',
  festa: 'Festa',
  memoria: 'Memória',
  memoria_facultativa: 'Memória facultativa',
  domingo: 'Domingo',
  feria: 'Féria',
}
