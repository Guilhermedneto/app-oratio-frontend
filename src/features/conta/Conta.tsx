import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError, NetworkError } from '@/api/client'
import { Page } from '@/shared/ui/Page'
import { Section, Segmented, Sheet } from '@/shared/ui/controls'
import { useAuth } from './auth'

const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface GoogleId {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback(r: { credential: string }): void }): void
      renderButton(el: HTMLElement, o: Record<string, unknown>): void
    }
  }
}

function GoogleButton({ onToken }: { onToken(t: string): void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!GOOGLE_ID || !ref.current) return
    const el = ref.current
    const init = () => {
      const g = (window as unknown as { google?: GoogleId }).google
      if (!g) return
      g.accounts.id.initialize({ client_id: GOOGLE_ID, callback: (r) => onToken(r.credential) })
      g.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280, locale: 'pt-BR' })
    }
    if ((window as unknown as { google?: GoogleId }).google) return init()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = init
    document.head.appendChild(s)
  }, [onToken])
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />
}

function errorMessage(e: unknown): string {
  if (e instanceof NetworkError) return 'Sem conexão. Tente novamente quando estiver online.'
  if (e instanceof ApiError) return e.status === 429 ? 'Muitas tentativas. Aguarde um instante.' : e.message
  return 'Algo deu errado.'
}

export function Entrar() {
  const auth = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await auth.login(email, password)
      else await auth.register(name, email, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <p className="muted">
        Entre ou crie sua conta para continuar. Seus favoritos, novenas, intenções e sequência de terços ficam guardados na conta.
      </p>
      <Segmented
        label="Entrar ou criar conta"
        value={mode}
        onChange={(v) => setMode(v as 'login' | 'register')}
        options={[
          { value: 'login', label: 'Entrar' },
          { value: 'register', label: 'Criar conta' },
        ]}
      />
      <form className="stack" onSubmit={submit}>
        <div className="group">
          {mode === 'register' && (
            <input className="field" aria-label="Nome" placeholder="Nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input className="field" aria-label="E-mail" type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className="field"
            aria-label="Senha"
            type="password"
            placeholder={mode === 'register' ? 'Senha (mínimo 8 caracteres)' : 'Senha'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      </form>
      {GOOGLE_ID && (
        <GoogleButton
          onToken={(t) => {
            auth.google(t).catch((err) => setError(errorMessage(err)))
          }}
        />
      )}
    </div>
  )
}

function Perfil() {
  const auth = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')

  const exportData = async () => {
    try {
      const data = await api.get<unknown>('/me/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'oratio-meus-dados.json'
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Arquivo gerado.')
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }
  const remove = async () => {
    try {
      await api.delete('/me')
      await auth.logout()
      setConfirm(false)
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <Section header="Conta">
        <div className="row">
          <span className="row-main">
            <span className="row-title">{auth.user?.name}</span>
            <span className="row-detail">{auth.user?.email}</span>
          </span>
        </div>
      </Section>
      <Section header="Seus dados" footer="Exporte tudo o que o Oratio guarda sobre você ou exclua a conta definitivamente.">
        <button className="row" onClick={exportData}>
          <span className="row-main">Exportar meus dados</span>
        </button>
        <button className="row" onClick={() => setConfirm(true)} style={{ color: 'var(--danger)' }}>
          <span className="row-main">Excluir minha conta</span>
        </button>
      </Section>
      {msg && <p className="muted center" role="status">{msg}</p>}
      <button className="btn btn-secondary" onClick={() => void auth.logout()}>Sair</button>
      {confirm && (
        <Sheet title="Excluir conta?" onClose={() => setConfirm(false)}>
          <div className="stack">
            <p className="muted center">Todos os dados da conta serão apagados do servidor. Esta ação não pode ser desfeita.</p>
            <button className="btn btn-danger" onClick={() => void remove()}>Excluir definitivamente</button>
            <button className="btn btn-secondary" onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

export default function Conta() {
  const auth = useAuth()
  return (
    <Page title="Conta" back="Mais">
      {auth.status === 'loading' ? <p className="muted center">Verificando sessão…</p> : auth.status === 'authed' ? <Perfil /> : <Entrar />}
    </Page>
  )
}
