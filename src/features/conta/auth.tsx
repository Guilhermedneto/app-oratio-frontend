import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '@/api/client'
import type { TokenOut, UserOut } from '@/api/types'
import { flush, syncAfterLogin } from '@/offline/sync'

type Status = 'loading' | 'anon' | 'authed'

interface AuthValue {
  status: Status
  user: UserOut | null
  login(email: string, password: string): Promise<void>
  register(name: string, email: string, password: string): Promise<void>
  google(idToken: string): Promise<void>
  logout(): Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)
const USER_KEY = 'oratio-user'

/** Perfil guardado no aparelho: permite abrir o app offline para quem já entrou antes. */
function cachedUser(): UserOut | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserOut) : null
  } catch {
    return null
  }
}
function cacheUser(u: UserOut | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* armazenamento indisponível */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<UserOut | null>(null)

  const accept = useCallback((t: TokenOut) => {
    setAccessToken(t.access_token)
    cacheUser(t.user)
    setUser(t.user)
    setStatus('authed')
    void syncAfterLogin()
  }, [])

  useEffect(() => {
    setSessionLostHandler(() => {
      cacheUser(null)
      setUser(null)
      setStatus('anon')
    })
    let alive = true
    refreshSession()
      .then((t) => {
        if (!alive) return
        if (t) return accept(t)
        // o servidor recusou a sessão (cookie ausente, vencido ou revogado): é preciso entrar de novo
        cacheUser(null)
        setStatus('anon')
      })
      .catch(() => {
        if (!alive) return
        // sem conexão ou API fora do ar: quem já entrou neste aparelho continua com o conteúdo salvo
        const cached = cachedUser()
        if (cached) {
          setUser(cached)
          setStatus('authed')
        } else setStatus('anon')
      })
    return () => {
      alive = false
      setSessionLostHandler(null)
    }
  }, [accept])

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      async login(email, password) {
        accept(await api.post<TokenOut>('/auth/login', { email, password }))
      },
      async register(name, email, password) {
        accept(await api.post<TokenOut>('/auth/register', { name, email, password }))
      },
      async google(idToken) {
        accept(await api.post<TokenOut>('/auth/google', { id_token: idToken }))
      },
      async logout() {
        await flush().catch(() => undefined)
        await api.post('/auth/logout').catch(() => undefined)
        setAccessToken(null)
        cacheUser(null)
        setUser(null)
        setStatus('anon')
      },
    }),
    [status, user, accept],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Para telas que só precisam saudar o usuário e podem existir sem o provedor (testes). */
export function useOptionalAuth(): AuthValue | null {
  return useContext(Ctx)
}

export function firstName(user: UserOut | null | undefined): string | null {
  const n = user?.name?.trim().split(/\s+/)[0]
  return n || null
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fora do AuthProvider')
  return v
}
