import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contentIndex, loadDoc, type Folder } from '@/content/loader'
import { useFavorites } from '@/features/favoritos/useFavorites'
import type { FavoriteItem } from '@/offline/stores'
import { Markdown } from '@/shared/ui/Markdown'
import { Page } from '@/shared/ui/Page'
import { Empty, Row, Section } from '@/shared/ui/controls'
import { IconHeart, IconSearch } from '@/shared/ui/icons'
import { useAsync } from '@/shared/utils'
import { KIND_OF_FOLDER, saintDate, useCategories, useManagedContents } from './managed'

export const CATEGORY_LABEL: Record<string, string> = {
  basicas: 'Orações básicas',
  marianas: 'Marianas',
  diarias: 'Do dia a dia',
  devocionais: 'Devoções',
  ladainhas: 'Ladainhas',
  penitencia: 'Penitência',
  missa: 'Missa',
  adoracao: 'Adoração',
  horas: 'Liturgia das Horas',
  reflexao: 'Reflexões',
  'espirito-santo': 'Espírito Santo',
  eucaristia: 'Eucaristia',
  falecidos: 'Pelos falecidos',
  familia: 'Família',
  confianca: 'Confiança e gratidão',
  igreja: 'Igreja',
  santos: 'Orações de santos',
  'vida-de-oracao': 'Vida de oração',
  virtudes: 'Virtudes',
  tempos: 'Tempos litúrgicos',
  agostinho: 'Santo Agostinho',
  teresa: 'Santa Teresa de Ávila',
  francisco: 'São Francisco de Assis',
  kempis: 'Tomás de Kempis',
  crisostomo: 'São João Crisóstomo',
  sales: 'São Francisco de Sales',
  teresinha: 'Santa Teresinha',
  'joao-da-cruz': 'São João da Cruz',
  bento: 'São Bento',
  inacio: 'Santo Inácio de Loyola',
  bernardo: 'São Bernardo',
  catarina: 'Santa Catarina de Sena',
  basilio: 'São Basílio Magno',
  leao: 'São Leão Magno',
  irineu: 'Santo Ireneu',
  antonio: 'Santo Antônio de Pádua',
  clara: 'Santa Clara',
  vianney: 'São João Maria Vianney',
  newman: 'São John Henry Newman',
  jeronimo: 'São Jerônimo',
  pascal: 'Blaise Pascal',
  tercos: 'Terços e devoções',
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface ListProps {
  folder: Folder | 'terco'
  title: string
  base: string
  search?: boolean
  back?: boolean
  subtitle?: string
  notice?: string
}

interface Entry {
  slug: string
  titulo: string
  categoria: string
  order?: string
}

const FAV_TYPE: Partial<Record<Folder | 'terco', FavoriteItem['item_type']>> = {
  oracoes: 'oracao',
  ritos: 'rito',
  reflexoes: 'reflexao',
  textos: 'reflexao',
}

/** Itens estáticos (empacotados) + os cadastrados pelo gestor para o mesmo tipo. */
function useEntries(folder: Folder | 'terco'): { entries: Entry[]; label: (cat: string) => string; loading: boolean } {
  const query = useManagedContents()
  const managed = query.data
  const cats = useCategories().data
  const kind = KIND_OF_FOLDER[folder]
  const entries = useMemo<Entry[]>(() => {
    const fixed: Entry[] = folder === 'terco' ? [] : contentIndex[folder]
    const extra: Entry[] = (managed ?? [])
      .filter((m) => m.kind === kind)
      .map((m) => ({ slug: m.slug, titulo: m.title, categoria: m.category, order: saintDate(m) ?? undefined }))
    const merged = [...fixed, ...extra]
    return folder === 'santos'
      ? merged.sort((a, b) => (a.order ?? a.slug).localeCompare(b.order ?? b.slug) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      : merged.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  }, [folder, managed, kind])
  const label = (cat: string) => CATEGORY_LABEL[cat] ?? cats?.find((c) => c.slug === cat)?.name ?? cat
  return { entries, label, loading: query.isPending }
}

export function DocList({ folder, title, base, search, back, subtitle, notice }: ListProps) {
  const [q, setQ] = useState('')
  const { has } = useFavorites()
  const { entries: items, label, loading } = useEntries(folder)
  const filtered = useMemo(() => {
    const n = norm(q.trim())
    return n ? items.filter((d) => norm(d.titulo).includes(n)) : items
  }, [items, q])
  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const d of filtered) m.set(d.categoria, [...(m.get(d.categoria) ?? []), d])
    return [...m.entries()]
  }, [filtered])
  const favType = FAV_TYPE[folder] ?? null
  const showHeaders = new Set(items.map((d) => d.categoria)).size > 1

  return (
    <Page title={title} subtitle={subtitle} back={back}>
      {search && (
        <label className="search" style={{ margin: '0 0 8px' }}>
          <IconSearch aria-hidden />
          <span className="sr-only">Buscar</span>
          <input type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      )}
      {notice && <p className="notice" data-kind="warn">{notice}</p>}
      {filtered.length === 0 && loading && <Empty>Carregando…</Empty>}
      {filtered.length === 0 && !loading && <Empty>{q ? `Nenhum resultado para “${q}”.` : 'Nada por aqui ainda.'}</Empty>}
      {groups.map(([cat, docs]) => (
        <Section key={cat} header={showHeaders ? label(cat) : undefined}>
          {docs.map((d) => (
            <Row
              key={d.slug}
              to={`${base}/${d.slug}`}
              title={d.titulo}
              trailing={
                favType && has(favType, d.slug) ? <IconHeart filled width={16} height={16} style={{ color: 'var(--accent)' }} /> : undefined
              }
            />
          ))}
        </Section>
      ))}
    </Page>
  )
}

