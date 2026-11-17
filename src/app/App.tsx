import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Shell } from './Shell'

const Hoje = lazy(() => import('@/features/hoje/Hoje'))
const Terco = lazy(() => import('@/features/terco/Terco'))
const Sessao = lazy(() => import('@/features/terco/Sessao'))
const OracoesList = lazy(() => import('./routes').then((m) => ({ default: m.OracoesList })))
const OracaoView = lazy(() => import('./routes').then((m) => ({ default: m.OracaoView })))
const RitosList = lazy(() => import('./routes').then((m) => ({ default: m.RitosList })))
const RitoView = lazy(() => import('./routes').then((m) => ({ default: m.RitoView })))
const HorasList = lazy(() => import('./routes').then((m) => ({ default: m.HorasList })))
const HoraView = lazy(() => import('./routes').then((m) => ({ default: m.HoraView })))
const ReflexoesList = lazy(() => import('./routes').then((m) => ({ default: m.ReflexoesList })))
const ReflexaoView = lazy(() => import('./routes').then((m) => ({ default: m.ReflexaoView })))
const TextosList = lazy(() => import('./routes').then((m) => ({ default: m.TextosList })))
const TextoView = lazy(() => import('./routes').then((m) => ({ default: m.TextoView })))
const SantosList = lazy(() => import('./routes').then((m) => ({ default: m.SantosList })))
const SantoView = lazy(() => import('./routes').then((m) => ({ default: m.SantoView })))
const TercoGuiaView = lazy(() => import('./routes').then((m) => ({ default: m.TercoGuiaView })))
const Comunidade = lazy(() => import('@/features/comunidade/Comunidade'))
const Painel = lazy(() => import('@/features/gestor/Painel'))
const Editor = lazy(() => import('@/features/gestor/Editor'))
const Novenas = lazy(() => import('@/features/novenas/Novenas').then((m) => ({ default: m.Novenas })))
const NovenaView = lazy(() => import('@/features/novenas/Novenas').then((m) => ({ default: m.NovenaView })))
const Mais = lazy(() => import('@/features/mais/Mais'))
const Intencoes = lazy(() => import('@/features/intencoes/Intencoes'))
const Favoritos = lazy(() => import('@/features/favoritos/Favoritos'))
const Ajustes = lazy(() => import('@/features/conta/Ajustes'))
const Conta = lazy(() => import('@/features/conta/Conta'))
const Lembretes = lazy(() => import('@/features/conta/Lembretes'))

const wrap = (el: React.ReactNode) => <Suspense fallback={<div className="muted center" style={{ padding: 48 }}>Carregando…</div>}>{el}</Suspense>

export const routes = [
  {
    element: <Shell />,
    children: [
      { path: '/', element: wrap(<Hoje />) },
      { path: '/terco', element: wrap(<Terco />) },
      { path: '/terco/rezar', element: wrap(<Sessao />) },
      { path: '/terco/guia/:slug', element: wrap(<TercoGuiaView />) },
      { path: '/mais/comunidade', element: wrap(<Comunidade />) },
      { path: '/mais/gestor', element: wrap(<Painel />) },
      { path: '/mais/gestor/conteudo/:id', element: wrap(<Editor />) },
      { path: '/oracoes', element: wrap(<OracoesList />) },
      { path: '/oracoes/:slug', element: wrap(<OracaoView />) },
      { path: '/novenas', element: wrap(<Novenas />) },
      { path: '/novenas/:slug', element: wrap(<NovenaView />) },
      { path: '/mais', element: wrap(<Mais />) },
      { path: '/mais/ritos', element: wrap(<RitosList />) },
      { path: '/mais/ritos/:slug', element: wrap(<RitoView />) },
      { path: '/mais/horas', element: wrap(<HorasList />) },
      { path: '/mais/horas/:slug', element: wrap(<HoraView />) },
      { path: '/mais/reflexoes', element: wrap(<ReflexoesList />) },
      { path: '/mais/reflexoes/:slug', element: wrap(<ReflexaoView />) },
      { path: '/mais/textos', element: wrap(<TextosList />) },
      { path: '/mais/textos/:slug', element: wrap(<TextoView />) },
      { path: '/mais/santos', element: wrap(<SantosList />) },
      { path: '/mais/santos/:slug', element: wrap(<SantoView />) },
      { path: '/mais/intencoes', element: wrap(<Intencoes />) },
      { path: '/mais/favoritos', element: wrap(<Favoritos />) },
      { path: '/mais/ajustes', element: wrap(<Ajustes />) },
      { path: '/mais/conta', element: wrap(<Conta />) },
      { path: '/mais/lembretes', element: wrap(<Lembretes />) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export function App() {
  return <RouterProvider router={createBrowserRouter(routes)} />
}
