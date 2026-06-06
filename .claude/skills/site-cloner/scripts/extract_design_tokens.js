// extract_design_tokens.js — Playwright `evaluate` payload.
//
// Returns a JSON-serialisable object matching the design-tokens.json
// schema in references/output_schema.md.
//
// Run via: browser_evaluate < extract_design_tokens.js
// (or wrap in an IIFE if your harness expects an expression).

;(() => {
  const TYPE_SELECTORS = [':root', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'small', 'button', 'a']
  const TYPE_PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing']

  const typography = []
  for (const sel of TYPE_SELECTORS) {
    const el = document.querySelector(sel)
    if (!el) continue
    const cs = window.getComputedStyle(el)
    const entry = { selector: sel }
    for (const prop of TYPE_PROPS) {
      const v = cs.getPropertyValue(prop)
      if (v) entry[prop.replace(/-/g, '_')] = v
    }
    typography.push(entry)
  }

  const paletteCounts = new Map() // value -> { count, roles: Set }
  const bumpColor = (value, role) => {
    if (
      !value ||
      value === 'rgba(0, 0, 0, 0)' ||
      value === 'transparent' ||
      value === 'currentcolor'
    )
      return
    let bucket = paletteCounts.get(value)
    if (!bucket) {
      bucket = { count: 0, roles: new Set() }
      paletteCounts.set(value, bucket)
    }
    bucket.count += 1
    bucket.roles.add(role)
  }

  const COLOR_PROPS = [
    ['background-color', 'background'],
    ['color', 'text'],
    ['border-top-color', 'border'],
    ['border-right-color', 'border'],
    ['border-bottom-color', 'border'],
    ['border-left-color', 'border'],
    ['fill', 'fill'],
    ['stroke', 'stroke'],
  ]

  const SPACING_PROPS = [
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'gap',
    'row-gap',
    'column-gap',
  ]

  const spacingCounts = new Map()
  const radiusCounts = new Map()
  const shadowCounts = new Map()
  const motionCounts = new Map()
  const bumpString = (map, value) => {
    if (!value || value === 'none' || value === '0px') return
    map.set(value, (map.get(value) || 0) + 1)
  }

  const all = document.querySelectorAll('*')
  for (const el of all) {
    const cs = window.getComputedStyle(el)
    for (const [prop, role] of COLOR_PROPS) {
      bumpColor(cs.getPropertyValue(prop), role)
    }
    for (const prop of SPACING_PROPS) {
      bumpString(spacingCounts, cs.getPropertyValue(prop))
    }
    bumpString(radiusCounts, cs.getPropertyValue('border-radius'))
    bumpString(shadowCounts, cs.getPropertyValue('box-shadow'))
    const trans = cs.getPropertyValue('transition')
    if (trans && trans !== 'all 0s ease 0s') bumpString(motionCounts, trans)
    const anim = cs.getPropertyValue('animation')
    if (anim && !anim.startsWith('none')) bumpString(motionCounts, anim)
  }

  const palette = [...paletteCounts.entries()]
    .map(([value, { count, roles }]) => ({
      value,
      frequency: count,
      roles: [...roles].sort(),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 30)

  const topN = (map, n) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([v]) => v)

  // Parse @media min/max-width rules out of every same-origin stylesheet.
  const breakpoints = new Set()
  for (const sheet of document.styleSheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (!rules) continue
    for (const rule of rules) {
      if (rule.type !== CSSRule.MEDIA_RULE) continue
      const text = rule.conditionText || rule.media?.mediaText || ''
      const matches = text.matchAll(/(min|max)-width:\s*([^)]+)/g)
      for (const m of matches) breakpoints.add(`${m[1]}-width: ${m[2].trim()}`)
    }
  }

  return {
    typography,
    palette,
    spacing: topN(spacingCounts, 20),
    radii: topN(radiusCounts, 10),
    shadows: topN(shadowCounts, 10),
    breakpoints: [...breakpoints].sort(),
    motion: topN(motionCounts, 15),
  }
})()