export function DocView({ folder, backLabel }: { folder: Folder | 'terco'; backLabel: string }) {
  const { slug = '' } = useParams()
  const { has, toggle } = useFavorites()
  const managedQuery = useManagedContents()
  const staticMeta = folder === 'terco' ? undefined : contentIndex[folder].find((d) => d.slug === slug)
  const managed = staticMeta ? undefined : managedQuery.data?.find((m) => m.slug === slug && m.kind === KIND_OF_FOLDER[folder])
  const doc = useAsync(
    () => (staticMeta && folder !== 'terco' ? loadDoc(folder, slug) : Promise.resolve(null)),
    [folder, slug, Boolean(staticMeta)],
  )
  const favType = FAV_TYPE[folder] ?? null
  const title = staticMeta?.titulo ?? managed?.title
  const body = managed?.body ?? doc.data
  const waiting = !staticMeta && !managed && managedQuery.isPending
  const fav = favType ? has(favType, slug) : false

  return (
    <Page
      title={title ?? (waiting ? 'Carregando…' : 'Não encontrado')}
      back={backLabel}
      trailing={
        favType && title ? (
          <button
            className="link-btn"
            onClick={() => toggle(favType, slug)}
            aria-pressed={fav}
            aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <IconHeart filled={fav} width={24} height={24} />
          </button>
        ) : undefined
      }
    >
      {(doc.loading || waiting) && !body && <Empty>Carregando…</Empty>}
      {!doc.loading && !waiting && !body && <Empty>Conteúdo não encontrado.</Empty>}
      {body && (
        <article className="prose card" style={{ padding: '18px 18px 22px' }}>
          <Markdown source={body} />
          {managed && (managed.author || managed.origin || managed.source_url) && (
            <footer className="source-note">
              {managed.author && <p>Autor: {managed.author}</p>}
              {managed.origin && <p>Origem: {managed.origin}</p>}
              {managed.source_url && /^https?:/i.test(managed.source_url) && (
                <p>
                  <a href={managed.source_url} target="_blank" rel="noopener noreferrer">
                    Ver fonte
                  </a>
                </p>
              )}
            </footer>
          )}
        </article>
      )}
    </Page>
  )
}
