import { DocList, DocView } from '@/features/docs/Docs'

export const OracoesList = () => <DocList folder="oracoes" title="Orações" base="/oracoes" search />
export const OracaoView = () => <DocView folder="oracoes" backLabel="Orações" />
export const RitosList = () => <DocList folder="ritos" title="Ritos" base="/mais/ritos" back />
export const RitoView = () => <DocView folder="ritos" backLabel="Ritos" />
export const HorasList = () => (
  <DocList
    folder="horas"
    title="Liturgia das Horas"
    base="/mais/horas"
    back
  />
)
export const HoraView = () => <DocView folder="horas" backLabel="Horas" />
export const ReflexoesList = () => <DocList folder="reflexoes" title="Reflexões" base="/mais/reflexoes" back />
export const TextosList = () => (
  <DocList
    folder="textos"
    title="Textos dos grandes nomes"
    base="/mais/textos"
    back
    search
  />
)
export const TextoView = () => <DocView folder="textos" backLabel="Textos" />
export const SantosList = () => <DocList folder="santos" title="Santos" base="/mais/santos" back search />
export const SantoView = () => <DocView folder="santos" backLabel="Santos" />
export const TercoGuiaView = () => <DocView folder="terco" backLabel="Terço" />
export const ReflexaoView = () => <DocView folder="reflexoes" backLabel="Reflexões" />
