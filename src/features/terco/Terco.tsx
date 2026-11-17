import { Link, useNavigate } from 'react-router-dom'
import { suggestedSet, useManagedContents, useMysterySets } from '@/features/docs/managed'
import { useStore } from '@/offline/store'
import { rosaryLogStore, rosaryProgressStore, serverStreakStore } from '@/offline/stores'
import { IconRosary } from '@/shared/ui/icons'
import { Page } from '@/shared/ui/Page'
import { Empty, Row, Section } from '@/shared/ui/controls'
import { computeStreak, isoDate } from '@/shared/utils'
import { progressLabel } from './rosary'

const TINTS = ['#f59e0b', '#e11d48', '#3b82f6', '#8b5cf6', '#14b8a6', '#ec4899']
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const daysLabel = (days: number[]) => (days.length ? days.map((d) => DAY_NAMES[d]).join(', ') : 'Qualquer dia')

export default function Terco() {
  const nav = useNavigate()
  const today = isoDate()
  const { sets, isPending } = useMysterySets()
  const suggested = suggestedSet(sets, new Date().getDay())
  const progress = useStore(rosaryProgressStore)
  const log = useStore(rosaryLogStore)
  const serverStreak = useStore(serverStreakStore)
  const local = computeStreak(
    log.filter((e) => e.completed).map((e) => e.date),
    today,
  )
  const streak = Math.max(local, serverStreak)
  const doneToday = log.some((e) => e.date === today && e.completed)
  const outros = (useManagedContents().data ?? []).filter((m) => m.kind === 'terco')
  const resume = progress && progress.index > 0 ? progress : null
  const nameOf = (slug: string) => sets.find((s) => s.slug === slug)?.title ?? 'Terço'

  const start = (slug: string) => {
    rosaryProgressStore.set(() => ({ setId: slug, index: 0, date: today }))
    nav('/terco/rezar')
  }

  return (
    <Page title="Terço" subtitle={doneToday ? 'Você já rezou hoje. Deus abençoe!' : 'Reze guiado, conta por conta.'}>
      <div className="stack">
        <div className="card center streak">
          <p className="streak-num" aria-label={`${streak} dias seguidos`}>
            {streak}
          </p>
          <p className="muted">{streak === 1 ? 'dia seguido' : 'dias seguidos'}</p>
        </div>

        {resume && (
          <div className="card stack">
            <p>
              <strong>Retomar terço</strong>
              <br />
              <span className="muted">
                {nameOf(resume.setId)} · {progressLabel(resume.index)}
              </span>
            </p>
            <Link className="btn" to="/terco/rezar">
              Continuar de onde parei
            </Link>
            <button className="btn btn-secondary" onClick={() => start(resume.setId)}>
              Recomeçar
            </button>
          </div>
        )}

        {suggested && (
          <button className="btn" onClick={() => start(suggested.slug)}>
            Rezar {suggested.title}
          </button>
        )}

        {sets.length > 0 && (
          <Section header="Escolher outros mistérios" footer="Os mistérios sugeridos mudam conforme o dia da semana.">
            {sets.map((s, i) => (
              <Row
                key={s.slug}
                onClick={() => start(s.slug)}
                icon={<IconRosary />}
                iconColor={TINTS[i % TINTS.length]}
                title={s.title}
                detail={daysLabel(s.weekdays)}
                value={s.slug === suggested?.slug ? 'Hoje' : undefined}
              />
            ))}
          </Section>
        )}

        {!isPending && sets.length === 0 && (
          <Empty>Nenhum conjunto de mistérios cadastrado ainda. O gestor pode incluí-los no painel.</Empty>
        )}

        {outros.length > 0 && (
          <Section header="Outros terços e devoções">
            {outros.map((o) => (
              <Row key={o.slug} to={`/terco/guia/${o.slug}`} icon={<IconRosary />} iconColor="#64748b" title={o.title} detail={o.author ?? undefined} />
            ))}
          </Section>
        )}
      </div>
    </Page>
  )
}
