import { Entrar } from './Conta'

/** Tela de entrada: o app só abre depois de entrar ou criar uma conta. */
export default function Welcome() {
  return (
    <div className="welcome-bg">
      <main className="welcome">
        <header className="welcome-head">
          <div className="welcome-mark">
            <img className="welcome-logo" src="/icon-192.png" alt="" width={92} height={92} />
          </div>
          <h1>Oratio</h1>
          <p className="welcome-tagline">Sua rotina diária de oração.</p>
        </header>
        <div className="welcome-panel">
          <Entrar />
        </div>
      </main>
    </div>
  )
}
