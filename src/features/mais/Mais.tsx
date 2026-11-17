import { useState } from 'react'
import { useNewRequests } from '@/features/comunidade/hooks'
import { useStore } from '@/offline/store'
import { intentionsStore } from '@/offline/stores'
import { InstallInstructions, useInstall } from '@/shared/install'
import { Page } from '@/shared/ui/Page'
import { Row, Section, Sheet } from '@/shared/ui/controls'
import { useAuth } from '@/features/conta/auth'
import { useFavorites } from '@/features/favoritos/useFavorites'

const color = (c: string) => c

export default function Mais() {
  const auth = useAuth()
  const intentions = useStore(intentionsStore)
  const { items: favs } = useFavorites()
  const install = useInstall()
  const novos = useNewRequests()
  const [help, setHelp] = useState(false)

  return (
    <Page title="Mais">
      <div className="stack">
        <Section header="Rezar">
          <Row to="/mais/ritos" title="Ritos" detail="Missa, adoração, confissão, Via Sacra" iconColor={color('#af52de')} icon={<span>✝</span>} />
          <Row to="/mais/horas" title="Liturgia das Horas" detail="Laudes, Vésperas e Completas (parcial)" iconColor={color('#5856d6')} icon={<span>☾</span>} />
          <Row to="/mais/textos" title="Textos dos grandes nomes" detail="Agostinho, Teresa, Francisco e outros" iconColor={color('#34c759')} icon={<span>❝</span>} />
          <Row to="/mais/santos" title="Santos" detail="Vida breve de cada santo do calendário" iconColor={color('#ff3b30')} icon={<span>★</span>} />
          <Row to="/mais/reflexoes" title="Reflexões" iconColor={color('#ff9500')} icon={<span>✎</span>} />
        </Section>
        <Section header="Comunidade">
          <Row
            to="/mais/comunidade"
            title="Pedidos de oração"
            detail="Reze pelos outros e peça que rezem por você"
            iconColor={color('#ff2d55')}
            icon={<span>🙏</span>}
            value={novos?.count ? `${novos.count} novo${novos.count > 1 ? 's' : ''}` : undefined}
          />
          {auth.user?.role === 'manager' && (
            <Row to="/mais/gestor" title="Painel do gestor" detail="Conteúdos, categorias e moderação" iconColor={color('#1c1c1e')} icon={<span>⚙</span>} />
          )}
        </Section>
        <Section header="Meu espaço">
          <Row to="/mais/intencoes" title="Intenções" value={intentions.filter((i) => !i.answered_at).length || undefined} />
          <Row to="/mais/favoritos" title="Favoritos" value={favs.length || undefined} />
          <Row to="/mais/lembretes" title="Lembretes" />
        </Section>
        <Section header="App">
          <Row to="/mais/conta" title="Conta" value={auth.status === 'authed' ? auth.user?.name : 'Entrar'} />
          <Row to="/mais/ajustes" title="Ajustes" detail="Tema e tamanho do texto" />
          {!install.installed &&
            (install.canPrompt ? (
              <Row onClick={() => void install.prompt()} title="Instalar o app" />
            ) : (
              <Row onClick={() => setHelp(true)} title="Adicionar à Tela de Início" />
            ))}
        </Section>
        <p className="section-footer center">
          Oratio · textos de oração tradicionais. Leituras da Missa: CNBB, via fontes públicas, apenas para uso pessoal.
        </p>
      </div>
      {help && (
        <Sheet title="Instalar o Oratio" onClose={() => setHelp(false)}>
          {install.ios ? <InstallInstructions /> : <p className="muted">Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>}
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setHelp(false)}>Fechar</button>
        </Sheet>
      )}
    </Page>
  )
}
