import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { computeStreak } from '../utils'
import { Markdown } from './Markdown'

describe('Markdown', () => {
  it('renderiza títulos, listas, negrito e itálico sem HTML cru', () => {
    const { container } = render(
      <Markdown source={'## Título\n\nTexto **forte** e *suave* <script>x</script>\n\n- um\n- dois\n\n> citação'} />,
    )
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument()
    expect(container.querySelector('strong')?.textContent).toBe('forte')
    expect(container.querySelector('em')?.textContent).toBe('suave')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('blockquote')).not.toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>x</script>')
  })
  it('mantém quebras de linha', () => {
    const { container } = render(<Markdown source={'V. linha 1\nR. linha 2'} />)
    expect(container.querySelectorAll('br')).toHaveLength(1)
  })
})

describe('sequência de dias', () => {
  it('conta dias consecutivos e aceita ontem como último dia', () => {
    expect(computeStreak(['2026-05-10', '2026-05-09', '2026-05-08'], '2026-05-10')).toBe(3)
    expect(computeStreak(['2026-05-09', '2026-05-08'], '2026-05-10')).toBe(2)
    expect(computeStreak(['2026-05-07'], '2026-05-10')).toBe(0)
    expect(computeStreak([], '2026-05-10')).toBe(0)
    expect(computeStreak(['2026-05-10', '2026-05-10', '2026-05-08'], '2026-05-10')).toBe(1)
  })
})
