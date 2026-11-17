import { useStore } from '@/offline/store'
import { enqueue } from '@/offline/sync'
import { favoritesStore, type FavoriteItem } from '@/offline/stores'

export function useFavorites() {
  const items = useStore(favoritesStore)
  const has = (type: FavoriteItem['item_type'], slug: string) =>
    items.some((f) => f.item_type === type && f.item_slug === slug)
  const toggle = (type: FavoriteItem['item_type'], slug: string) => {
    const item = { item_type: type, item_slug: slug }
    if (has(type, slug)) {
      favoritesStore.set((l) => l.filter((f) => !(f.item_type === type && f.item_slug === slug)))
      enqueue({ type: 'fav-del', body: item })
    } else {
      favoritesStore.set((l) => [...l, item])
      enqueue({ type: 'fav-add', body: item })
    }
  }
  return { items, has, toggle }
}
