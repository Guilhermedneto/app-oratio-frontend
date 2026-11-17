import { contentIndex } from '@/content/loader'
import { useManagedContents } from '@/features/docs/managed'
import { Page } from '@/shared/ui/Page'
import { Empty, Row, Section } from '@/shared/ui/controls'
import { useFavorites } from './useFavorites'

const ROUTE = { oracao: '/oracoes', rito: '/mais/ritos', reflexao: '/mais/reflexoes', novena: '/novenas' } as const

export default function Favoritos() {
  const { items } = useFavorites()
  const managed = useManagedContents().data ?? []
  const find = (type: keyof typeof ROUTE, slug: string): { title: string; to: string } | undefined => {
    if (type === 'novena') {
      const n = managed.find((m) => m.kind === 'novena' && m.slug === slug)
      return n ? { title: n.title, to: `/novenas/${slug}` } : undefined
    }
    if (type === 'reflexao') {
      const r = contentIndex.reflexoes.find((d) => d.slug === slug)
      if (r) return { title: r.titulo, to: `/mais/reflexoes/${slug}` }
      const t = contentIndex.textos.find((d) => d.slug === slug)
      if (t) return { title: t.titulo, to: `/mais/textos/${slug}` }
      const m = managed.find((x) => (x.kind === 'reflexao' || x.kind === 'texto') && x.slug === slug)
      return m ? { title: m.title, to: `${m.kind === 'texto' ? '/mais/textos' : '/mais/reflexoes'}/${slug}` } : undefined
    }
    const folder = type === 'oracao' ? 'oracoes' : 'ritos'
    const d = contentIndex[folder].find((x) => x.slug === slug)
    if (d) return { title: d.titulo, to: `${ROUTE[type]}/${slug}` }
    const m = managed.find((x) => x.kind === (type === 'oracao' ? 'oracao' : 'rito') && x.slug === slug)
    return m ? { title: m.title, to: `${ROUTE[type]}/${slug}` } : undefined
  }
  const rows = items.flatMap((f) => {
    const hit = find(f.item_type, f.item_slug)
    return hit ? [{ f, ...hit }] : []
  })
  return (
    <Page title="Favoritos" back="Mais">
      {rows.length === 0 ? (
        <Empty>Toque no coração em uma oração para guardá-la aqui.</Empty>
      ) : (
        <Section>
          {rows.map(({ f, title, to }) => (
            <Row key={`${f.item_type}/${f.item_slug}`} to={to} title={title} />
          ))}
        </Section>
      )}
    </Page>
  )
}
