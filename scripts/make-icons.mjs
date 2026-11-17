import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const png = (size, name) => sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(name))
await png(192, 'icon-192.png')
await png(512, 'icon-512.png')
await png(180, 'apple-touch-icon.png')
// maskable: conteúdo dentro da zona segura (80%), fundo sólido até a borda
const inner = await sharp(svg, { density: 384 }).resize(380, 380).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#2c2a5a' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'))
console.log('ícones gerados')
