import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '@/api/client'
import type { Category, ContentIn, ManagedContent } from '@/api/types'
import { contentIndex, type Folder } from '@/content/loader'
import { CATEGORY_LABEL } from '@/features/docs/Docs'
import { KIND_LABEL, useCategories, type ContentKind } from '@/features/docs/managed'
import { Markdown } from '@/shared/ui/Markdown'
import { Page } from '@/shared/ui/Page'
import { Switch } from '@/shared/ui/controls'
import { ManagerOnly } from './Painel'

const FOLDER_OF: Record<ContentKind, Folder | null> = {
  oracao: 'oracoes',
  texto: 'textos',
  reflexao: 'reflexoes',
  rito: 'ritos',
  hora: 'horas',
  santo: 'santos',
  terco: null,
  novena: null,
  misterio: null,
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Categorias sugeridas por tipo (além das que já existem no app e das criadas pelo gestor). */
const DEFAULT_CATEGORIES: Record<ContentKind, string[]> = {
  oracao: ['basicas', 'marianas', 'diarias', 'devocionais', 'ladainhas', 'penitencia', 'espirito-santo', 'eucaristia', 'familia', 'falecidos', 'confianca', 'igreja', 'santos'],
  texto: [],
  reflexao: ['vida-de-oracao', 'virtudes', 'tempos', 'familia'],
  rito: ['missa', 'adoracao', 'penitencia', 'devocionais'],
  hora: ['horas'],
  santo: MONTHS,
  terco: ['tercos'],
  novena: ['novenas'],
  misterio: ['tercos'],
}

const NEW_CATEGORY = '__nova__'
const slugOf = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

interface Option {
  slug: string
  label: string
}

/** Categorias já existentes para o tipo (as do app + as sugeridas + as criadas por gestores). */
function useOptions(kind: ContentKind, custom: Category[] | undefined): Option[] {
  return useMemo(() => {
    const folder = FOLDER_OF[kind]
    const fixed = new Set<string>(DEFAULT_CATEGORIES[kind].map((c) => (kind === 'santo' ? slugOf(c) : c)))
    if (folder) for (const d of contentIndex[folder] ?? []) fixed.add(d.categoria)
    const opts: Option[] = [...fixed].map((slug) => ({
      slug,
      label: CATEGORY_LABEL[slug] ?? MONTHS.find((m) => slugOf(m) === slug) ?? slug,
    }))
    for (const c of custom ?? []) if (!opts.some((o) => o.slug === c.slug)) opts.push({ slug: c.slug, label: c.name })
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [kind, custom])
}

interface Day {
  title: string
  text: string
}
interface Mystery {
  title: string
  fruit: string
  meditation: string
}
const emptyDays = (): Day[] => Array.from({ length: 9 }, (_, i) => ({ title: `Dia ${i + 1}`, text: '' }))
const emptyMysteries = (): Mystery[] => Array.from({ length: 5 }, () => ({ title: '', fruit: '', meditation: '' }))

const EMPTY: ContentIn = {
  kind: 'oracao',
  title: '',
  category: '',
  body: '',
  author: '',
  origin: '',
  source_url: '',
  slug: '',
  published: true,
}

type Obj = Record<string, unknown>
const asObj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})
const asStr = (v: unknown) => (typeof v === 'string' ? v : '')

