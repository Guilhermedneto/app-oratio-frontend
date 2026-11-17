import index from 'virtual:content-index'

export interface DocMeta {
  slug: string
  titulo: string
  categoria: string
  versao: string
}
export type Folder = 'oracoes' | 'ritos' | 'horas' | 'reflexoes' | 'textos' | 'santos'

export const contentIndex = index as Record<Folder, DocMeta[]>

const files: Record<Folder, Record<string, () => Promise<string>>> = {
  oracoes: import.meta.glob('@content/oracoes/*.md', { query: '?raw', import: 'default' }) as never,
  ritos: import.meta.glob('@content/ritos/*.md', { query: '?raw', import: 'default' }) as never,
  horas: import.meta.glob('@content/horas/*.md', { query: '?raw', import: 'default' }) as never,
  reflexoes: import.meta.glob('@content/reflexoes/*.md', { query: '?raw', import: 'default' }) as never,
  textos: import.meta.glob('@content/textos/*.md', { query: '?raw', import: 'default' }) as never,
  santos: import.meta.glob('@content/santos/*.md', { query: '?raw', import: 'default' }) as never,
}
const santos = import.meta.glob('@content/santos/*.md', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>
export function stripFrontmatter(src: string): string {
  return src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
}

function pick<T>(map: Record<string, () => Promise<T>>, name: string, ext: string): (() => Promise<T>) | undefined {
  const key = Object.keys(map).find((k) => k.endsWith(`/${name}.${ext}`))
  return key ? map[key] : undefined
}

export async function loadDoc(folder: Folder, slug: string): Promise<string | null> {
  const loader = pick(files[folder], slug, 'md')
  return loader ? stripFrontmatter(await loader()) : null
}

export async function loadSaint(monthDay: string): Promise<{ titulo: string; bio: string } | null> {
  const loader = pick(santos, monthDay, 'md')
  if (!loader) return null
  const raw = await loader()
  const titulo = /^titulo:\s*(.+)$/m.exec(raw)?.[1]?.trim() ?? ''
  return { titulo, bio: stripFrontmatter(raw) }
}
