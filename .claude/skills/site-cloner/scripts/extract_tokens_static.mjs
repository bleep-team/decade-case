#!/usr/bin/env node
// extract_tokens_static.mjs — extract design tokens by parsing rendered
// HTML and <style> blocks. No browser required.
//
// Usage: extract_tokens_static.mjs <output_dir>
//
// Reads:
//   pages/* /dom.html      (post-JS HTML — inline styles + <style>)
//   pages/* /raw.html      (pre-JS HTML — Framer config + linked CSS)
//   assets/css/*.css       (downloaded stylesheets)
// Writes:
//   design-tokens.json     (authoritative)
//   design-tokens.md       (non-authoritative mirror)

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { argv, exit } from 'node:process'

if (argv.length < 3) {
  console.error('Usage: extract_tokens_static.mjs <output_dir>')
  exit(64)
}
const OUT = argv[2]

// ---- collect every CSS-ish blob: inline styles, <style> blocks, .css files
const blobs = []
const pagesDir = join(OUT, 'pages')
for (const slug of readdirSync(pagesDir)) {
  const pd = join(pagesDir, slug)
  if (!statSync(pd).isDirectory()) continue
  for (const f of ['dom.html', 'raw.html']) {
    const p = join(pd, f)
    if (!existsSync(p)) continue
    blobs.push(readFileSync(p, 'utf8'))
  }
}
const cssDir = join(OUT, 'assets', 'css')
if (existsSync(cssDir)) {
  for (const f of readdirSync(cssDir)) {
    if (f.endsWith('.css')) blobs.push(readFileSync(join(cssDir, f), 'utf8'))
  }
}
const html = blobs.join('\n')

// ---- helpers
const count = (re, source) => {
  const m = new Map()
  let match
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  while ((match = r.exec(source)) !== null) {
    const v = match[1].trim()
    if (!v) continue
    m.set(v, (m.get(v) || 0) + 1)
  }
  return m
}
const topN = (map, n) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v)
const topNWithCount = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)

