import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { loadDoc } from '@/content/loader'
import { toMysterySet, useManagedContents } from '@/features/docs/managed'
import { enqueue } from '@/offline/sync'
import { useStore } from '@/offline/store'
import { rosaryLogStore, rosaryProgressStore, uid } from '@/offline/stores'
import { Markdown } from '@/shared/ui/Markdown'
import { IconClose } from '@/shared/ui/icons'
import { isoDate, useAsync } from '@/shared/utils'
import {
  beadsDone,
  clampIndex,
  isFinished,
  LAST_INDEX,
  next,
  prev,
  progressLabel,
  STEPS,
} from './rosary'
import styles from './Sessao.module.css'

/** Mantém a tela acesa durante o terço, quando o navegador permite. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen')
          if (cancelled) void lock.release()
        }
      } catch {
        /* sem suporte ou negado: o terço segue normalmente */
      }
    }
    void request()
    const onVisible = () => void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}

function useFullscreen() {
  const [full, setFull] = useState(Boolean(document.fullscreenElement))
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const supported = typeof document.documentElement.requestFullscreen === 'function'
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => undefined)
  }
  return { full, supported, toggle }
}

export default function Sessao() {
  const nav = useNavigate()
  const progress = useStore(rosaryProgressStore)
  useWakeLock()
  const fs = useFullscreen()
  const [showText, setShowText] = useState(false)
  const managed = useManagedContents().data
  const set = (managed ?? []).map(toMysterySet).find((s) => s !== null && s.slug === progress?.setId) ?? undefined
  const index = progress ? clampIndex(progress.index) : 0
  const step = STEPS[index]
  // texto da oração: primeiro o cadastrado pelo gestor (identificador igual ao do passo), depois o empacotado
  const managedPrayer = step.prayer ? managed?.find((m) => m.kind === 'oracao' && m.slug === step.prayer) : undefined
  const bundled = useAsync(
    () => (step.prayer && !managedPrayer ? loadDoc('oracoes', step.prayer) : Promise.resolve(null)),
    [step.prayer, Boolean(managedPrayer)],
  )
  const prayer = { data: managedPrayer?.body ?? bundled.data }

  const go = useCallback((fn: (i: number) => number) => {
    rosaryProgressStore.set((p) => (p ? { ...p, index: fn(p.index) } : p))
    if (navigator.vibrate) navigator.vibrate(8)
  }, [])

  const finish = () => {
    if (!progress) return
    const entry = { client_id: uid(), date: isoDate(), mystery_set: progress.setId, completed: true }
    rosaryLogStore.set((l) => [...l, entry])
    enqueue({ type: 'rosary', body: entry })
    rosaryProgressStore.set(() => null)
    nav('/terco', { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(next)
      if (e.key === 'ArrowLeft') go(prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (!progress) return <Navigate to="/terco" replace />

  const mystery = step.decade ? set?.mysteries[step.decade - 1] : undefined
  const done = beadsDone(index)
  const finished = isFinished(index)

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <button className={styles.icon} onClick={() => nav('/terco')} aria-label="Sair e salvar o ponto">
          <IconClose width={22} height={22} />
        </button>
        <div className={styles.topText}>
          <strong>{set?.title ?? 'Terço'}</strong>
          <span>{progressLabel(index)}</span>
        </div>
        {fs.supported ? (
          <button className={styles.link} onClick={fs.toggle}>
            {fs.full ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        ) : (
          <span />
        )}
      </header>

      <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={LAST_INDEX} aria-valuenow={index} aria-label="Progresso do terço">
        <div style={{ width: `${(index / LAST_INDEX) * 100}%` }} />
      </div>

      <section className={styles.body} aria-live="polite">
        {step.decade && (
          <div className={styles.beads} aria-label={`${done} de 10 Ave-Marias`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < done ? styles.beadOn : i === done ? styles.beadNext : styles.bead} />
            ))}
          </div>
        )}

        {step.kind === 'misterio' && mystery ? (
          <>
            <p className={styles.eyebrow}>{step.title}</p>
            <h1 className={styles.title}>{mystery.title}</h1>
            {mystery.fruit && <p className={styles.fruit}>Fruto: {mystery.fruit}</p>}
            {mystery.meditation && <p className={styles.meditation}>{mystery.meditation}</p>}
          </>
        ) : (
          <>
            <h1 className={styles.title}>{step.title}</h1>
            {step.decade && mystery && <p className={styles.fruit}>{mystery.title}</p>}
            <button className={styles.textToggle} onClick={() => setShowText(!showText)} aria-expanded={showText}>
              {showText ? 'Ocultar oração' : 'Mostrar oração'}
            </button>
            {showText && prayer.data && (
              <div className={`prose ${styles.prayer}`}>
                <Markdown source={prayer.data} />
              </div>
            )}
          </>
        )}
      </section>

      <footer className={styles.footer}>
        <button className={styles.back} onClick={() => go(prev)} disabled={index === 0} aria-label="Voltar uma conta">
          Voltar
        </button>
        {finished ? (
          <button className={styles.next} onClick={finish}>
            Concluir terço
          </button>
        ) : (
          <button className={styles.next} onClick={() => go(next)}>
            Próxima
          </button>
        )}
      </footer>
    </main>
  )
}
