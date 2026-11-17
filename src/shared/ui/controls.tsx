import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconChevron } from './icons'

export function Section({ header, footer, children }: { header?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {header && <h2 className="section-header">{header}</h2>}
      <div className="group">{children}</div>
      {footer && <p className="section-footer">{footer}</p>}
    </section>
  )
}

interface RowProps {
  to?: string
  onClick?: () => void
  title: ReactNode
  detail?: ReactNode
  value?: ReactNode
  icon?: ReactNode
  iconColor?: string
  trailing?: ReactNode
}

export function Row({ to, onClick, title, detail, value, icon, iconColor, trailing }: RowProps) {
  const inner = (
    <>
      {icon && (
        <span className="icon-badge" style={iconColor ? { background: iconColor } : undefined}>
          {icon}
        </span>
      )}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </span>
      {value && <span className="row-value">{value}</span>}
      {trailing}
      {to && <IconChevron className="chev" />}
    </>
  )
  if (to)
    return (
      <Link className="row" to={to}>
        {inner}
      </Link>
    )
  if (onClick)
    return (
      <button className="row" onClick={onClick}>
        {inner}
      </button>
    )
  return <div className="row">{inner}</div>
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange(v: T): void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grabber" />
        <h2>{title}</h2>
        {children}
      </div>
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted center" style={{ padding: '32px 16px' }}>{children}</p>
}
