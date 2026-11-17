# Oratio Web — regras de trabalho

- Respeite a separação: front (UI, offline, estado de tela). Regra de negócio, cálculo litúrgico e fontes de leitura são do back.
- Tipos da API vêm do OpenAPI (`npm run gen:api`). Não escrever tipos de API à mão.
- O front nunca chama fontes externas de leitura.
- Orçamento de desempenho: JS inicial < 150 KB gzip, rotas com `React.lazy`; não adicionar dependências pesadas sem justificar.
- O app só abre com login. O conteúdo é cadastrado pelo perfil gestor (não há conteúdo embutido).
- Cada mudança com teste. Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` antes de concluir.
- Idioma da interface: português do Brasil.

## Comandos

`npm run dev` (porta 5173, proxy para a API), `npm test`, `npm run build`, `npm run preview` (porta 4183),
`npm run e2e` (precisa do back ao lado), `npm run gen:api`.

## Notas

- Vitest fixado na v3: a v5 falha neste ambiente Windows ("failed to find the current suite").
- `vite.config.ts` usa `resolve.dedupe`: sem isso, a diferença de caixa da letra do drive no Windows duplica React e
  TanStack Query no bundle.
- Se o servidor de desenvolvimento mostrar uma tela antiga, confira se não há outro Vite ocupando a porta.
