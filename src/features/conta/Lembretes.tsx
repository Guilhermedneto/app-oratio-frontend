import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useStore } from '@/offline/store'
import { enqueue } from '@/offline/sync'
import { settingsStore } from '@/offline/stores'
import { Page } from '@/shared/ui/Page'
import { Section, Switch } from '@/shared/ui/controls'
import { InstallInstructions, isIOS, isStandalone } from '@/shared/install'
import { useAuth } from './auth'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function b64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function zones(): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const cur = settingsStore.get().timezone
  const list = all.length ? all : ['America/Sao_Paulo', 'UTC']
  return list.includes(cur) ? list : [cur, ...list]
}

type Support = 'ok' | 'ios-not-installed' | 'unsupported' | 'unconfigured'

export function pushSupport(): Support {
  if (isIOS() && !isStandalone()) return 'ios-not-installed'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!VAPID) return 'unconfigured'
  return 'ok'
}

export default function Lembretes() {
  const auth = useAuth()
  const settings = useStore(settingsStore)
  const support = pushSupport()
  const [enabled, setEnabled] = useState(false)
  const [msg, setMsg] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (support !== 'ok') return
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => undefined)
  }, [support])

  const toggle = async (on: boolean) => {
    setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      if (on) {
        if (auth.status !== 'authed') return setMsg('Entre na sua conta para ativar lembretes.')
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return setMsg('Permissão de notificações negada. Ative nos ajustes do navegador.')
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID!) })
        const j = sub.toJSON()
        await api.post('/push/subscribe', { endpoint: sub.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } })
        setEnabled(true)
      } else {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await api.delete(`/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`).catch(() => undefined)
          await sub.unsubscribe()
        }
        setEnabled(false)
      }
    } catch (e) {
      setMsg(
        'Não foi possível alterar o lembrete: ' +
          (e instanceof Error ? e.message : 'verifique a conexão e tente novamente') +
          '.',
      )
    }
  }

  const sendTest = async () => {
    setMsg('')
    setInfo('')
    try {
      const r = await api.post<{ sent: number }>('/push/test')
      if (r.sent > 0) setInfo('Lembrete de teste enviado. Ele deve aparecer em instantes.')
      else setMsg('Nenhum aparelho assinado. Ative o lembrete primeiro.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao enviar o teste.')
    }
  }

  const setTime = (notifyTime: string) => {
    settingsStore.set((c) => ({ ...c, notifyTime: notifyTime || null }))
    enqueue({ type: 'settings', body: { notify_time: notifyTime ? `${notifyTime}:00` : null, timezone: settings.timezone } })
  }

  const setTimezone = (timezone: string) => {
    settingsStore.set((c) => ({ ...c, timezone }))
    enqueue({ type: 'settings', body: { timezone } })
  }

  return (
    <Page title="Lembretes" back="Mais" subtitle="Receba um aviso diário na hora que você escolher.">
      <div className="stack">
        {support === 'ios-not-installed' && (
          <div className="card stack">
            <p>
              <strong>No iPhone, os lembretes só funcionam com o app instalado</strong> (iOS 16.4 ou superior).
            </p>
            <InstallInstructions />
          </div>
        )}
        {support === 'unsupported' && <p className="notice">Este navegador não oferece notificações push.</p>}
        {support === 'unconfigured' && <p className="notice">Os lembretes não foram configurados neste ambiente (falta a chave VAPID).</p>}
        {auth.status !== 'authed' && (
          <p className="notice">
            Os lembretes ficam ligados à sua conta. <Link to="/mais/conta">Entrar ou criar conta</Link>
          </p>
        )}

        <Section header="Lembrete diário">
          <div className="row">
            <span className="row-main">Ativar lembrete</span>
            <Switch label="Ativar lembrete" checked={enabled} onChange={(v) => void toggle(v)} />
          </div>
          <label className="row">
            <span className="row-main">Horário</span>
            <input type="time" value={settings.notifyTime ?? ''} onChange={(e) => setTime(e.target.value)} aria-label="Horário do lembrete" style={{ background: 'none', border: 0 }} />
          </label>
        </Section>
        <Section header="Comunidade" footer="Avisos de novos pedidos de oração de outros usuários (também aparecem dentro do app).">
          <div className="row">
            <span className="row-main">Avisar sobre novos pedidos</span>
            <Switch
              label="Avisar sobre novos pedidos de oração"
              checked={settings.notifyCommunity}
              onChange={(v) => {
                settingsStore.set((c) => ({ ...c, notifyCommunity: v }))
                enqueue({ type: 'settings', body: { notify_community: v } })
              }}
            />
          </div>
        </Section>
        <Section header="Fuso horário" footer="O lembrete é enviado no horário local deste fuso.">
          <label className="row">
            <span className="row-main">Fuso</span>
            <select
              aria-label="Fuso horário"
              value={settings.timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ background: 'none', border: 0, maxWidth: '55%' }}
            >
              {zones().map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        </Section>
        {enabled && (
          <button className="btn btn-secondary" onClick={() => void sendTest()}>
            Enviar lembrete de teste agora
          </button>
        )}
        {info && <p className="notice" role="status">{info}</p>}
        {msg && <p className="error" role="alert">{msg}</p>}
      </div>
    </Page>
  )
}
