import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBack } from './icons'

interface Props {
  title: string
  subtitle?: string
  back?: boolean | string
  trailing?: ReactNode
  children: ReactNode
}

/** Página no padrão iOS: título grande que colapsa para a barra superior ao rolar. */
export function Page({ title, subtitle, back, trailing, children }: Props) {
  const nav = useNavigate()
  const sentinel = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    document.title = `${title} · Oratio`
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), {
      rootMargin: `-${44 + 8}px 0px 0px 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [title])

  return (
    <main className="page">
      <header className="navbar" data-compact={compact}>
        <div className="navbar-row">
          {back ? (
            <button className="navbar-back" onClick={() => nav(-1)} aria-label="Voltar">
              <IconBack />
              <span>{typeof back === 'string' ? back : 'Voltar'}</span>
            </button>
          ) : (
            <span />
          )}
          <span className="navbar-title" aria-hidden>
            {title}
          </span>
          <div className="navbar-trailing">{trailing}</div>
        </div>
      </header>
      <div ref={sentinel} />
      <h1 className="large-title">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      <div className="content">{children}</div>
    </main>
  )
}
