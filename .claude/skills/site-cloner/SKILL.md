---
name: site-cloner
description: Capture an exhaustive, agent-readable dossier of any public website — every URL, content (markdown, rendered HTML, raw HTML), every downloaded asset (images, fonts, stylesheets, media), full-page screenshots at multiple viewports, per-section structured breakdowns with bounding boxes and crops, network inventory, and a computed design-token snapshot. Outputs are JSON-first with single source of truth per fact, an AGENT_GUIDE.md entry point, and an INDEX.json file map — structured for a coding agent (Claude Code, Codex) re-implementing the site. Use when the user wants to clone, mirror, deeply study, or recreate a website. Triggers include "/site-cloner URL", "clone this site", "capture this design", "mirror this site as reference", "break down this URL". Requires a Firecrawl API key (env FIRECRAWL_API_KEY or --api-key). Output lands under docs/references/site/SITE_NAME/. Optional --target-stack picks the rebuild-plan flavor — nextjs-tailwind-shadcn, vite-react, astro, or plain-html.
---

# Site Cloner

Produce an exhaustive, machine-readable dossier of any public website,
structured so another coding agent can re-implement the site without
re-fetching the source.

## Audience

The dossier is consumed by **a coding agent**, not a human. Read
`references/agent_audience.md` before producing any output — it
defines the authority hierarchy and the single-source-of-truth
rules every artefact must honour.

## Workflow

### 1. Parse invocation

Accept the user's invocation. Required:

- `<url>` — full URL with scheme.

Optional flags:

- `--api-key <key>` — overrides `FIRECRAWL_API_KEY` env var.
- `--output-dir <path>` — overrides default
  `docs/references/site/<site_name>/`.
- `--viewports <list>` — comma-separated subset of
  `desktop,mobile,tablet` (default `desktop,mobile`).
- `--target-stack <name>` — one of `nextjs-tailwind-shadcn`
  (default), `vite-react`, `astro`, `plain-html`. Picks the
  translation hint block in `rebuild-plan.md`.
- `--mode <name>` — `static` (default) or `playwright`.
  Static mode runs Pass 5/6 against the rendered HTML Firecrawl
  returned (no browser needed, fast, no per-section bboxes /
  crops). Playwright mode runs Pass 5/6 through the Playwright
  MCP browser (slower, ~50 extra tool calls, but gives bboxes,
  screenshot crops, JS-injected fonts, and computed styles).

Derive `<site_name>` from the URL hostname: strip `www.`, replace
`.` with `-`. Example: `https://grovia.framer.ai/` →
`grovia-framer-ai`.

Resolve the API key: arg first, then `FIRECRAWL_API_KEY` env var.
If neither is set, **stop and ask the user** before continuing.

Confirm the resolved `<site_name>` and output dir with the user
before starting the capture (capturing into an existing dossier
will overwrite files).

### 2. Prepare output dir

Run `scripts/init_capture.sh <output_dir> <site_name> <source_url>
<target_stack> <viewports_csv>`. It creates:

```
<output_dir>/
├── meta/capture.json     ← seeded with invocation args + cost_estimate
├── pages/
├── assets/{images,fonts,css,media}/
└── .work/                 ← transient files (gitignored by convention)
```

`capture.json` records the actual `--viewports` you passed (not a
hardcoded default) and a `cost_estimate.firecrawl_crawl_calls`
field equal to `1 + viewport_count`.

### 3. Load the agent-audience rules

Read `references/agent_audience.md`. Every output you produce
from here on must honour:

- JSON is authoritative; markdown twins are non-authoritative
  mirrors with a banner at the top.
- One fact, one home — never repeat the same fact in two files.
- Every page-level file cross-references its siblings via the
  `page.json` manifest.

### 4. Run the six-pass capture

Open `references/capture_protocol.md` and follow it. The passes:

1. **Discovery** — `curl` for sitemap.xml/robots.txt, then
   `scripts/firecrawl_map.sh` → `meta/urls.txt`.
2. **Content + structure** — `scripts/firecrawl_crawl_content.sh`
   writes per-page `copy.md`, `dom.html`, `raw.html`,
   `links.json`, `summary.md`, `images.json`.
3. **Desktop screenshots** —
   `scripts/firecrawl_crawl_shot.sh 1440 900` →
   `pages/<slug>/desktop.png`.
4. **Mobile screenshots** —
   `scripts/firecrawl_crawl_shot.sh 390 844` →
   `pages/<slug>/mobile.png`. (Plus tablet 768 1024 if
   requested.)
5. **Asset enumeration + download.**
   - **Static mode (default):**
     `scripts/enumerate_assets_static.sh` parses each page's
     rendered `dom.html` + `raw.html` + Firecrawl `images.json`
     for asset URLs, dedupes, decodes HTML entities, and writes
     `.work/pending.json`. Then `scripts/download_assets.sh`
     curls everything in `images/fonts/css/media`. CSS is parsed
     for `@font-face src` to catch fonts not in the network
     transcript.
   - **Playwright mode (opt-in):** drive the Playwright MCP per
     page per viewport — `browser_navigate` + scroll trigger +
     `browser_network_requests` — and write `.work/pending.json`
     in the same shape. Then `scripts/download_assets.sh` runs
     identically.
