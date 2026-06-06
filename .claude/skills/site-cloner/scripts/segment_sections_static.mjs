#!/usr/bin/env node
// segment_sections_static.mjs — structural section segmentation from
// rendered HTML, without a browser.
//
// Identifies top-level <section> (or direct children of <main>/<body>)
// elements in each page's dom.html. Emits per-page sections.json with:
//   id, selector, dom_html_byte_range, raw_html_byte_range,
//   copy_byte_range (heuristic), dominant_tokens, screenshot_crops (empty).
//
// bboxes are NOT computed (would require a browser). We still emit a bbox
// object so the schema validates; values are nulls. The dossier README
// flags this as the v1 limitation; rerun with Playwright to fill bboxes.
//
// Usage: segment_sections_static.mjs <output_dir>

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { argv, exit } from 'node:process'
import { createHash } from 'node:crypto'

if (argv.length < 3) {
  console.error('Usage: segment_sections_static.mjs <output_dir>')
  exit(64)
}
const OUT = argv[2]
const pagesDir = join(OUT, 'pages')

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

// Find the byte offset of <main>'s opening tag, or first <body> child container.
function findContainer(html) {
  const mainMatch = html.match(/<main\b[^>]*>/i)
  if (mainMatch) {
    return { start: mainMatch.index + mainMatch[0].length, tag: 'main' }
  }
  const bodyMatch = html.match(/<body\b[^>]*>/i)
  if (bodyMatch) {
    return { start: bodyMatch.index + bodyMatch[0].length, tag: 'body' }
  }
  return null
}

// Find direct top-level children of `container`. Walk forward, tracking
// open tags, only emitting when depth returns to 0 inside the container.
// If `containerEndOverride` is supplied, use it as the upper bound instead
// of scanning for the next closing tag (needed when the container tag is
// generic like <div>).
function findTopLevelChildren(html, containerStart, closingTag, containerEndOverride) {
  let containerEnd
  if (typeof containerEndOverride === 'number') {
    containerEnd = containerEndOverride
  } else {
    const closing = new RegExp(`</${closingTag}\\b`, 'i')
    const endMatch = html.slice(containerStart).match(closing)
    containerEnd = endMatch ? containerStart + endMatch.index : html.length
  }
  const segment = html.slice(containerStart, containerEnd)

  // Tag scanner. We only need <tag>, </tag>, and self-closing void tags.
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g
  const VOID = new Set([
    'br',
    'hr',
    'img',
    'input',
    'meta',
    'link',
    'source',
    'track',
    'area',
    'base',
    'col',
    'embed',
    'param',
    'wbr',
  ])

  let depth = 0
  let topStart = -1
  let topTagName = null
  const children = []
  let m
  while ((m = tagRe.exec(segment)) !== null) {
    const isClose = !!m[1]
    const name = m[2].toLowerCase()
    const selfClosing = m[4] === '/' || VOID.has(name)

    if (!isClose) {
      if (depth === 0) {
        topStart = m.index
        topTagName = name
      }
      if (!selfClosing) depth += 1
    } else if (isClose) {
      depth = Math.max(0, depth - 1)
      if (depth === 0 && topStart !== -1) {
        const topEnd = m.index + m[0].length
        children.push({
          tag: topTagName,
          startInSegment: topStart,
          endInSegment: topEnd,
          outerHTML: segment.slice(topStart, topEnd),
        })
        topStart = -1
        topTagName = null
      }
    }
  }

  // Translate offsets back to whole-html offsets.
  return children.map((c) => ({
    ...c,
    startInHtml: containerStart + c.startInSegment,
    endInHtml: containerStart + c.endInSegment,
  }))
}

function pickId(outerHTML, index, framerName) {
  if (framerName) return slugify(framerName) || `section-${String(index).padStart(2, '0')}`
  const idMatch = outerHTML.match(/\bid\s*=\s*"([^"]+)"/i)
  if (idMatch) return idMatch[1]
  const dataSection = outerHTML.match(/\bdata-section\s*=\s*"([^"]+)"/i)
  if (dataSection) return dataSection[1]
  const dataFramerName = outerHTML.match(/\bdata-framer-name\s*=\s*"([^"]+)"/i)
  if (dataFramerName)
    return slugify(dataFramerName[1]) || `section-${String(index).padStart(2, '0')}`
  const heading = outerHTML.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)
  if (heading) {
    const text = heading[1].replace(/<[^>]+>/g, '').trim()
    const slug = slugify(text)
    if (slug) return slug
  }
  return `section-${String(index).padStart(2, '0')}`
}

