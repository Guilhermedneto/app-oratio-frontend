import { Fragment, type ReactNode } from 'react'

/** Markdown mínimo e seguro (sem HTML cru): títulos, listas, citações, **negrito**, *itálico*. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    out.push(
      tok.startsWith('**') ? (
        <strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>
      ) : (
        <em key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</em>
      ),
    )
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function lines(text: string, key: string): ReactNode {
  const parts = text.split('\n')
  return parts.map((l, i) => (
    <Fragment key={i}>
      {inline(l, `${key}-${i}`)}
      {i < parts.length - 1 && <br />}
    </Fragment>
  ))
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/)
  const nodes: ReactNode[] = []
  blocks.forEach((block, bi) => {
    const b = block.trim()
    if (!b) return
    const key = `b${bi}`
    if (/^#{2,3}\s/.test(b) && !b.includes('\n')) {
      const level = b.startsWith('###') ? 3 : 2
      const text = b.replace(/^#{2,3}\s+/, '')
      nodes.push(level === 2 ? <h2 key={key}>{text}</h2> : <h3 key={key}>{text}</h3>)
      return
    }
    // título seguido de conteúdo no mesmo bloco
    const headMatch = /^(#{2,3})\s+(.+)\n([\s\S]+)$/.exec(b)
    if (headMatch) {
      const Tag = headMatch[1].length === 2 ? 'h2' : 'h3'
      nodes.push(<Tag key={`${key}h`}>{headMatch[2]}</Tag>)
      nodes.push(<Markdown key={`${key}c`} source={headMatch[3]} />)
      return
    }
    const ls = b.split('\n')
    if (ls.every((l) => /^>\s?/.test(l))) {
      nodes.push(<blockquote key={key}>{lines(ls.map((l) => l.replace(/^>\s?/, '')).join('\n'), key)}</blockquote>)
    } else if (ls.every((l) => /^[-*]\s+/.test(l))) {
      nodes.push(
        <ul key={key}>
          {ls.map((l, i) => (
            <li key={i}>{inline(l.replace(/^[-*]\s+/, ''), `${key}-${i}`)}</li>
          ))}
        </ul>,
      )
    } else if (ls.every((l) => /^\d+\.\s+/.test(l))) {
      nodes.push(
        <ol key={key}>
          {ls.map((l, i) => (
            <li key={i}>{inline(l.replace(/^\d+\.\s+/, ''), `${key}-${i}`)}</li>
          ))}
        </ol>,
      )
    } else {
      nodes.push(<p key={key}>{lines(b, key)}</p>)
    }
  })
  return <>{nodes}</>
}