// ---- palette: count every color value, classify by surrounding property
const palette = new Map() // value -> { count, roles: Set<string> }
const bumpColor = (value, role) => {
  if (!value) return
  const v = value.trim().toLowerCase()
  if (!v) return
  if (['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'none'].includes(v)) return
  if (v === 'rgba(0,0,0,0)' || v === 'rgb(0 0 0 / 0)' || v === '#0000') return
  let bucket = palette.get(v)
  if (!bucket) {
    bucket = { count: 0, roles: new Set() }
    palette.set(v, bucket)
  }
  bucket.count += 1
  bucket.roles.add(role)
}
const COLOR_VALUE =
  '(#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\)|oklch\\([^)]+\\)|oklab\\([^)]+\\)|color\\([^)]+\\))'
const COLOR_PROPS = [
  ['background-color', 'background'],
  ['background', 'background'],
  ['color', 'text'],
  ['border-color', 'border'],
  ['border-top-color', 'border'],
  ['border-right-color', 'border'],
  ['border-bottom-color', 'border'],
  ['border-left-color', 'border'],
  ['fill', 'fill'],
  ['stroke', 'stroke'],
  ['outline-color', 'outline'],
]
for (const [prop, role] of COLOR_PROPS) {
  const re = new RegExp(`${prop}\\s*:\\s*([^;"']+)`, 'gi')
  let m
  while ((m = re.exec(html)) !== null) {
    const v = m[1]
      .trim()
      .replace(/!important.*/, '')
      .trim()
    // Could be multiple values (e.g. background: linear-gradient(...) #fff)
    // Extract every COLOR_VALUE.
    const inner = new RegExp(COLOR_VALUE, 'gi')
    let cm
    while ((cm = inner.exec(v)) !== null) bumpColor(cm[1], role)
  }
}

// ---- typography: pull representative selector→value records out of
// the homepage's heading + body element inline styles. We can't do
// getComputedStyle without a browser, so we sample first-occurrence
// inline declarations on h1..h6, p, button, a.
const homeDom = existsSync(join(pagesDir, 'home', 'dom.html'))
  ? readFileSync(join(pagesDir, 'home', 'dom.html'), 'utf8')
  : ''
const typography = []
const seenSel = new Set()
const TYPE_RE = (tag) => new RegExp(`<${tag}\\b[^>]*\\sstyle\\s*=\\s*"([^"]*)"`, 'i')
for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a']) {
  const m = homeDom.match(TYPE_RE(tag))
  if (!m) continue
  const style = m[1]
  const grab = (prop) => {
    const r = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i')
    const mm = style.match(r)
    return mm ? mm[1].trim() : undefined
  }
  const entry = { selector: tag }
  const ff = grab('font-family')
  if (ff) entry.font_family = ff
  const fs = grab('font-size')
  if (fs) entry.font_size = fs
  const fw = grab('font-weight')
  if (fw) entry.font_weight = fw
  const lh = grab('line-height')
  if (lh) entry.line_height = lh
  const ls = grab('letter-spacing')
  if (ls) entry.letter_spacing = ls
  if (Object.keys(entry).length > 1 && !seenSel.has(tag)) {
    typography.push(entry)
    seenSel.add(tag)
  }
}
// fallback: also include any font-family declared globally in <style>/css
const fontFamilies = count(/font-family\s*:\s*([^;"']+)/, html)
for (const [ff] of topNWithCount(fontFamilies, 10)) {
  if (![...typography].some((t) => t.font_family === ff)) {
    typography.push({ selector: ':root', font_family: ff.trim() })
  }
}

// ---- spacing/radii/shadows/motion: frequency-counted strings
const spacing = topN(count(/(?:padding|margin|gap|row-gap|column-gap)\s*:\s*([^;"']+)/, html), 30)
const radii = topN(count(/border-radius\s*:\s*([^;"']+)/, html), 15)
const shadows = topN(count(/box-shadow\s*:\s*([^;"']+)/, html), 15)
const motion = topN(count(/(?:transition|animation)\s*:\s*([^;"']+)/, html), 20)

// ---- breakpoints: parse @media min/max-width rules
const breakpoints = new Set()
const bpRe = /@media[^{]*\(\s*(min|max)-width\s*:\s*([^)]+)\)/g
let bm
while ((bm = bpRe.exec(html)) !== null) {
  breakpoints.add(`${bm[1]}-width: ${bm[2].trim()}`)
}
// Framer uses px-based responsive variants; also catch container-query-ish
const fallbackBp = /@media[^{]*\(([^)]+)\)/g
while ((bm = fallbackBp.exec(html)) !== null) {
  const inner = bm[1].trim()
  if (/width/.test(inner)) breakpoints.add(inner)
}

// ---- final palette
const paletteArr = [...palette.entries()]
  .map(([value, { count, roles }]) => ({
    value,
    frequency: count,
    roles: [...roles].sort(),
  }))
  .sort((a, b) => b.frequency - a.frequency)
  .slice(0, 40)

const tokens = {
  typography,
  palette: paletteArr,
  spacing,
  radii,
  shadows,
  breakpoints: [...breakpoints].sort(),
  motion,
}

writeFileSync(join(OUT, 'design-tokens.json'), JSON.stringify(tokens, null, 2))

// ---- markdown mirror
const md = [
  '> **Non-authoritative.** The source of truth for this content is `design-tokens.json`. If they disagree, trust the JSON.',
  '',
  '# Design tokens — observed values',
  '',
  '## Typography',
  '',
  ...typography.map(
    (t) =>
      `- \`${t.selector}\` — ${[
        t.font_family && `font: ${t.font_family}`,
        t.font_size && `size ${t.font_size}`,
        t.font_weight && `weight ${t.font_weight}`,
        t.line_height && `line ${t.line_height}`,
        t.letter_spacing && `tracking ${t.letter_spacing}`,
      ]
        .filter(Boolean)
        .join(' · ')}`,
  ),
  '',
  '## Palette (top 20 by frequency)',
  '',
  ...paletteArr
    .slice(0, 20)
    .map((c) => `- \`${c.value}\` — used ${c.frequency}× as ${c.roles.join(', ')}`),
  '',
  '## Spacing (top 15)',
  '',
  ...spacing.slice(0, 15).map((s) => `- \`${s}\``),
  '',
  '## Radii',
  '',
  ...radii.map((s) => `- \`${s}\``),
  '',
  '## Shadows',
  '',
  ...shadows.map((s) => `- \`${s}\``),
  '',
  '## Breakpoints',
  '',
  ...[...breakpoints].sort().map((s) => `- \`${s}\``),
  '',
  '## Motion',
  '',
  ...motion.slice(0, 15).map((s) => `- \`${s}\``),
  '',
].join('\n')
writeFileSync(join(OUT, 'design-tokens.md'), md)

console.log(
  `tokens: ${paletteArr.length} colors, ${typography.length} type entries, ${breakpoints.size} breakpoints`,
)
