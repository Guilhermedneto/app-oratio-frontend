// Valida o frontmatter de content/**/*.md e o JSON de misterios/novenas. Falha o build se inválido.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, REQUIRED_KEYS } from './frontmatter.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../content')
const errors = []
const slugs = new Map()

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

for (const file of existsSync(root) ? walk(root) : []) {
  const rel = relative(root, file).replaceAll('\\', '/')
  if (file.endsWith('.md')) {
    const { data } = parseFrontmatter(readFileSync(file, 'utf8'))
    for (const k of REQUIRED_KEYS) if (!data[k]) errors.push(`${rel}: frontmatter sem "${k}"`)
    const folder = rel.split('/')[0]
    const expected = rel.split('/').pop().replace(/\.md$/, '')
    if (folder !== 'santos' && data.slug && data.slug !== expected)
      errors.push(`${rel}: slug "${data.slug}" difere do nome do arquivo`)
    if (data.slug) {
      const key = `${folder}/${data.slug}`
      if (slugs.has(key)) errors.push(`${rel}: slug duplicado (${slugs.get(key)})`)
      slugs.set(key, rel)
    }
  } else if (file.endsWith('.json')) {
    try {
      const json = JSON.parse(readFileSync(file, 'utf8'))
      if (rel.startsWith('novenas/') && (!Array.isArray(json.dias) || json.dias.length !== 9))
        errors.push(`${rel}: novena precisa de exatamente 9 dias`)
      if (rel.startsWith('misterios/') && (!Array.isArray(json.misterios) || json.misterios.length !== 5))
        errors.push(`${rel}: precisa de 5 mistérios`)
    } catch (e) {
      errors.push(`${rel}: JSON inválido (${e.message})`)
    }
  }
}

if (errors.length) {
  console.error('Conteúdo inválido:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log(`content OK (${slugs.size} documentos)`)
