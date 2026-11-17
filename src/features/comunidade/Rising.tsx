import { useEffect, useRef, useState } from 'react'
import styles from './Rising.module.css'

export const MAX_BURST = 12

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

interface Particle {
  id: number
  left: number
  delay: number
  size: number
}

/**
 * Mãos unidas que sobem (como os corações das redes sociais).
 * Cada mudança em `trigger.key` solta `trigger.count` emojis (no máximo 12).
 * Com movimento reduzido não há animação: o contador do pedido continua visível.
 */
export function Rising({ trigger }: { trigger: { key: number; count: number } | null }) {
  const [items, setItems] = useState<Particle[]>([])
  const seq = useRef(0)

  useEffect(() => {
    if (!trigger || trigger.count <= 0 || prefersReducedMotion()) return
    const n = Math.min(trigger.count, MAX_BURST)
    const batch: Particle[] = Array.from({ length: n }, (_, i) => ({
      id: ++seq.current,
      left: 10 + Math.random() * 80,
      delay: i * 140,
      size: 20 + Math.round(Math.random() * 12),
    }))
    setItems((cur) => [...cur, ...batch])
    const t = setTimeout(
      () => setItems((cur) => cur.filter((p) => !batch.some((b) => b.id === p.id))),
      2600 + n * 140,
    )
    return () => clearTimeout(t)
  }, [trigger])

  if (items.length === 0) return null
  return (
    <span className={styles.layer} aria-hidden="true" data-testid="rising">
      {items.map((p) => (
        <span
          key={p.id}
          className={styles.hand}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}ms`, fontSize: p.size }}
        >
          🙏
        </span>
      ))}
    </span>
  )
}
