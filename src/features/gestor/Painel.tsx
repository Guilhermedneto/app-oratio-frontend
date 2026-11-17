import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '@/api/client'
import type { Category, ManagedContent } from '@/api/types'
import { useAuth } from '@/features/conta/auth'
import { PedidoList } from '@/features/comunidade/Comunidade'
import { CATEGORY_LABEL } from '@/features/docs/Docs'
import { KIND_LABEL, useCategories } from '@/features/docs/managed'
import { Page } from '@/shared/ui/Page'
import { Empty, Segmented, Section } from '@/shared/ui/controls'

type Tab = 'conteudos' | 'categorias' | 'moderacao'

export function ManagerOnly({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth()
  if (auth.status === 'loading')
    return (
      <Page title={title} back="Mais">
        <p className="muted center">Verificando sessão…</p>
      </Page>
    )
  if (auth.user?.role !== 'manager')
    return (
      <Page title={title} back="Mais">
        <Empty>Acesso restrito ao gestor.</Empty>
      </Page>
    )
  return <>{children}</>
}

function useAllContents() {
  return useQuery({
    queryKey: ['gestor-conteudos'],
    queryFn: () => api.get<ManagedContent[]>('/gestor/conteudos'),
    networkMode: 'online',
  })
}

function Conteudos() {
  const qc = useQueryClient()
  const q = useAllContents()
  const cats = useCategories()
  const label = (slug: string) => CATEGORY_LABEL[slug] ?? cats.data?.find((c) => c.slug === slug)?.name ?? slug
  const [error, setError] = useState('')
  const reload = () => {
    void qc.invalidateQueries({ queryKey: ['gestor-conteudos'] })
    void qc.invalidateQueries({ queryKey: ['conteudos'] })
  }
  const act = async (fn: () => Promise<unknown>) => {
    setError('')
    try {
      await fn()
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na operação.')
    }
  }
  const remove = (c: ManagedContent) => {
    if (window.confirm(`Excluir “${c.title}” definitivamente?`)) void act(() => api.delete(`/gestor/conteudos/${c.id}`))
  }
  const toggle = (c: ManagedContent) =>
    act(() =>
      api.put(`/gestor/conteudos/${c.id}`, {
        kind: c.kind,
        title: c.title,
        category: c.category,
        body: c.body,
        author: c.author,
        origin: c.origin,
        source_url: c.source_url,
        published: !c.published,
      }),
    )
  return (
    <div className="stack">
      <Link className="btn" to="/mais/gestor/conteudo/novo">
        Novo conteúdo
      </Link>
      {q.isPending && <p className="muted center">Carregando…</p>}
      {q.data?.length === 0 && <Empty>Nenhum conteúdo cadastrado ainda.</Empty>}
      {q.data && q.data.length > 0 && (
        <Section header={`${q.data.length} conteúdo(s)`}>
          {q.data.map((c) => (
            <div key={c.id} className="manage-row">
              <div>
                <p className="manage-title">{c.title}</p>
                <p className="manage-detail">
                  <span className="chip">{KIND_LABEL[c.kind]}</span> {label(c.category)}
                  {c.author ? ` · ${c.author}` : ''}
                  {c.published ? '' : ' · oculto'}
                </p>
              </div>
              <div className="manage-actions">
                <Link className="pill-btn" to={`/mais/gestor/conteudo/${c.id}`}>
                  Editar
                </Link>
                <button className="pill-btn" onClick={() => void toggle(c)}>
                  {c.published ? 'Ocultar' : 'Exibir'}
                </button>
                <button className="pill-btn pill-danger" onClick={() => remove(c)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}

function Categorias() {
  const qc = useQueryClient()
  const cats = useCategories()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const reload = () => void qc.invalidateQueries({ queryKey: ['categorias'] })
  const create = async () => {
    setError('')
    try {
      await api.post<Category>('/gestor/categorias', { name: name.trim() })
      setName('')
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao criar a categoria.')
    }
  }
  const remove = async (c: Category) => {
    setError('')
    try {
      await api.delete(`/gestor/categorias/${c.id}`)
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao excluir a categoria.')
    }
  }
  return (
    <div className="stack">
      <Section header="Nova categoria" footer="As categorias já existentes do app (Orações básicas, Marianas etc.) continuam disponíveis ao classificar.">
        <div className="row">
          <input className="field" style={{ background: 'transparent' }} aria-label="Nome da categoria" placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-small" disabled={name.trim().length < 2} onClick={() => void create()}>
            Criar
          </button>
        </div>
      </Section>
      {cats.data && cats.data.length > 0 && (
        <Section header="Categorias criadas">
          {cats.data.map((c) => (
            <div key={c.slug} className="row">
              <span className="row-main">{c.name}</span>
              <button className="link-btn" style={{ color: 'var(--danger)' }} onClick={() => void remove(c)}>
                Excluir
              </button>
            </div>
          ))}
        </Section>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}

export default function Painel() {
  const [tab, setTab] = useState<Tab>('conteudos')
  return (
    <ManagerOnly title="Painel do gestor">
      <Page title="Painel do gestor" back="Mais" subtitle="Cadastre conteúdos, organize categorias e modere a comunidade.">
        <div className="stack">
          <Segmented<Tab>
            label="Seção"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'conteudos', label: 'Conteúdos' },
              { value: 'categorias', label: 'Categorias' },
              { value: 'moderacao', label: 'Moderação' },
            ]}
          />
          {tab === 'conteudos' && <Conteudos />}
          {tab === 'categorias' && <Categorias />}
          {tab === 'moderacao' && (
            <>
              <p className="notice">Como gestor, você pode remover qualquer pedido ou comentário fora de conformidade.</p>
              <PedidoList tab="todos" moderator />
            </>
          )}
        </div>
      </Page>
    </ManagerOnly>
  )
}
