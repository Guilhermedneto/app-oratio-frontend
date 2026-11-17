import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Category, ManagedContent } from '@/api/types'
import type { Folder } from '@/content/loader'

export type ContentKind = ManagedContent['kind']

export const KIND_OF_FOLDER: Partial<Record<Folder | 'terco', ContentKind>> = {
  oracoes: 'oracao',
  textos: 'texto',
  reflexoes: 'reflexao',
  ritos: 'rito',
  horas: 'hora',
  santos: 'santo',
  terco: 'terco',
}

export const KIND_LABEL: Record<ContentKind, string> = {
  oracao: 'Oração',
  texto: 'Texto',
  reflexao: 'Reflexão',
  rito: 'Rito',
  terco: 'Terço (roteiro)',
  hora: 'Liturgia das Horas',
  santo: 'Santo',
  novena: 'Novena',
  misterio: 'Mistérios do terço',
}

/** Conteúdos cadastrados pelo gestor: carregados uma vez e disponíveis offline (cache persistido). */
export function useManagedContents() {
  return useQuery({
    queryKey: ['conteudos'],
    queryFn: () => api.get<ManagedContent[]>('/conteudos'),
    staleTime: 60_000,
    gcTime: 14 * 86_400_000,
    networkMode: 'offlineFirst',
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => api.get<Category[]>('/categorias'),
    staleTime: 60_000,
    gcTime: 14 * 86_400_000,
    networkMode: 'offlineFirst',
  })
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// ---- mistérios do terço
export interface MysteryItem {
  title: string
  fruit: string
  meditation: string
}
export interface MysterySet {
  slug: string
  title: string
  weekdays: number[]
  mysteries: MysteryItem[]
}

export function toMysterySet(c: ManagedContent): MysterySet | null {
  if (c.kind !== 'misterio') return null
  const d = obj(c.data)
  const list = Array.isArray(d.mysteries) ? d.mysteries : []
  if (list.length === 0) return null
  return {
    slug: c.slug,
    title: c.title,
    weekdays: Array.isArray(d.weekdays) ? d.weekdays.filter((w): w is number => typeof w === 'number') : [],
    mysteries: list.map((m) => ({
      title: str(obj(m).title),
      fruit: str(obj(m).fruit),
      meditation: str(obj(m).meditation),
    })),
  }
}

export function useMysterySets(): { sets: MysterySet[]; isPending: boolean } {
  const q = useManagedContents()
  const sets = (q.data ?? []).map(toMysterySet).filter((s): s is MysterySet => s !== null)
  return { sets, isPending: q.isPending }
}

/** Conjunto sugerido para o dia da semana (0 = domingo); sem correspondência, o primeiro. */
export function suggestedSet(sets: MysterySet[], weekday: number): MysterySet | undefined {
  return sets.find((s) => s.weekdays.includes(weekday)) ?? sets[0]
}

// ---- novenas
export interface NovenaData {
  slug: string
  title: string
  description: string
  days: { title: string; text: string }[]
  finalPrayer: string
}

export function toNovena(c: ManagedContent): NovenaData | null {
  if (c.kind !== 'novena') return null
  const d = obj(c.data)
  const days = Array.isArray(d.days) ? d.days : []
  if (days.length !== 9) return null
  return {
    slug: c.slug,
    title: c.title,
    description: c.body,
    days: days.map((x, i) => ({ title: str(obj(x).title) || `Dia ${i + 1}`, text: str(obj(x).text) })),
    finalPrayer: str(d.final_prayer),
  }
}

export function useNovenas(): { novenas: NovenaData[]; isPending: boolean } {
  const q = useManagedContents()
  const novenas = (q.data ?? []).map(toNovena).filter((n): n is NovenaData => n !== null)
  return { novenas, isPending: q.isPending }
}

// ---- santos
export function saintDate(c: ManagedContent): string | null {
  const d = str(obj(c.data).date)
  return /^\d{2}-\d{2}$/.test(d) ? d : null
}
