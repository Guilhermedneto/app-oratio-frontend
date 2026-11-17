import { describe, expect, it } from 'vitest'
import {
  beadsDone,
  buildSteps,
  clampIndex,
  decadeAt,
  isFinished,
  LAST_INDEX,
  next,
  prev,
  progressLabel,
  STEPS,
} from './rosary'

describe('sequência do terço', () => {
  it('tem 5 dezenas com 10 Ave-Marias cada, mais 3 iniciais', () => {
    const aves = STEPS.filter((s) => s.kind === 'ave-maria')
    expect(aves).toHaveLength(53)
    for (let d = 1; d <= 5; d++) {
      expect(STEPS.filter((s) => s.decade === d && s.kind === 'ave-maria')).toHaveLength(10)
      expect(STEPS.filter((s) => s.decade === d && s.kind === 'misterio')).toHaveLength(1)
    }
    expect(STEPS).toHaveLength(80)
  })
  it('começa pelo sinal da cruz e Credo e termina com Salve Rainha e oração final', () => {
    const s = buildSteps()
    expect(s.slice(0, 3).map((x) => x.kind)).toEqual(['sinal', 'credo', 'pai-nosso'])
    expect(s.at(-3)?.kind).toBe('salve-rainha')
    expect(s.at(-2)?.kind).toBe('oracao-final')
    expect(s.at(-1)?.kind).toBe('sinal')
  })
  it('cada dezena segue: mistério, Pai-Nosso, 10 Ave-Marias, Glória, Ó meu Jesus', () => {
    const dec = STEPS.filter((s) => s.decade === 2).map((s) => s.kind)
    expect(dec).toEqual(['misterio', 'pai-nosso', ...Array(10).fill('ave-maria'), 'gloria', 'o-meu-jesus'])
  })
})

describe('navegação e retomada', () => {
  it('não passa dos limites', () => {
    expect(prev(0)).toBe(0)
    expect(next(LAST_INDEX)).toBe(LAST_INDEX)
    expect(clampIndex(-5)).toBe(0)
    expect(clampIndex(999)).toBe(LAST_INDEX)
  })
  it('detecta o fim', () => {
    expect(isFinished(LAST_INDEX - 1)).toBe(false)
    expect(isFinished(LAST_INDEX)).toBe(true)
  })
  it('conta contas e dezena para exibir a retomada', () => {
    const i = STEPS.findIndex((s) => s.decade === 3 && s.bead === 4)
    expect(decadeAt(i)).toBe(3)
    expect(beadsDone(i)).toBe(4)
    expect(progressLabel(i)).toBe('Dezena 3 de 5')
    expect(progressLabel(2)).toBe('Orações iniciais')
    expect(progressLabel(LAST_INDEX)).toBe('Orações finais')
  })
})
