import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Prayer, Reading } from '@/api/types'
import { contentIndex, loadDoc, loadSaint } from '@/content/loader'
import { firstName, useOptionalAuth } from '@/features/conta/auth'
import { saintDate, useManagedContents } from '@/features/docs/managed'
import { Markdown } from '@/shared/ui/Markdown'
import { Page } from '@/shared/ui/Page'
import { Section } from '@/shared/ui/controls'
import { IconBook, IconRosary } from '@/shared/ui/icons'
import { formatLong, isoDate, RANK_LABEL, useAsync, useOnline } from '@/shared/utils'
import styles from './Hoje.module.css'
import { useLiturgyDay } from './useLiturgy'

const KIND_LABEL: Record<string, string> = {
  primeira: '1ª Leitura',
  salmo: 'Salmo responsorial',
  segunda: '2ª Leitura',
  aclamacao: 'Aclamação ao Evangelho',
  evangelho: 'Evangelho',
}
const COLOR_LABEL: Record<string, string> = {
  verde: 'Verde',
  roxo: 'Roxo',
  branco: 'Branco',
  vermelho: 'Vermelho',
  rosa: 'Rosa',
  preto: 'Preto',
}
const SWATCH: Record<string, string> = {
  verde: '#34c759',
  roxo: '#8944ab',
  branco: '#f5f0e1',
  vermelho: '#e5392f',
  rosa: '#f06aa4',
  preto: '#1c1c1e',
}

function Disclosure({
  title,
  detail,
  defaultOpen = false,
  children,
}: {
  title: string
  detail?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.reading}>
      <button className="row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="row-main">
          <span className="row-title">{title}</span>
          {detail && <span className="row-detail">{detail}</span>}
        </span>
        <span className="row-value">{open ? 'Fechar' : 'Ler'}</span>
      </button>
      {open && <div className={`prose ${styles.readingBody}`}>{children}</div>}
    </div>
  )
}

function ReadingItem({ r }: { r: Reading }) {
  return (
    <Disclosure title={KIND_LABEL[r.kind] ?? r.kind} detail={r.reference || undefined} defaultOpen={r.kind === 'evangelho'}>
      {r.title && <h3>{r.title}</h3>}
      <Markdown source={r.text || 'Texto indisponível.'} />
    </Disclosure>
  )
}

