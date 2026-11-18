import { useEffect, useState, type ReactNode } from 'react'
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
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    document.title = `${title} · Oratio`
    const onScroll = () => setCompact(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
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
      <h1 className="large-title">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      <div className="content">{children}</div>
    </main>
  )
}
