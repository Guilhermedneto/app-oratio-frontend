export type StepKind =
  | 'sinal'
  | 'credo'
  | 'pai-nosso'
  | 'ave-maria'
  | 'gloria'
  | 'misterio'
  | 'o-meu-jesus'
  | 'salve-rainha'
  | 'oracao-final'

export interface Step {
  kind: StepKind
  title: string
  /** slug em content/oracoes */
  prayer?: string
  decade?: number
  /** posição da conta dentro da dezena (1..10) */
  bead?: number
}

const PRAYER_OF: Record<Exclude<StepKind, 'misterio'>, string> = {
  sinal: 'sinal-da-cruz',
  credo: 'credo',
  'pai-nosso': 'pai-nosso',
  'ave-maria': 'ave-maria',
  gloria: 'gloria',
  'o-meu-jesus': 'o-meu-jesus',
  'salve-rainha': 'salve-rainha',
  'oracao-final': 'oracao-final-do-terco',
}

const ORD = ['1º', '2º', '3º', '4º', '5º']

const step = (kind: Exclude<StepKind, 'misterio'>, title: string, extra: Partial<Step> = {}): Step => ({
  kind,
  title,
  prayer: PRAYER_OF[kind],
  ...extra,
})

/** Sequência completa do terço: 7 passos iniciais + 5 × 14 (dezenas) + 3 finais = 80. */
export function buildSteps(): Step[] {
  const s: Step[] = [
    step('sinal', 'Sinal da Cruz'),
    step('credo', 'Creio em Deus Pai'),
    step('pai-nosso', 'Pai-Nosso'),
    step('ave-maria', 'Ave-Maria (pela fé)', { bead: 1 }),
    step('ave-maria', 'Ave-Maria (pela esperança)', { bead: 2 }),
    step('ave-maria', 'Ave-Maria (pela caridade)', { bead: 3 }),
    step('gloria', 'Glória'),
  ]
  for (let d = 1; d <= 5; d++) {
    s.push({ kind: 'misterio', title: `${ORD[d - 1]} mistério`, decade: d })
    s.push(step('pai-nosso', 'Pai-Nosso', { decade: d }))
    for (let b = 1; b <= 10; b++) s.push(step('ave-maria', `Ave-Maria ${b} de 10`, { decade: d, bead: b }))
    s.push(step('gloria', 'Glória', { decade: d }))
    s.push(step('o-meu-jesus', 'Ó meu Jesus', { decade: d }))
  }
  s.push(step('salve-rainha', 'Salve Rainha'))
  s.push(step('oracao-final', 'Oração final'))
  s.push(step('sinal', 'Sinal da Cruz'))
  return s
}

export const STEPS = buildSteps()
export const LAST_INDEX = STEPS.length - 1

export function clampIndex(i: number): number {
  return Math.min(Math.max(i, 0), LAST_INDEX)
}

export function next(i: number): number {
  return clampIndex(i + 1)
}
export function prev(i: number): number {
  return clampIndex(i - 1)
}
export function isFinished(i: number): boolean {
  return i >= LAST_INDEX
}

/** Dezena atual (0 = orações iniciais/finais). */
export function decadeAt(i: number): number {
  return STEPS[clampIndex(i)].decade ?? 0
}

/** Contas já rezadas na dezena (0..10) */
export function beadsDone(i: number): number {
  const st = STEPS[clampIndex(i)]
  if (!st.decade) return 0
  if (st.kind === 'gloria' || st.kind === 'o-meu-jesus') return 10
  return st.kind === 'ave-maria' ? (st.bead ?? 0) : 0
}

export function progressLabel(i: number): string {
  const d = decadeAt(i)
  if (d) return `Dezena ${d} de 5`
  return i <= 6 ? 'Orações iniciais' : 'Orações finais'
}
