// segment_sections.js — Playwright `evaluate` payload.
//
// Identifies top-level full-bleed sections of the current page and
// returns an array of section descriptors (id, selector, bbox, and
// dominant tokens) suitable for the sections.json schema.
//
// Byte ranges into dom.html / raw.html / copy.md are computed
// host-side after this script returns — they require access to the
// captured files, which the browser doesn't have.

;(() => {
  const viewportWidth = window.innerWidth

  const candidates = (() => {
    const main = document.querySelector('main')
    if (main && main.children.length > 0) return [...main.children]
    const body = document.body
    return body ? [...body.children] : []
  })()

  const sections = []
  let index = 0

  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rect.width < viewportWidth * 0.95) continue
    if (rect.height < 40) continue // skip skinny header/footer slivers

    const id = (() => {
      if (el.id) return el.id
      const dataSection = el.getAttribute('data-section')
      if (dataSection) return dataSection
      const heading = el.querySelector('h1, h2')
      if (heading?.textContent) {
        return (
          heading.textContent
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || `section-${index}`
        )
      }
      return `section-${index}`
    })()

    const buildSelector = () => {
      const tag = el.tagName.toLowerCase()
      if (el.id) return `#${CSS.escape(el.id)}`
      const parent = el.parentElement
      if (!parent) return tag
      const siblingsOfTag = [...parent.children].filter((c) => c.tagName === el.tagName)
      const idxInTag = siblingsOfTag.indexOf(el) + 1
      const parentSel = parent === document.body ? 'body' : parent.tagName.toLowerCase()
      return `${parentSel} > ${tag}:nth-of-type(${idxInTag})`
    }

    const cs = window.getComputedStyle(el)
    const dominantTokens = {
      background_color: cs.getPropertyValue('background-color'),
      text_color: cs.getPropertyValue('color'),
      font_family: cs.getPropertyValue('font-family'),
      padding: cs.getPropertyValue('padding'),
      border_radius: cs.getPropertyValue('border-radius'),
    }

    sections.push({
      id,
      selector: buildSelector(),
      bbox: {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
      dominant_tokens: dominantTokens,
      // outer_html_prefix lets the host find the section's byte range
      // inside dom.html / raw.html.
      outer_html_prefix: el.outerHTML.slice(0, 256),
    })
    index += 1
  }

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    page_height: document.documentElement.scrollHeight,
    sections,
  }
})()