function pickSelector(outerHTML, tag, index, containerTag) {
  const idMatch = outerHTML.match(/\bid\s*=\s*"([^"]+)"/i)
  if (idMatch) return `#${idMatch[1].replace(/"/g, '')}`
  return `${containerTag} > ${tag}:nth-of-type(${index + 1})`
}

// Extract inline-style dominant tokens for a section's wrapper.
function extractDominant(outerHTML) {
  const styleAttr = outerHTML.match(/^[^>]*\bstyle\s*=\s*"([^"]*)"/i)
  if (!styleAttr) return {}
  const style = styleAttr[1]
  const dom = {}
  for (const [prop, key] of [
    ['background-color', 'background_color'],
    ['background', 'background'],
    ['color', 'text_color'],
    ['font-family', 'font_family'],
    ['padding', 'padding'],
    ['border-radius', 'border_radius'],
  ]) {
    const m = style.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'))
    if (m) dom[key] = m[1].trim()
  }
  return dom
}

// For each page, locate sections and emit sections.json + update page.json.
function processPage(slug) {
  const pageDir = join(pagesDir, slug)
  const domPath = join(pageDir, 'dom.html')
  const rawPath = join(pageDir, 'raw.html')
  if (!existsSync(domPath)) return null
  const dom = readFileSync(domPath, 'utf8')
  const raw = existsSync(rawPath) ? readFileSync(rawPath, 'utf8') : ''
  const copy = existsSync(join(pageDir, 'copy.md'))
    ? readFileSync(join(pageDir, 'copy.md'), 'utf8')
    : ''

  const container = findContainer(dom)
  if (!container) {
    writeFileSync(join(pageDir, 'sections.json'), '[]')
    return []
  }

  const DROP_TAGS = new Set(['script', 'style', 'noscript', 'link', 'meta', 'head'])
  const DROP_IDS = new Set([
    '__framer-editorbar',
    '__framer-badge-container',
    'svg-templates',
    'template-overlay',
  ])

  const filterMeaningful = (arr) =>
    arr.filter((c) => {
      if (DROP_TAGS.has(c.tag)) return false
      const idm = c.outerHTML.match(/\bid\s*=\s*"([^"]+)"/i)
      if (idm && DROP_IDS.has(idm[1])) return false
      return true
    })

  let children = findTopLevelChildren(dom, container.start, container.tag)
  let filtered = filterMeaningful(children)

  // Framer wraps real content inside several layers of single-child divs:
  // <body> > #main > #<random-page-id> > <real sections...>
  // Loop the recursion: while there's exactly one dominant child (>50% of
  // the parent's byte range) AND its descent yields ≥ 2 meaningful children,
  // descend into it. Cap depth to prevent runaways.
  // Descent strategy: only descend while the current level is a single
  // wrapper. Stop as soon as the children fan out (≥ 2 meaningful).
  // Framer pages stack many single-child divs before reaching the real
  // sections, so we may need many iterations.
  const MAX_DEPTH = 20
  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    if (filtered.length === 0) break
    if (filtered.length >= 2) break // already fanned out — stop
    const wrapper = filtered[0]
    const openTagMatch = wrapper.outerHTML.match(/^<[a-zA-Z][\w-]*\b[^>]*>/)
    if (!openTagMatch) break
    const innerStart = wrapper.startInHtml + openTagMatch[0].length
    const closingLen = `</${wrapper.tag}>`.length
    const innerEnd = wrapper.endInHtml - closingLen
    const inner = findTopLevelChildren(dom, innerStart, wrapper.tag, innerEnd)
    const innerFiltered = filterMeaningful(inner)
    if (innerFiltered.length === 0) break // nothing useful inside
    filtered = innerFiltered
    if (filtered.length >= 2) break // fanned out — done
  }

  // Framer fallback: if after MAX_DEPTH descent we still have just one
  // giant wrapper (typical of Framer's absolute-positioned home pages),
  // emit one section per [data-framer-name] attribute found inside it.
  // Framer labels its frames; this gives the consuming agent a real
  // section list to work from even though we can't compute bboxes.
  if (filtered.length === 1 && filtered[0].endInHtml - filtered[0].startInHtml > dom.length * 0.4) {
    const wrapper = filtered[0]
    const wrapperHtml = dom.slice(wrapper.startInHtml, wrapper.endInHtml)
    const named = []
    const nameRe = /<([a-zA-Z][\w-]*)\b[^>]*\bdata-framer-name\s*=\s*"([^"]+)"[^>]*>/g
    let m
    while ((m = nameRe.exec(wrapperHtml)) !== null) {
      const absStart = wrapper.startInHtml + m.index
      // Estimate end-of-section as the start of the next [data-framer-name]
      // sibling, or wrapper end. Use a peek at nameRe.lastIndex.
      const peek = nameRe.exec(wrapperHtml)
      const absEnd = peek ? wrapper.startInHtml + peek.index : wrapper.endInHtml
      if (peek) nameRe.lastIndex = peek.index // rewind so the next loop picks `peek` up
      named.push({
        tag: m[1].toLowerCase(),
        startInHtml: absStart,
        endInHtml: absEnd,
        outerHTML: dom.slice(absStart, absEnd),
        framerName: m[2],
      })
    }
    if (named.length >= 2) {
      filtered = named
    }
  }

  const sections = filtered.map((child, idx) => {
    const id = pickId(child.outerHTML, idx, child.framerName)
    const selector = pickSelector(child.outerHTML, child.tag, idx, container.tag)
    const dominant = extractDominant(child.outerHTML)

    // Find the same prefix in raw.html via a stable signature (first 80 chars of outerHTML).
    let rawRange = [0, 0]
    const sig = child.outerHTML.slice(0, 80)
    const rawStart = raw.indexOf(sig)
    if (rawStart !== -1) {
      // Heuristic: assume the matching section in raw.html ends near a closing tag
      // — fall back to a fixed window of the same length.
      rawRange = [rawStart, rawStart + child.outerHTML.length]
    }

    // copy.md byte range — search for the first heading inside the section.
    let copyRange = [0, 0]
    const headingText = (child.outerHTML.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || '')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (headingText && copy) {
      const start = copy.indexOf(headingText)
      if (start !== -1) {
        const nextSec = copy.indexOf('\n# ', start + headingText.length)
        const end = nextSec === -1 ? Math.min(start + 800, copy.length) : nextSec
        copyRange = [start, end]
      }
    }

    return {
      id,
      selector,
      bbox: {}, // populated by Playwright pass; static capture leaves empty
      dom_html_byte_range: [child.startInHtml, child.endInHtml],
      raw_html_byte_range: rawRange,
      copy_byte_range: copyRange,
      dominant_tokens: dominant,
      screenshot_crops: {}, // populated by crop_section.mjs after bbox known
      outer_html_prefix: child.outerHTML.slice(0, 256),
    }
  })

  writeFileSync(join(pageDir, 'sections.json'), JSON.stringify(sections, null, 2))
  return sections
}

