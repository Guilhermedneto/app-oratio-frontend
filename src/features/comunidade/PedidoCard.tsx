import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError, NetworkError } from '@/api/client'
import type { Prayed, PrayerComment, PrayerRequest } from '@/api/types'
import { useStore } from '@/offline/store'
import { prayerSeenStore, timeAgo } from './hooks'
import { Rising } from './Rising'
import styles from './Comunidade.module.css'

function message(e: unknown): string {
  if (e instanceof NetworkError) return 'Sem conexão. Orar e comentar exigem internet.'
  if (e instanceof ApiError) return e.message
  return 'Algo deu errado.'
}

interface Props {
  request: PrayerRequest
  /** Gestor: pode remover qualquer pedido ou comentário. */
  moderator: boolean
}

export function PedidoCard({ request: r, moderator }: Props) {
  const qc = useQueryClient()
  const seen = useStore(prayerSeenStore)
  const [prayed, setPrayed] = useState({ count: r.prayed_count, mine: r.i_prayed })
  const [burst, setBurst] = useState<{ key: number; count: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<PrayerComment[] | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const key = useRef(0)

  // contadores vindos do servidor (atualização periódica)
  useEffect(() => {
    setPrayed({ count: r.prayed_count, mine: r.i_prayed })
  }, [r.prayed_count, r.i_prayed])

  // autor: solta as mãos unidas correspondentes às orações novas desde a última visita
  useEffect(() => {
    if (!r.mine) return
    const previous = seen[r.id] ?? 0
    const delta = r.prayed_count - previous
    if (delta > 0) setBurst({ key: ++key.current, count: delta })
    if (r.prayed_count !== previous) prayerSeenStore.set((s) => ({ ...s, [r.id]: r.prayed_count }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id, r.mine, r.prayed_count])

  const refresh = () => void qc.invalidateQueries({ queryKey: ['comunidade'] })

  const toggle = async () => {
    setError('')
    const next = !prayed.mine
    try {
      const out = await (next
        ? api.put<Prayed>(`/comunidade/pedidos/${r.id}/oracao`, {})
        : api.delete<Prayed>(`/comunidade/pedidos/${r.id}/oracao`))
      setPrayed({ count: out.prayed_count, mine: out.i_prayed })
      if (next) setBurst({ key: ++key.current, count: 5 })
      refresh()
    } catch (e) {
      setError(message(e))
    }
  }

  const loadComments = async () => {
    try {
      setComments(await api.get<PrayerComment[]>(`/comunidade/pedidos/${r.id}/comentarios`))
    } catch (e) {
      setError(message(e))
    }
  }

  const toggleComments = () => {
    const next = !open
    setOpen(next)
    if (next) void loadComments()
  }

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setError('')
    try {
      const c = await api.post<PrayerComment>(`/comunidade/pedidos/${r.id}/comentarios`, { text: t })
      setComments((cur) => [...(cur ?? []), c])
      setText('')
      refresh()
    } catch (e) {
      setError(message(e))
    }
  }

  const removeComment = async (id: string) => {
    try {
      await api.delete(`/comunidade/comentarios/${id}`)
      setComments((cur) => (cur ?? []).filter((c) => c.id !== id))
      refresh()
    } catch (e) {
      setError(message(e))
    }
  }

  const removeRequest = async () => {
    try {
      await api.delete(`/comunidade/pedidos/${r.id}`)
      refresh()
    } catch (e) {
      setError(message(e))
    }
  }

  return (
    <article className={styles.card} aria-label={`Pedido de ${r.author_name ?? 'anônimo'}`}>
      <Rising trigger={burst} />
      <header className={styles.head}>
        <strong>{r.author_name ?? 'Anônimo'}</strong>
        <span className="muted">{timeAgo(r.created_at)}</span>
      </header>
      <p className={styles.text}>{r.text}</p>

      <p className={styles.counts} aria-live="polite">
        {prayed.count === 0
          ? 'Ninguém orou ainda'
          : prayed.count === 1
            ? '1 pessoa orou 🙏'
            : `${prayed.count} pessoas oraram 🙏`}
      </p>

      <div className={styles.actions}>
        <button
          className={prayed.mine ? styles.prayOn : styles.pray}
          aria-pressed={prayed.mine}
          onClick={() => void toggle()}
        >
          🙏 {prayed.mine ? 'Orei' : 'Orar'}
        </button>
        <button className={styles.ghost} aria-expanded={open} onClick={toggleComments}>
          Comentários ({r.comment_count})
        </button>
        {(r.mine || moderator) && (
          <button className={styles.danger} onClick={() => void removeRequest()}>
            {moderator && !r.mine ? 'Remover (gestor)' : 'Excluir'}
          </button>
        )}
      </div>

      {open && (
        <div className={styles.comments}>
          {comments === null && <p className="muted">Carregando…</p>}
          {comments?.length === 0 && <p className="muted">Seja o primeiro a comentar.</p>}
          {comments?.map((c) => (
            <div key={c.id} className={styles.comment}>
              <p>
                <strong>{c.author_name}</strong> <span className="muted">{timeAgo(c.created_at)}</span>
              </p>
              <p>{c.text}</p>
              {(c.mine || moderator) && (
                <button className={styles.danger} onClick={() => void removeComment(c.id)}>
                  {moderator && !c.mine ? 'Remover (gestor)' : 'Excluir'}
                </button>
              )}
            </div>
          ))}
          <div className={styles.compose}>
            <input
              className="field"
              aria-label="Escrever comentário"
              placeholder="Deixe uma palavra de apoio"
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
            />
            <button className="btn btn-small" disabled={!text.trim()} onClick={() => void send()}>
              Enviar
            </button>
          </div>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  )
}
