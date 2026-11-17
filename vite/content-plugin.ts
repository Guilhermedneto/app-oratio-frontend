import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseFrontmatter, REQUIRED_KEYS } from '../scripts/frontmatter.mjs'
import type { Plugin } from 'vite'

const VIRTUAL = 'virtual:content-index'
const RESOLVED = '\0' + VIRTUAL
const FOLDERS = ['oracoes', 'ritos', 'horas', 'reflexoes', 'textos', 'santos'] as const

/** Gera o índice (metadados) do content/ e falha o build se o frontmatter for inválido. */
export function contentPlugin(contentDir: string): Plugin {
  const build = () => {
    const out: Record<string, { slug: string; titulo: string; categoria: string; versao: string }[]> = {}
    for (const folder of FOLDERS) {
      const dir = resolve(contentDir, folder)
      out[folder] = (existsSync(dir) ? readdirSync(dir) : [])
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
          const { data } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'))
          for (const k of REQUIRED_KEYS)
            if (!data[k]) throw new Error(`content/${folder}/${f}: frontmatter sem "${k}"`)
          return {
            slug: data.slug,
            titulo: data.titulo,
            categoria: data.categoria,
            versao: data.versao,
          }
        })
        .sort((a, b) =>
          folder === 'santos' ? a.slug.localeCompare(b.slug) : a.titulo.localeCompare(b.titulo, 'pt-BR'),
        )
    }
    return `export default ${JSON.stringify(out)}`
  }
  return {
    name: 'oratio-content-index',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? build() : null),
    configureServer(server) {
      // a pasta content/ fica fora da raiz do Vite: vigia explicitamente para o índice não ficar velho
      server.watcher.add(contentDir)
      const refresh = (file: string) => {
        if (!file.startsWith(contentDir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh)
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(contentDir)) {
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
    },
  }
}
