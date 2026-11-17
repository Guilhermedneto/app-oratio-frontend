import { useEffect, useState, type CSSProperties } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/conta/auth'
import { useNewRequests } from '@/features/comunidade/hooks'
import Welcome from '@/features/conta/Welcome'
import { useLiturgyDay, usePrefetchWeek } from '@/features/hoje/useLiturgy'
import { settingsStore } from '@/offline/stores'
import { useStore } from '@/offline/store'
import { IconBook, IconCandle, IconMore, IconRosary, IconToday } from '@/shared/ui/icons'
import { isoDate, useOnline } from '@/shared/utils'

const TABS = [
  { to: '/', label: 'Hoje', icon: IconToday, end: true },
  { to: '/terco', label: 'Terço', icon: IconRosary },
  { to: '/oracoes', label: 'Orações', icon: IconBook },
  { to: '/novenas', label: 'Novenas', icon: IconCandle },
  { to: '/mais', label: 'Mais', icon: IconMore },
]

function useApplySettings() {
  const s = useStore(settingsStore)
  useEffect(() => {
    const root = document.documentElement
    if (s.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = s.theme === 'claro' ? 'light' : s.theme === 'escuro' ? 'dark' : 'sepia'
    root.style.setProperty('--font-scale', String(s.fontScale))
    try {
      localStorage.setItem('oratio-theme', s.theme === 'claro' ? 'light' : s.theme === 'escuro' ? 'dark' : s.theme)
      localStorage.setItem('oratio-font', String(s.fontScale))
    } catch {
      /* armazenamento indisponível */
    }
  }, [s.theme, s.fontScale])
}

function useLiturgicalAccent() {
  const { data } = useLiturgyDay(isoDate())
  useEffect(() => {
    if (data?.color) document.documentElement.dataset.color = data.color
  }, [data?.color])
}

/** Aviso dentro do app quando surge um novo pedido de oração de outra pessoa. */
function CommunityBanner() {
  const novos = useNewRequests()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!novos?.count || !novos.latest_id || dismissed === novos.latest_id || pathname.startsWith('/mais/comunidade'))
    return null
  const id = novos.latest_id
  return (
    <div className="banner" role="status">
      <strong>Novo pedido de oração</strong>
      <p className="muted" style={{ margin: '2px 0 8px' }}>
        {novos.latest_text}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-small" onClick={() => nav('/mais/comunidade')}>
          Ver pedidos{novos.count > 1 ? ` (${novos.count})` : ''}
        </button>
        <button className="btn btn-secondary btn-small" onClick={() => setDismissed(id)}>
          Depois
        </button>
      </div>
    </div>
  )
}

export function Shell() {
  const auth = useAuth()
  useApplySettings()
  useLiturgicalAccent()
  usePrefetchWeek()
  const { pathname } = useLocation()
  const online = useOnline()
  const immersive = pathname.startsWith('/terco/rezar')
  const novos = useNewRequests()
  const activeTab = TABS.findIndex((t) => (t.end ? pathname === t.to : pathname.startsWith(t.to)))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (auth.status === 'loading') return <div className="splash" aria-busy="true" />
  if (auth.status === 'anon') return <Welcome />

  return (
    <div className="app">
      {!online && (
        <p className="notice" role="status" style={{ margin: 'calc(var(--sat) + 6px) 12px 0', fontSize: '0.8rem' }}>
          <span className="offline-dot" />
          Você está offline. Orações, terço e novenas continuam disponíveis.
        </p>
      )}
      {auth.status === 'authed' && <CommunityBanner />}
      <Outlet />
      {!immersive && (
        <nav className="tabbar" aria-label="Navegação principal" style={{ '--i': Math.max(activeTab, 0) } as CSSProperties}>
          <span className="tab-pill" data-hidden={activeTab < 0} aria-hidden />
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="tab">
              <span className="tab-icon">
                <Icon />
                {to === '/mais' && novos?.count ? <span className="tab-badge" aria-label={`${novos.count} pedidos novos`}>{novos.count > 9 ? '9+' : novos.count}</span> : null}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
