import { usePresence } from './hooks'
import styles from './PresenceBadge.module.css'

/** Selo pequeno: quantas pessoas estão rezando agora (só aparece logado e com a contagem em mãos). */
export function PresenceBadge() {
  const n = usePresence()
  if (n === undefined) return null
  return (
    <p className={styles.badge} role="status">
      <span className={styles.dot} aria-hidden />
      {n <= 1 ? 'Você está rezando agora' : `${n} pessoas rezando agora`}
    </p>
  )
}
