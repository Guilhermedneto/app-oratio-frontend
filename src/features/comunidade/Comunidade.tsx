import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, NetworkError } from '@/api/client'
import type { PrayerRequest } from '@/api/types'
import { useAuth } from '@/features/conta/auth'
import { Page } from '@/shared/ui/Page'
import { Empty, Segmented, Sheet } from '@/shared/ui/controls'
import { useOnline } from '@/shared/utils'
import { PedidoCard } from './PedidoCard'
import { markSeen, useFeed, type FeedTab } from './hooks'
import { PresenceBadge } from './PresenceBadge'
import styles from './Comunidade.module.css'

/** Lista de pedidos (também usada na moderação do gestor). */
export function PedidoList({ tab, moderator }: { tab: FeedTab; moderator: boolean }) {
  const feed = useFeed(tab, true)
  const items: PrayerRequest[] = feed.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <div className={styles.list}>
      {feed.isPending && <p className="muted center">Carregando…</p>}
      {feed.isError && !feed.data && <Empty>Não foi possível carregar os pedidos agora.</Empty>}
      {feed.data && items.length === 0 && (
        <Empty>{tab === 'meus' ? 'Você ainda não fez nenhum pedido.' : 'Ainda não há pedidos de oração.'}</Empty>
      )}
      {items.map((r) => (
        <PedidoCard key={r.id} request={r} moderator={moderator} />
      ))}
      {feed.hasNextPage && (
        <button className="btn btn-secondary" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
          {feed.isFetchingNextPage ? 'Carregando…' : 'Ver mais pedidos'}
        </button>
      )}
    </div>
  )
}

function NovoPedido({ onClose }: { onClose(): void }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/comunidade/pedidos', { text: text.trim(), anonymous })
      await qc.invalidateQueries({ queryKey: ['comunidade'] })
      onClose()
    } catch (e) {
      setError(
        e instanceof NetworkError
          ? 'Sem conexão. Publicar exige internet.'
          : e instanceof ApiError
            ? e.message
            : 'Não foi possível publicar.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Novo pedido de oração" onClose={onClose}>
      <div className="stack">
        <textarea
          className="field"
          aria-label="Pedido de oração"
          placeholder="Pelo que você gostaria que rezassem?"
          maxLength={1000}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label className="row" style={{ borderRadius: 12, background: 'var(--bg-grouped)' }}>
          <span className="row-main">Publicar como anônimo</span>
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} style={{ width: 22, height: 22 }} />
        </label>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Seu pedido ficará visível para todos os usuários do Oratio. Não inclua dados que identifiquem outras pessoas.
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={!text.trim() || busy} onClick={() => void send()}>
          {busy ? 'Publicando…' : 'Publicar pedido'}
        </button>
      </div>
    </Sheet>
  )
}

export default function Comunidade() {
  const auth = useAuth()
  const qc = useQueryClient()
  const online = useOnline()
  const [tab, setTab] = useState<FeedTab>('todos')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (auth.status === 'authed') void markSeen(qc)
  }, [auth.status, qc])

  return (
    <Page title="Pedidos de oração" back="Mais" subtitle="Reze pelos outros e peça que rezem por você.">
      {auth.status === 'authed' && <PresenceBadge />}
      {auth.status === 'loading' && <p className="muted center">Verificando sessão…</p>}
      {auth.status === 'anon' && (
        <div className="card center stack">
          <p>Entre na sua conta para ver os pedidos de oração e fazer o seu.</p>
          <Link className="btn" to="/mais/conta">
            Entrar ou criar conta
          </Link>
        </div>
      )}
      {auth.status === 'authed' && (
        <div className="stack">
          {!online && (
            <p className="notice">
              <span className="offline-dot" />
              Sem conexão. Você vê os últimos pedidos carregados; publicar, orar e comentar exigem internet.
            </p>
          )}
          <button className={`btn ${styles.fab}`} onClick={() => setCreating(true)} disabled={!online}>
            Fazer um pedido de oração
          </button>
          <Segmented<FeedTab>
            label="Filtro"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'meus', label: 'Meus pedidos' },
            ]}
          />
          <PedidoList tab={tab} moderator={auth.user?.role === 'manager'} />
        </div>
      )}
      {creating && <NovoPedido onClose={() => setCreating(false)} />}
    </Page>
  )
}