/** Reflexão do dia: escolhe, sem rede, entre textos dos santos e reflexões, mudando a cada dia. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

interface Pick {
  slug: string
  titulo: string
  base: string
  folder?: 'textos' | 'reflexoes'
  body?: string
}

function Thought({ date }: { date: string }) {
  const managed = useManagedContents().data
  const pool: Pick[] = [
    ...(contentIndex.textos ?? []).map((d) => ({ slug: d.slug, titulo: d.titulo, folder: 'textos' as const, base: '/mais/textos' })),
    ...(contentIndex.reflexoes ?? []).map((d) => ({ slug: d.slug, titulo: d.titulo, folder: 'reflexoes' as const, base: '/mais/reflexoes' })),
    ...(managed ?? [])
      .filter((m) => m.kind === 'texto' || m.kind === 'reflexao')
      .map((m) => ({ slug: m.slug, titulo: m.title, body: m.body, base: m.kind === 'texto' ? '/mais/textos' : '/mais/reflexoes' })),
  ]
  const pick = pool.length ? pool[dayNumber(date) % pool.length] : undefined
  const doc = useAsync(() => (pick?.folder ? loadDoc(pick.folder, pick.slug) : Promise.resolve(null)), [pick?.slug])
  const text = pick?.body ?? doc.data
  if (!pick || !text) return null
  const first = text.split(/\n{2,}/)[0].replace(/[*_#>]/g, '').trim()
  const excerpt = first.length > 260 ? first.slice(0, 257).trimEnd() + '…' : first
  return (
    <div className="card">
      <h3 className={styles.saintTitle}>Para refletir hoje</h3>
      <p className={styles.saintName}>{pick.titulo}</p>
      <p className="muted">{excerpt}</p>
      <p style={{ marginTop: 8 }}>
        <Link to={`${pick.base}/${pick.slug}`}>Ler completo</Link>
      </p>
    </div>
  )
}

const BEFORE = ['antifona_entrada', 'coleta']
const AFTER = ['oferendas', 'antifona_comunhao', 'depois_comunhao']

function PrayerSection({ header, items }: { header: string; items: Prayer[] }) {
  if (items.length === 0) return null
  return (
    <Section header={header}>
      {items.map((p, i) => (
        <Disclosure key={`${p.kind}-${i}`} title={p.title}>
          <Markdown source={p.text} />
        </Disclosure>
      ))}
    </Section>
  )
}

export default function Hoje() {
  const date = isoDate()
  const greeting = firstName(useOptionalAuth()?.user)
  const online = useOnline()
  const { data, isPending, isError, isFetching, refetch } = useLiturgyDay(date)
  const monthDay = date.slice(5)
  const prayers = data?.prayers ?? []
  const managed = useManagedContents().data
  const bundledSaint = useAsync(
    () => (data && data.rank !== 'feria' && data.rank !== 'domingo' ? loadSaint(monthDay) : Promise.resolve(null)),
    [data?.rank, monthDay],
  )
  const managedSaint =
    data && data.rank !== 'feria' && data.rank !== 'domingo'
      ? (managed ?? []).find((m) => m.kind === 'santo' && saintDate(m) === monthDay)
      : undefined
  const saint = {
    data: managedSaint ? { titulo: managedSaint.title, bio: managedSaint.body } : bundledSaint.data,
  }

  const quick = (
    <nav className={styles.quick} aria-label="Rezar agora">
      <Link to="/terco" className={styles.tile}>
        <span className={styles.tileIcon} style={{ background: 'linear-gradient(145deg,#4f6bff,#9a5cff)' }}>
          <IconRosary />
        </span>
        <span className={styles.tileLabel}>Terço do dia</span>
      </Link>
      <Link to="/oracoes/oracao-da-manha" className={styles.tile}>
        <span className={styles.tileIcon} style={{ background: 'linear-gradient(145deg,#ffb02e,#ff6a3d)' }}>
          <IconBook />
        </span>
        <span className={styles.tileLabel}>Oração da manhã</span>
      </Link>
      <Link to="/oracoes/oracao-da-noite" className={styles.tile}>
        <span className={styles.tileIcon} style={{ background: 'linear-gradient(145deg,#5a4bdb,#27308a)' }}>
          <IconBook />
        </span>
        <span className={styles.tileLabel}>Oração da noite</span>
      </Link>
    </nav>
  )

  return (
    <Page title="Hoje" subtitle={greeting ? `Olá, ${greeting}! · ${formatLong(date)}` : formatLong(date)}>
      <div className="stack">
        {!online && (
          <p className="notice">
            <span className="offline-dot" />
            Sem conexão. Mostrando o último dado salvo neste aparelho.
          </p>
        )}

        {isPending && !data && <p className="muted center" style={{ padding: 32 }}>Carregando…</p>}

        {isError && !data && (
          <div className="card center stack">
            <p>Não foi possível carregar a liturgia de hoje.</p>
            <p className="muted">Você ainda pode rezar o terço e ler as orações, que funcionam sem internet.</p>
            <button className="btn btn-secondary" onClick={() => void refetch()}>
              Tentar novamente
            </button>
          </div>
        )}

        {data && (
          <>
            <div className={styles.hero} data-lit={data.color}>
              <span className={styles.swatch} style={{ background: SWATCH[data.color] }} aria-hidden />
              <div>
                <p className={styles.meta}>
                  {data.season_label}
                  {data.week ? ` · ${data.week}ª semana` : ''} · Cor {COLOR_LABEL[data.color]?.toLowerCase()}
                </p>
                <h2 className={styles.celebration}>{data.celebration}</h2>
                <p className="chip">{RANK_LABEL[data.rank] ?? data.rank}</p>
                <p className={styles.cycle}>
                  Ano {data.cycle_sunday} · Semana {data.cycle_weekday === 'I' ? 'ímpar (I)' : 'par (II)'}
                </p>
              </div>
            </div>

            {quick}

            <Thought date={date} />

            {saint.data && (
              <div className="card">
                <h3 className={styles.saintTitle}>Santo do dia</h3>
                <p className={styles.saintName}>{saint.data.titulo}</p>
                <p className="muted">{saint.data.bio}</p>
              </div>
            )}

            <PrayerSection header="Ritos iniciais" items={prayers.filter((p) => BEFORE.includes(p.kind))} />

            <Section
              header="Leituras"
              footer={
                data.status === 'ok'
                  ? data.credits
                  : 'As leituras de hoje não estão disponíveis agora. Tempo, cor e celebração foram calculados normalmente.'
              }
            >
              {data.status === 'partial' || data.readings.length === 0 ? (
                <div className="row">
                  <span className="row-main muted">Leituras indisponíveis no momento.</span>
                </div>
              ) : (
                data.readings.map((r) => <ReadingItem key={r.kind} r={r} />)
              )}
            </Section>
            <PrayerSection header="Liturgia eucarística e comunhão" items={prayers.filter((p) => AFTER.includes(p.kind))} />
            <PrayerSection header="Outras orações do dia" items={prayers.filter((p) => p.kind === 'extra')} />
            {isFetching && online && <p className="muted center">Atualizando…</p>}
          </>
        )}

        {!data && quick}
        <p className="center">
          <Link to="/mais/lembretes">Ativar lembrete diário</Link>
        </p>
      </div>
    </Page>
  )
}
