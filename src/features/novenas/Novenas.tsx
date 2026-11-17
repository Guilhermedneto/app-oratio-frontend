import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { NovenaSuggestion } from '@/api/types'
import { useNovenas } from '@/features/docs/managed'
import { useStore } from '@/offline/store'
import { enqueue } from '@/offline/sync'
import { novenasStore, type NovenaState } from '@/offline/stores'
import { Page } from '@/shared/ui/Page'
import { Empty, Row, Section } from '@/shared/ui/controls'
import { isoDate, parseISO } from '@/shared/utils'

const fmt = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(parseISO(iso))

/** Sugestões de início calculadas pelo servidor (só existem para novenas conhecidas, pelo identificador). */
function useSuggestions() {
  return useQuery({
    queryKey: ['novenas-sugestoes', isoDate()],
    queryFn: () => api.get<NovenaSuggestion[]>('/novenas/sugestoes'),
    staleTime: 86_400_000,
    gcTime: 30 * 86_400_000,
    networkMode: 'offlineFirst',
  })
}

export function Novenas() {
  const progress = useStore(novenasStore)
  const sug = useSuggestions()
  const { novenas, isPending } = useNovenas()
  const active = (slug: string) => progress.find((p) => p.novena_slug === slug && !p.completed)
  const startOf = (slug: string) => sug.data?.find((s) => s.slug === slug)?.start ?? '9999'
  const ordered = [...novenas].sort((a, b) => startOf(a.slug).localeCompare(startOf(b.slug)) || a.title.localeCompare(b.title, 'pt-BR'))

  return (
    <Page title="Novenas" subtitle="Nove dias de oração por uma intenção.">
      {!isPending && ordered.length === 0 && <Empty>Nenhuma novena cadastrada ainda. O gestor pode incluí-las no painel.</Empty>}
      {ordered.length > 0 && (
        <Section footer="As datas sugeridas para começar, quando existem, são calculadas pelo servidor.">
          {ordered.map((n) => {
            const a = active(n.slug)
            const s = sug.data?.find((x) => x.slug === n.slug)
            return (
              <Row
                key={n.slug}
                to={`/novenas/${n.slug}`}
                title={n.title}
                detail={a ? `Em andamento · dia ${a.current_day} de 9` : s ? `Sugestão: começar em ${fmt(s.start)}` : undefined}
              />
            )
          })}
        </Section>
      )}
    </Page>
  )
}

export function NovenaView() {
  const { slug = '' } = useParams()
  const progress = useStore(novenasStore)
  const { novenas, isPending } = useNovenas()
  const sug = useSuggestions()
  const n = novenas.find((x) => x.slug === slug)
  const suggestion = sug.data?.find((s) => s.slug === slug)
  const current = progress.find((p) => p.novena_slug === slug && !p.completed)
  const done = progress.filter((p) => p.novena_slug === slug && p.completed).length

  const save = (state: NovenaState) => {
    novenasStore.set((l) => {
      const rest = l.filter((p) => !(p.novena_slug === state.novena_slug && p.started_on === state.started_on))
      return [...rest, state]
    })
    enqueue({ type: 'novena', body: state })
  }
  const start = () => save({ novena_slug: slug, started_on: isoDate(), current_day: 1, completed: false })
  const advance = () => {
    if (!current) return
    if (current.current_day >= 9) save({ ...current, completed: true })
    else save({ ...current, current_day: current.current_day + 1 })
  }

  if (!n && isPending)
    return (
      <Page title="Novena" back="Novenas">
        <Empty>Carregando…</Empty>
      </Page>
    )
  if (!n)
    return (
      <Page title="Novena" back="Novenas">
        <Empty>Novena não encontrada.</Empty>
      </Page>
    )
  const dayIndex = current ? current.current_day - 1 : -1
  const day = current ? n.days[dayIndex] : null

  return (
    <Page title={n.title} back="Novenas" subtitle={n.description}>
      <div className="stack">
        {!current && (
          <div className="card stack">
            {suggestion && <p className="muted">Sugestão: começar em {fmt(suggestion.start)} para terminar antes da festa em {fmt(suggestion.feast)}.</p>}
            {done > 0 && <p className="muted">Você já concluiu esta novena {done} {done === 1 ? 'vez' : 'vezes'}.</p>}
            <button className="btn" onClick={start}>Começar novena hoje</button>
          </div>
        )}

        {current && day && (
          <>
            <div className="card stack">
              <p className="muted">Dia {current.current_day} de 9</p>
              <div className="stack">
                <div role="progressbar" aria-valuemin={1} aria-valuemax={9} aria-valuenow={current.current_day} aria-label="Dia da novena" style={{ height: 6, background: 'var(--fill)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(current.current_day / 9) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.3rem' }}>{day.title}</h2>
              <p className="prose" style={{ whiteSpace: 'pre-wrap' }}>{day.text}</p>
            </div>
            <button className="btn" onClick={advance}>
              {current.current_day >= 9 ? 'Concluir novena' : `Concluir o dia ${current.current_day}`}
            </button>
          </>
        )}

        <Section header="Os nove dias">
          {n.days.map((d, i) => (
            <div key={i} className="row">
              <span className="row-main">
                <span className="row-title">Dia {i + 1} — {d.title}</span>
              </span>
              {current && i + 1 < current.current_day && <span className="row-value">✓</span>}
            </div>
          ))}
        </Section>

        {n.finalPrayer && (
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Oração final</h3>
            <p className="prose" style={{ whiteSpace: 'pre-wrap' }}>{n.finalPrayer}</p>
          </div>
        )}
      </div>
    </Page>
  )
}
