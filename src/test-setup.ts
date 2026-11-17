import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

if (!('randomUUID' in crypto)) {
  Object.defineProperty(crypto, 'randomUUID', { value: () => Math.random().toString(16).slice(2) + Date.now().toString(16) })
}
