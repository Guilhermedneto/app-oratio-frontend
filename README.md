# Oratio — Front-end (PWA)

PWA católica de oração diária em português do Brasil, no estilo dos apps do iPhone. React 19 + TypeScript + Vite +
`vite-plugin-pwa`. A API fica em outro repositório: **app-oratio-banckend**.

## Recursos

- **Só entra com login** (e-mail e senha, ou Google). Saúda o usuário pelo nome. Quem já entrou abre o app e lê o conteúdo
  salvo mesmo **offline**.
- **Hoje**: tempo e cor litúrgica (a cor vira o destaque do app), celebração, leituras, orações do dia, santo e reflexão do dia.
- **Terço guiado** (retomada, sequência de dias, tela sempre acesa), **orações**, **novenas**, **ritos**, **textos dos grandes
  nomes**, **santos**, **intenções** e **favoritos**.
- **Comunidade**: pedidos de oração, "orei" com mãos unidas (🙏) subindo, comentários e avisos de novos pedidos.
- **Perfil gestor** (e-mail liberado no back por `MANAGER_EMAILS`): painel para cadastrar e moderar. Todo o conteúdo do
  app (orações, textos, reflexões, ritos, horas, santos, novenas e mistérios do terço) é cadastrado ali, com autor, origem e
  categorias.
- Temas claro, escuro e sépia, tamanho de fonte ajustável, instalável (Android e iPhone) e lembretes por Web Push.

## Rodar localmente

Precisa da API rodando (veja o README do back). Por padrão o front fala com `http://localhost:8010`.

```bash
npm install
npm run dev            # http://localhost:5173  (proxy /api -> http://localhost:8010)
```

Para outra API: `ORATIO_API=https://sua-api.onrender.com npm run dev`.

## Verificações

```bash
npm run lint && npm run typecheck && npm test      # Vitest
npm run build                                        # valida content/ + tsc + vite build (JS inicial < 150 KB gzip)
npm run preview                                      # http://localhost:4183 (build de produção, com service worker)
npm run e2e                                          # Playwright; exige o repositório do back ao lado (veja abaixo)
```

O **E2E** sobe a API do back com um banco próprio (`oratio_e2e`) e portas próprias. Ele procura o back em
`../app-oratio-banckend` (ou defina `ORATIO_API_DIR`), e precisa do Postgres do `docker compose` do back e de
`npx playwright install chromium`.

## Tipos da API

Os tipos de `src/api/schema.d.ts` são **gerados** do OpenAPI da API (não escreva tipos de API à mão):

```bash
OPENAPI_SOURCE=https://sua-api.onrender.com/openapi.json npm run gen:api   # a partir da API publicada
npm run gen:api                                                            # ou do back em ../app-oratio-banckend
```

## Deploy na Vercel

Passo a passo completo (Neon + Render + Vercel): veja `docs/DEPLOY.md` no repositório do back. Resumo para o front:

1. **Edite `vercel.json`**: troque `https://SEU-SERVICO.onrender.com` pela URL da sua API no Render. O *rewrite* `/api/*` faz o
   navegador falar com a API na mesma origem (essencial para os cookies funcionarem no Safari/iPhone).
2. Na Vercel, **Add New → Project**, importe este repositório (framework **Vite**; build `npm run build`; saída `dist`).
3. Variáveis de ambiente (opcionais), em *Settings → Environment Variables*:

   | Variável | Para quê |
   |---|---|
   | `VITE_API_BASE` | deixe `/api` (padrão) |
   | `VITE_VAPID_PUBLIC_KEY` | chave pública do Web Push (a privada fica só no back) |
   | `VITE_GOOGLE_CLIENT_ID` | habilita "Entrar com Google" |

4. Depois do deploy, **volte ao Render** e ajuste `CORS_ORIGINS` para a URL da Vercel.

## Estrutura

```
src/
  app/          rotas, layout, abas
  features/     hoje, terco, oracoes (docs), novenas, comunidade, gestor, conta, mais, intencoes, favoritos
  shared/       componentes de interface, utilitários
  api/          cliente HTTP e tipos gerados do OpenAPI
  offline/      armazenamento local (IndexedDB) e fila de sincronização
content/        (vazia) arquivos de conteúdo embutido opcionais; o conteúdo vem do gestor
e2e/            testes Playwright
```

## Desempenho e PWA

JS inicial < 150 KB gzip, rotas carregadas sob demanda, app shell em cache (Workbox), dados em IndexedDB, estratégia
*stale-while-revalidate* (abre do cache e atualiza em segundo plano). No iPhone, instale pelo Safari
(**Compartilhar → Adicionar à Tela de Início**); o push só funciona com o app instalado (iOS 16.4+).
