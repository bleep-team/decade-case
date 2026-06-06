import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Structural assertions for the /app shell (issue #20): the layout is a
// viewport-height column with a scrollable content region, and the terminal's
// book + Holdings/Orders/Fills lists scroll internally via @decade/ui scroll-area.
// These are static source checks — the "fits a real screen" judgment lives on
// the demo bar (#18).

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..', '..')
const terminalDir = join(repoRoot, 'apps', 'web', 'src', 'components', 'terminal')

const read = (path: string) => readFileSync(path, 'utf8')

describe('app shell viewport-height constraint', () => {
  const layout = read(join(here, 'layout.tsx'))

  it('makes the shell a viewport-height flex column', () => {
    expect(layout).toMatch(/h-dvh|h-screen/)
    expect(layout).toMatch(/flex-col/)
  })

  it('gives the content region an internal scroll (min-h-0 + overflow-y-auto)', () => {
    expect(layout).toMatch(/min-h-0/)
    expect(layout).toMatch(/overflow-y-auto/)
  })
})

describe('terminal lists/book scroll internally', () => {
  it('the order book uses @decade/ui scroll-area', () => {
    const book = read(join(terminalDir, 'order-book-panel.tsx'))
    expect(book).toMatch(/@decade\/ui\/components\/scroll-area/)
    expect(book).toMatch(/<ScrollArea/)
  })

  it('the Holdings/Orders/Fills panel uses @decade/ui scroll-area', () => {
    const youPanel = read(join(terminalDir, 'you-panel.tsx'))
    expect(youPanel).toMatch(/@decade\/ui\/components\/scroll-area/)
    expect(youPanel).toMatch(/<ScrollArea/)
  })
})
