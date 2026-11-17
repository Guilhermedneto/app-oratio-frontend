import { useStore } from '@/offline/store'
import { enqueue } from '@/offline/sync'
import { settingsStore, type Theme } from '@/offline/stores'
import { Page } from '@/shared/ui/Page'
import { Section, Segmented } from '@/shared/ui/controls'

const STEP = 0.1

export default function Ajustes() {
  const s = useStore(settingsStore)
  const setTheme = (theme: Theme) => {
    settingsStore.set((c) => ({ ...c, theme }))
    enqueue({ type: 'settings', body: { theme } })
  }
  const setFont = (v: number) => {
    const fontScale = Math.round(Math.min(1.6, Math.max(0.8, v)) * 10) / 10
    settingsStore.set((c) => ({ ...c, fontScale }))
    enqueue({ type: 'settings', body: { font_scale: fontScale } })
  }
  return (
    <Page title="Ajustes" back="Mais">
      <div className="stack">
        <Section header="Aparência">
          <div className="row" style={{ display: 'block' }}>
            <Segmented<Theme>
              label="Tema"
              value={s.theme}
              onChange={setTheme}
              options={[
                { value: 'auto', label: 'Automático' },
                { value: 'claro', label: 'Claro' },
                { value: 'escuro', label: 'Escuro' },
                { value: 'sepia', label: 'Sépia' },
              ]}
            />
          </div>
        </Section>
        <Section header="Tamanho do texto" footer="Aplica-se a todo o app.">
          <div className="row">
            <button className="btn btn-secondary btn-small" onClick={() => setFont(s.fontScale - STEP)} disabled={s.fontScale <= 0.8} aria-label="Diminuir texto">
              A−
            </button>
            <span className="row-main center" aria-live="polite">{Math.round(s.fontScale * 100)}%</span>
            <button className="btn btn-secondary btn-small" onClick={() => setFont(s.fontScale + STEP)} disabled={s.fontScale >= 1.6} aria-label="Aumentar texto">
              A+
            </button>
          </div>
        </Section>
        <div className="card prose">
          <p>Que o Senhor te abençoe e te guarde. Este é um exemplo do tamanho do texto de leitura.</p>
        </div>
      </div>
    </Page>
  )
}