export default function Editor() {
  const { id = 'novo' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const editing = id !== 'novo'
  const cats = useCategories()
  const existing = useQuery({
    queryKey: ['gestor-conteudos'],
    queryFn: () => api.get<ManagedContent[]>('/gestor/conteudos'),
    enabled: editing,
  })
  const [form, setForm] = useState<ContentIn>(EMPTY)
  const [newCat, setNewCat] = useState('')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [days, setDays] = useState<Day[]>(emptyDays)
  const [finalPrayer, setFinalPrayer] = useState('')
  const [mysteries, setMysteries] = useState<Mystery[]>(emptyMysteries)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const options = useOptions(form.kind, cats.data)

  useEffect(() => {
    const c = existing.data?.find((x) => x.id === id)
    if (!c) return
    setForm({
      kind: c.kind,
      title: c.title,
      category: c.category,
      body: c.body,
      author: c.author ?? '',
      origin: c.origin ?? '',
      source_url: c.source_url ?? '',
      slug: c.slug,
      published: c.published,
    })
    const d = asObj(c.data)
    if (c.kind === 'santo') {
      const [m, dd] = asStr(d.date).split('-')
      setMonth(m ? String(Number(m)) : '')
      setDay(dd ? String(Number(dd)) : '')
    }
    if (c.kind === 'novena' && Array.isArray(d.days)) {
      setDays(d.days.map((x, i) => ({ title: asStr(asObj(x).title) || `Dia ${i + 1}`, text: asStr(asObj(x).text) })))
      setFinalPrayer(asStr(d.final_prayer))
    }
    if (c.kind === 'misterio') {
      if (Array.isArray(d.mysteries))
        setMysteries(d.mysteries.map((x) => ({ title: asStr(asObj(x).title), fruit: asStr(asObj(x).fruit), meditation: asStr(asObj(x).meditation) })))
      setWeekdays(Array.isArray(d.weekdays) ? d.weekdays.filter((w): w is number => typeof w === 'number') : [])
    }
  }, [existing.data, id])

  const set = <K extends keyof ContentIn>(k: K, v: ContentIn[K]) => setForm((f) => ({ ...f, [k]: v }))
  const kind = form.kind
  const structured = kind === 'novena' || kind === 'misterio' || kind === 'santo'
  const creatingCategory = form.category === NEW_CATEGORY

  const complete =
    kind === 'novena'
      ? days.length === 9 && days.every((d) => d.text.trim())
      : kind === 'misterio'
        ? mysteries.length === 5 && mysteries.every((m) => m.title.trim())
        : kind === 'santo'
          ? Boolean(month && day) && Boolean(form.body.trim())
          : Boolean(form.body.trim())
  const valid = Boolean(form.title.trim() && complete && (creatingCategory ? newCat.trim().length >= 2 : form.category))

  const buildData = (): Record<string, unknown> | undefined => {
    if (kind === 'santo') return { date: `${month.padStart(2, '0')}-${day.padStart(2, '0')}` }
    if (kind === 'novena') return { days, final_prayer: finalPrayer }
    if (kind === 'misterio') return { mysteries, weekdays }
    return undefined
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      let category = form.category
      if (creatingCategory) {
        const c = await api.post<Category>('/gestor/categorias', { name: newCat.trim() })
        category = c.slug
        void qc.invalidateQueries({ queryKey: ['categorias'] })
      }
      const payload = {
        ...form,
        category,
        slug: form.slug?.trim() || undefined,
        body: form.body.trim() || form.title.trim(),
        data: buildData(),
      }
      if (editing) await api.put(`/gestor/conteudos/${id}`, payload)
      else await api.post('/gestor/conteudos', payload)
      await qc.invalidateQueries({ queryKey: ['gestor-conteudos'] })
      await qc.invalidateQueries({ queryKey: ['conteudos'] })
      nav('/mais/gestor')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Verifique a conexão.')
    } finally {
      setBusy(false)
    }
  }

  const title = editing ? 'Editar conteúdo' : 'Novo conteúdo'
  const bodyLabel =
    kind === 'santo' ? 'Biografia' : kind === 'novena' ? 'Apresentação da novena (opcional)' : kind === 'misterio' ? 'Apresentação (opcional)' : 'Texto'

  return (
    <ManagerOnly title={title}>
      <Page title={title} back="Painel">
        <form className="stack" onSubmit={(e) => void save(e)}>
          <div className="group">
            <label className="row">
              <span className="row-main">Tipo</span>
              <select
                aria-label="Tipo"
                value={kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ContentKind, category: '' }))}
                style={{ background: 'none', border: 0 }}
              >
                {(Object.keys(KIND_LABEL) as ContentKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <input className="field" aria-label="Título" placeholder="Título" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} required />
            <label className="row">
              <span className="row-main">Categoria</span>
              <select aria-label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)} style={{ background: 'none', border: 0, maxWidth: '60%' }}>
                <option value="">Escolher…</option>
                {options.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>＋ Nova categoria…</option>
              </select>
            </label>
            {creatingCategory && (
              <input className="field" aria-label="Nome da nova categoria" placeholder="Nome da nova categoria" maxLength={80} value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            )}
          </div>

          {kind === 'santo' && (
            <div className="group">
              <label className="row">
                <span className="row-main">Mês da festa</span>
                <select aria-label="Mês da festa" value={month} onChange={(e) => setMonth(e.target.value)} style={{ background: 'none', border: 0 }}>
                  <option value="">Escolher…</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="row">
                <span className="row-main">Dia da festa</span>
                <select aria-label="Dia da festa" value={day} onChange={(e) => setDay(e.target.value)} style={{ background: 'none', border: 0 }}>
                  <option value="">Escolher…</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="group">
            <input className="field" aria-label="Autor" placeholder="Quem escreveu (autor)" maxLength={200} value={form.author ?? ''} onChange={(e) => set('author', e.target.value)} />
            <input className="field" aria-label="Origem" placeholder="De onde vem (obra, livro, documento…)" maxLength={300} value={form.origin ?? ''} onChange={(e) => set('origin', e.target.value)} />
            <input className="field" aria-label="Link da fonte" type="url" placeholder="Link da fonte (opcional)" maxLength={500} value={form.source_url ?? ''} onChange={(e) => set('source_url', e.target.value)} />
          </div>

          <div className="stack">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">{bodyLabel} (aceita Markdown)</span>
              <button type="button" className="link-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setPreview(!preview)}>
                {preview ? 'Editar' : 'Pré-visualizar'}
              </button>
            </div>
            {preview ? (
              <article className="prose card">
                <Markdown source={form.body || '*Nada para mostrar ainda.*'} />
              </article>
            ) : (
              <textarea
                className="field"
                aria-label="Texto"
                placeholder="Escreva o texto aqui. Use **negrito**, *itálico*, ## título e listas com -."
                style={{ minHeight: structured ? 110 : 220 }}
                maxLength={20000}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
              />
            )}
          </div>

          {kind === 'novena' && (
            <div className="stack">
              <p className="section-header" style={{ padding: 0 }}>Os nove dias</p>
              {days.map((d, i) => (
                <div key={i} className="group">
                  <input className="field" aria-label={`Título do dia ${i + 1}`} placeholder={`Dia ${i + 1} — título`} maxLength={200} value={d.title} onChange={(e) => setDays((cur) => cur.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <textarea className="field" aria-label={`Texto do dia ${i + 1}`} placeholder={`Texto do dia ${i + 1}`} style={{ minHeight: 90 }} maxLength={5000} value={d.text} onChange={(e) => setDays((cur) => cur.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                </div>
              ))}
              <textarea className="field" aria-label="Oração final" placeholder="Oração final (opcional)" style={{ minHeight: 90 }} maxLength={5000} value={finalPrayer} onChange={(e) => setFinalPrayer(e.target.value)} />
            </div>
          )}

          {kind === 'misterio' && (
            <div className="stack">
              <p className="section-header" style={{ padding: 0 }}>Os cinco mistérios</p>
              {mysteries.map((m, i) => (
                <div key={i} className="group">
                  <input className="field" aria-label={`Título do mistério ${i + 1}`} placeholder={`${i + 1}º mistério — título`} maxLength={200} value={m.title} onChange={(e) => setMysteries((cur) => cur.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <input className="field" aria-label={`Fruto do mistério ${i + 1}`} placeholder="Fruto do mistério (opcional)" maxLength={200} value={m.fruit} onChange={(e) => setMysteries((cur) => cur.map((x, j) => (j === i ? { ...x, fruit: e.target.value } : x)))} />
                  <textarea className="field" aria-label={`Meditação do mistério ${i + 1}`} placeholder="Meditação (opcional)" style={{ minHeight: 80 }} maxLength={3000} value={m.meditation} onChange={(e) => setMysteries((cur) => cur.map((x, j) => (j === i ? { ...x, meditation: e.target.value } : x)))} />
                </div>
              ))}
              <p className="muted">Dias da semana em que este conjunto é sugerido:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Dias da semana">
                {WEEKDAYS.map((w, i) => (
                  <button
                    type="button"
                    key={w}
                    className="pill-btn"
                    aria-pressed={weekdays.includes(i)}
                    style={weekdays.includes(i) ? { background: 'var(--accent)', color: 'var(--accent-contrast)' } : undefined}
                    onClick={() => setWeekdays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()))}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="group">
            <input
              className="field"
              aria-label="Identificador (opcional)"
              placeholder="Identificador na web (opcional)"
              maxLength={100}
              value={form.slug ?? ''}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
            />
            <p className="muted" style={{ padding: '4px 16px 12px', fontSize: '0.8rem' }}>
              Gerado do título se ficar em branco. Para as orações lidas no terço guiado, use exatamente: sinal-da-cruz, credo, pai-nosso, ave-maria, gloria, o-meu-jesus, salve-rainha, oracao-final-do-terco.
            </p>
          </div>

          <div className="group">
            <div className="row">
              <span className="row-main">Publicado (visível para todos)</span>
              <Switch label="Publicado" checked={form.published ?? true} onChange={(v) => set('published', v)} />
            </div>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={!valid || busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </Page>
    </ManagerOnly>
  )
}
