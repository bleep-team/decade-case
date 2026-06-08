import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..', '..')
const globalsCss = join(repoRoot, 'packages', 'ui', 'src', 'styles', 'globals.css')

const read = (path: string) => readFileSync(path, 'utf8')

/** Component source files in this directory (excludes tests). */
function componentFiles(): string[] {
  return readdirSync(here)
    .filter((f) => /\.tsx$/.test(f) && !f.endsWith('.test.tsx'))
    .map((f) => join(here, f))
}

/** All `from '...'` import sources in a source file. */
function importSources(source: string): string[] {
  const sources: string[] = []
  const re = /\bfrom\s+['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    sources.push(match[1]!)
  }
  return sources
}

describe('gain/loss tokens (AC6)', () => {
  const css = read(globalsCss)

  it('defines --gain and --loss in the UI globals', () => {
    expect(css).toMatch(/--gain:\s*oklch\([^)]+\);/)
    expect(css).toMatch(/--loss:\s*oklch\([^)]+\);/)
  })

  it('exposes them as Tailwind color tokens', () => {
    expect(css).toMatch(/--color-gain:\s*var\(--gain\);/)
    expect(css).toMatch(/--color-loss:\s*var\(--loss\);/)
  })

  it('keeps --gain and --loss distinct from --destructive', () => {
    const value = (token: string) => {
      const m = css.match(new RegExp(`--${token}:\\s*([^;]+);`))
      return m?.[1]?.trim()
    }
    const destructive = value('destructive')
    expect(destructive).toBeTruthy()
    expect(value('gain')).not.toBe(destructive)
    expect(value('loss')).not.toBe(destructive)
  })

  it('applies the tokens to data components only (price + book)', () => {
    const price = read(join(here, 'price-display.tsx'))
    const book = read(join(here, 'order-book-panel.tsx'))
    expect(price).toMatch(/text-gain/)
    expect(price).toMatch(/text-loss/)
    expect(book).toMatch(/gain/)
    expect(book).toMatch(/loss/)
  })

  it('keeps chrome / structural components free of the data tokens', () => {
    const chrome = [
      join(repoRoot, 'apps', 'web', 'src', 'app', 'app', 'layout.tsx'),
      join(repoRoot, 'apps', 'web', 'src', 'components', 'wordmark.tsx'),
      join(here, 'terminal.tsx'),
      join(here, 'symbol-select.tsx'),
      join(here, 'order-ticket.tsx'),
    ]
    for (const path of chrome) {
      const source = read(path)
      expect(source, `${path} should not reference gain/loss`).not.toMatch(/\b(gain|loss)\b/)
    }
  })
})

describe('component imports (AC7)', () => {
  // UI primitives come from @decade/ui; icons from lucide-react. Nothing else —
  // any other icon or UI library would land outside this allowlist and fail.
  const allowedPrefixes = [
    'react',
    'react-dom',
    'lucide-react',
    '@decade/ui',
    '@decade/types',
    '@decade/exchange-runtime',
    '@/',
    './',
    '../',
    'node:',
  ]
  const isAllowed = (source: string) => allowedPrefixes.some((p) => source.startsWith(p))

  it('import only from @decade/ui, lucide-react, and local/shared sources', () => {
    for (const path of componentFiles()) {
      for (const source of importSources(read(path))) {
        expect(isAllowed(source), `${path} imports disallowed module "${source}"`).toBe(true)
      }
    }
  })

  it('import UI primitives from @decade/ui and icons from lucide-react', () => {
    // Across the slice, primitives are sourced from the design system and icons
    // from lucide — proving both wiring points the AC names.
    const all = componentFiles().flatMap((path) => importSources(read(path)))
    expect(all.some((s) => s.startsWith('@decade/ui'))).toBe(true)
    expect(all).toContain('lucide-react')
  })
})
