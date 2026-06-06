#!/usr/bin/env node
// crop_section.mjs — crop a full-page screenshot to a section's Y-range.
//
// Usage:
//   node crop_section.mjs \
//     --input  <path/to/<viewport>.png> \
//     --top    <y> \
//     --height <h> \
//     --output <path/to/sections/<NN>-<id>.<viewport>.png>
//
// Uses `sharp`. The skill caller installs sharp on demand
// (npm install sharp || pnpm add -w -D sharp).

import { argv, exit } from 'node:process'
import { existsSync } from 'node:fs'

const args = new Map()
for (let i = 2; i < argv.length; i += 2) {
  args.set(argv[i].replace(/^--/, ''), argv[i + 1])
}

const required = ['input', 'top', 'height', 'output']
for (const key of required) {
  if (!args.has(key)) {
    console.error(`Missing required flag --${key}`)
    exit(64)
  }
}

const input = args.get('input')
const top = Math.max(0, Math.round(Number(args.get('top'))))
const height = Math.max(1, Math.round(Number(args.get('height'))))
const output = args.get('output')

if (!existsSync(input)) {
  console.error(`Input does not exist: ${input}`)
  exit(65)
}

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch (err) {
  console.error('sharp is not installed. Run: npm install sharp')
  console.error(err.message)
  exit(69)
}

const image = sharp(input)
const meta = await image.metadata()
const pageWidth = meta.width ?? 0
const pageHeight = meta.height ?? 0

const safeTop = Math.min(top, Math.max(0, pageHeight - 1))
const safeHeight = Math.min(height, Math.max(1, pageHeight - safeTop))

await image
  .extract({ left: 0, top: safeTop, width: pageWidth, height: safeHeight })
  .png()
  .toFile(output)

console.log(`Wrote ${output} (${pageWidth}x${safeHeight}) from y=${safeTop}`)
