import { useEffect, useState } from 'react'

interface BIPEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

let deferred: BIPEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
  })
}

export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(Boolean(deferred))
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      deferred = e as BIPEvent
      setCanPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  const prompt = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    setCanPrompt(false)
  }
  return { installed: isStandalone(), canPrompt, prompt, ios: isIOS() }
}

export function InstallInstructions() {
  return (
    <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
      <li>Abra o Oratio no <strong>Safari</strong>.</li>
      <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
      <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
    </ol>
  )
}
