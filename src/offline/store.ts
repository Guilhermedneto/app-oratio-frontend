import { del, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get(): T
  set(update: (prev: T) => T): void
  subscribe(cb: () => void): () => void
  /** Resolve quando o valor salvo no IndexedDB foi carregado. */
  ready: Promise<void>
  reset(): Promise<void>
}

/** Estado local persistido no IndexedDB, observável pela UI. */
export function createStore<T>(key: string, initial: T): Store<T> {
  let value = initial
  const subs = new Set<() => void>()
  const emit = () => subs.forEach((cb) => cb())
  const ready = get<T>(key)
    .then((saved) => {
      if (saved !== undefined) {
        value = saved
        emit()
      }
    })
    .catch(() => undefined)
  return {
    get: () => value,
    set(update) {
      value = update(value)
      void set(key, value).catch(() => undefined)
      emit()
    },
    subscribe(cb) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    ready,
    async reset() {
      value = initial
      await del(key).catch(() => undefined)
      emit()
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
