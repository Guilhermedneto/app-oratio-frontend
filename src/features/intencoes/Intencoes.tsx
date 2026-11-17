import { useState } from 'react'
import { useStore } from '@/offline/store'
import { enqueue } from '@/offline/sync'
import { intentionsStore, uid, type IntentionItem } from '@/offline/stores'
import { Page } from '@/shared/ui/Page'
import { Empty, Section, Sheet } from '@/shared/ui/controls'

export default function Intencoes() {
  const items = useStore(intentionsStore)
  const [editing, setEditing] = useState<IntentionItem | 'new' | null>(null)
  const [text, setText] = useState('')
  const open = items.filter((i) => !i.answered_at)
  const answered = items.filter((i) => i.answered_at)

  const openSheet = (i: IntentionItem | 'new') => {
    setEditing(i)
    setText(i === 'new' ? '' : i.text)
  }
  const save = () => {
    const t = text.trim()
    if (!t) return
    if (editing === 'new') {
      const item = { id: uid(), text: t, created_at: new Date().toISOString(), answered_at: null }
      intentionsStore.set((l) => [item, ...l])
      enqueue({ type: 'intention-create', body: { id: item.id, text: t } })
    } else if (editing) {
      const id = editing.id
      intentionsStore.set((l) => l.map((i) => (i.id === id ? { ...i, text: t } : i)))
      enqueue({ type: 'intention-patch', body: { id, text: t } })
    }
    setEditing(null)
  }
  const toggle = (i: IntentionItem) => {
    const answeredNow = !i.answered_at
    intentionsStore.set((l) =>
      l.map((x) => (x.id === i.id ? { ...x, answered_at: answeredNow ? new Date().toISOString() : null } : x)),
    )
    enqueue({ type: 'intention-patch', body: { id: i.id, answered: answeredNow } })
  }
  const remove = (i: IntentionItem) => {
    intentionsStore.set((l) => l.filter((x) => x.id !== i.id))
    enqueue({ type: 'intention-delete', body: { id: i.id } })
    setEditing(null)
  }

  const renderRow = (i: IntentionItem) => (
    <div key={i.id} className="row">
      <button
        aria-label={i.answered_at ? 'Marcar como não atendida' : 'Marcar como atendida'}
        aria-pressed={Boolean(i.answered_at)}
        onClick={() => toggle(i)}
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: i.answered_at ? 'var(--accent)' : 'transparent',
          color: '#fff',
          flex: 'none',
        }}
      >
        {i.answered_at ? '✓' : ''}
      </button>
      <button className="row-main" style={{ textAlign: 'left' }} onClick={() => openSheet(i)}>
        <span className="row-title" style={i.answered_at ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
          {i.text}
        </span>
      </button>
    </div>
  )

  return (
    <Page
      title="Intenções"
      back="Mais"
      subtitle="Pessoas e pedidos que você leva à oração."
      trailing={
        <button className="link-btn" onClick={() => openSheet('new')} aria-label="Nova intenção">
          Nova
        </button>
      }
    >
      <div className="stack">
        {items.length === 0 && <Empty>Nenhuma intenção ainda. Toque em “Nova”.</Empty>}
        {open.length > 0 && <Section header="Em oração">{open.map(renderRow)}</Section>}
        {answered.length > 0 && <Section header="Atendidas">{answered.map(renderRow)}</Section>}
      </div>
      {editing && (
        <Sheet title={editing === 'new' ? 'Nova intenção' : 'Editar intenção'} onClose={() => setEditing(null)}>
          <div className="stack">
            <textarea
              className="field"
              aria-label="Texto da intenção"
              placeholder="Por quem ou pelo que você quer rezar?"
              value={text}
              maxLength={2000}
              autoFocus
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn" disabled={!text.trim()} onClick={save}>
              Salvar
            </button>
            {editing !== 'new' && (
              <button className="btn btn-danger" onClick={() => remove(editing)}>
                Excluir
              </button>
            )}
          </div>
        </Sheet>
      )}
    </Page>
  )
}