6. **Design tokens + section segmentation.**
   - **Static mode (default):**
     `scripts/extract_tokens_static.mjs` parses inline `style=""`
     attributes, `<style>` blocks, and downloaded CSS for tokens.
     `scripts/segment_sections_static.mjs` walks each page's
     DOM, descends through Framer-style single-child wrappers,
     and falls back to `[data-framer-name]` if it can't fan out
     (no bboxes, no per-section crops).
   - **Playwright mode (opt-in):** run
     `scripts/extract_design_tokens.js` and
     `scripts/segment_sections.js` via `browser_evaluate` on
     each page (or just the home page for tokens). Then
     `scripts/crop_section.mjs` carves per-section PNG crops
     using bboxes.

Passes 2–4 fire in parallel — three independent Firecrawl crawl
IDs polled concurrently.

### 5. Emit agent-facing artefacts

In order:

1. `pages/<slug>/page.json` — page-level manifest, written per
   page by `segment_sections_static.mjs` (or the Playwright
   variant) during Pass 6.
2. `design-tokens.json` — merged tokens from Pass 6.
3. `assets/manifest.json` — emitted by `download_assets.sh`.
4. `INDEX.json` — `scripts/build_index.sh <output_dir>` walks
   the tree, skips `.work/`, and emits the canonical file map.
5. **`scripts/render_templates.sh <output_dir>`** reads
   `capture.json` for `{{site_name}}`, `{{source_url}}`,
   `{{capture_date}}`, `{{target_stack}}`; computes
   `{{page_count}}` / `{{asset_count}}` from disk; writes
   `AGENT_GUIDE.md`, `observations.md`, and
   `rebuild-plan.md` (the template's stack-conditional blocks
   are reduced to the matching `--target-stack`).

### 6. Verify

Run `scripts/verify_capture.sh <output_dir>`. It checks:

- Every JSON file validates against its schema (via `ajv-cli`).
- Every cross-reference path resolves on disk.
- Every page slug in `meta/urls.txt` has a matching
  `pages/<slug>/page.json` and the expected files for each
  viewport.
- Every section in every `sections.json` has its screenshot
  crops on disk and non-empty byte-range slices.
- Every entry in `assets/manifest.json` exists with matching
  byte size.
- `design-tokens.json` has ≥ 5 colors, ≥ 1 font-family, ≥ 1
  breakpoint.
- `AGENT_GUIDE.md` and `INDEX.json` exist at the dossier root.
- Each markdown twin of a JSON file has the non-authoritative
  banner.

Full rule list is in `references/quality_bar.md`.

If the script exits non-zero, write `CAPTURE-INCOMPLETE.md` at
the dossier root listing the failing checks and surface that to
the user. **Do not declare success on an incomplete capture.**

### 7. Report

Print:

- The path to the new dossier.
- The first ~20 lines of its `AGENT_GUIDE.md`.
- The Firecrawl crawl IDs (for billing audit).
- The `cost_estimate.firecrawl_crawl_calls` from `meta/capture.json`
  (this run's actual count, comparable to future runs).

## Bundled resources

### Shared infrastructure

- `scripts/init_capture.sh` — seed `meta/capture.json` from invocation args.
- `scripts/firecrawl_map.sh` — `/v2/map`.
- `scripts/firecrawl_crawl_content.sh` — `/v2/crawl` for text formats.
  Skips non-HTML responses (sitemap.xml, robots.txt, feeds, JSON, ICO).
- `scripts/firecrawl_crawl_shot.sh` — `/v2/crawl` for a screenshot viewport.
  Same junk-page filter.
- `scripts/download_assets.sh` — curl loop with categorisation; reads
  `.work/pending.json`.
- `scripts/build_index.sh` — emits `INDEX.json`; skips `.work/`.
- `scripts/render_templates.sh` — renders AGENT_GUIDE / observations /
  rebuild-plan from `assets/*.tmpl`.
- `scripts/verify_capture.sh` — runs every quality gate.

### Static mode (default Pass 5/6)

- `scripts/enumerate_assets_static.sh` — parse rendered HTML for asset URLs.
- `scripts/extract_tokens_static.mjs` — token extraction from inline styles
  - linked CSS.
- `scripts/segment_sections_static.mjs` — DOM-walking section detection
  with Framer `[data-framer-name]` fallback.

### Playwright mode (opt-in Pass 5/6)

- `scripts/extract_design_tokens.js` — `browser_evaluate` payload.
- `scripts/segment_sections.js` — `browser_evaluate` payload.
- `scripts/crop_section.mjs` — sharp-based PNG crop using bboxes.

### References & assets

- `references/agent_audience.md` — authority hierarchy, read first.
- `references/capture_protocol.md` — six-pass detail.
- `references/output_schema.md` — directory layout + JSON Schemas.
- `references/quality_bar.md` — verification rules.
- `assets/agent_guide.md.tmpl`, `observations.md.tmpl`,
  `rebuild_plan.md.tmpl` — rendered into each dossier.

## Out of scope

- Auth-walled sites (cookies, login flows).
- Decompiling minified JS bundles — URLs only.
- Anything that re-uses the captured assets in shipped product
  code. The dossier is reference-only.