// Also emit per-page page.json now (needs sections to be done first).
function writePageJson(slug, sections, sourceUrl) {
  const pageDir = join(pagesDir, slug)
  const rawHtml = existsSync(join(pageDir, 'raw.html'))
    ? readFileSync(join(pageDir, 'raw.html'))
    : Buffer.alloc(0)
  const sha = createHash('sha256').update(rawHtml).digest('hex')
  const url = sourceUrl

  const files = {
    copy_md: 'copy.md',
    dom_html: 'dom.html',
    raw_html: 'raw.html',
    summary_md: 'summary.md',
    links_json: 'links.json',
    images_json: 'images.json',
    sections_json: 'sections.json',
    screenshots: {},
  }
  for (const vp of ['desktop', 'mobile', 'tablet']) {
    const p = join(pageDir, `${vp}.png`)
    if (existsSync(p)) files.screenshots[vp] = `${vp}.png`
  }

  const manifestPath = join(OUT, 'assets', 'manifest.json')
  let assetRefs = []
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assetRefs = manifest
      .filter(
        (a) =>
          a.local_path && Array.isArray(a.referencing_pages) && a.referencing_pages.includes(slug),
      )
      .map((a) => a.local_path)
  }

  const pageJson = {
    url,
    slug,
    raw_html_sha256: sha,
    files,
    section_count: sections.length,
    asset_refs: assetRefs,
  }
  writeFileSync(join(pageDir, 'page.json'), JSON.stringify(pageJson, null, 2))
}

// Map slug -> source URL via urls.txt order. Use a robust mapper.
function slugForUrl(url) {
  const u = new URL(url)
  let p = u.pathname.replace(/\/$/, '')
  if (!p) return 'home'
  return p
    .replace(/^\//, '')
    .toLowerCase()
    .replace(/\//g, '_')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
}

const urlsList = existsSync(join(OUT, 'meta', 'urls.txt'))
  ? readFileSync(join(OUT, 'meta', 'urls.txt'), 'utf8')
      .split('\n')
      .filter(Boolean)
  : []
const slugToUrl = new Map()
for (const u of urlsList) slugToUrl.set(slugForUrl(u), u)

const slugs = readdirSync(pagesDir).filter((s) => statSync(join(pagesDir, s)).isDirectory())

for (const slug of slugs) {
  const sections = processPage(slug)
  const url = slugToUrl.get(slug) || ''
  writePageJson(slug, sections || [], url)
  console.log(`  ${slug}: ${sections ? sections.length : 0} sections`)
}
console.log(`done: ${slugs.length} pages`)
