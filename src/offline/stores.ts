import { createStore } from './store'

export type Theme = 'auto' | 'claro' | 'escuro' | 'sepia'

export interface LocalSettings {
  theme: Theme
  fontScale: number
  notifyTime: string | null
  timezone: string
  notifyCommunity: boolean
}

export interface FavoriteItem {
  item_type: 'oracao' | 'novena' | 'rito' | 'reflexao'
  item_slug: string
}

export interface NovenaState {
  novena_slug: string
  started_on: string
  current_day: number
  completed: boolean
}

export interface RosaryEntry {
  client_id: string
  date: string
  mystery_set: string
  completed: boolean
}

export interface RosaryProgress {
  setId: string
  index: number
  date: string
}

export interface IntentionItem {
  id: string
  text: string
  created_at: string
  answered_at: string | null
}

export type SyncOp =
  | { id: string; type: 'rosary'; body: RosaryEntry }
  | { id: string; type: 'novena'; body: NovenaState }
  | { id: string; type: 'fav-add'; body: FavoriteItem }
  | { id: string; type: 'fav-del'; body: FavoriteItem }
  | { id: string; type: 'intention-create'; body: { id: string; text: string } }
  | { id: string; type: 'intention-patch'; body: { id: string; text?: string; answered?: boolean } }
  | { id: string; type: 'intention-delete'; body: { id: string } }
  | { id: string; type: 'settings'; body: Partial<{
      theme: Theme
      font_scale: number
      notify_time: string | null
      timezone: string
      notify_community: boolean
    }> }

export const settingsStore = createStore<LocalSettings>('settings', {
  theme: 'auto',
  fontScale: 1,
  notifyTime: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
  notifyCommunity: true,
})
export const favoritesStore = createStore<FavoriteItem[]>('favorites', [])
export const novenasStore = createStore<NovenaState[]>('novenas', [])
export const rosaryLogStore = createStore<RosaryEntry[]>('rosary-log', [])
export const rosaryProgressStore = createStore<RosaryProgress | null>('rosary-progress', null)
export const intentionsStore = createStore<IntentionItem[]>('intentions', [])
export const queueStore = createStore<SyncOp[]>('sync-queue', [])
export const serverStreakStore = createStore<number>('server-streak', 0)

export function uid(): string {
  return crypto.randomUUID()
}
