/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:content-index' {
  const index: Record<string, { slug: string; titulo: string; categoria: string; versao: string }[]>
  export default index
}
