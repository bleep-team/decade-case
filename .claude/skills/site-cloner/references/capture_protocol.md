# Capture protocol

Six passes, executed in this order. Passes 2, 3, and 4 are
independent Firecrawl `/v2/crawl` calls and **must fire in
parallel** (kick off all three, then poll IDs concurrently).

Pass 5 and Pass 6 each have **two modes**:

- **static** (default) — runs against the rendered HTML Firecrawl
  returned. No browser required, ~10s, no per-section bboxes /
  crops.
- **playwright** — runs through the Playwright MCP browser. Slower,
  ~50 extra tool calls per small site, but produces per-section
  bounding boxes, screenshot crops, JS-injected fonts, and live
  computed styles.

The user's invocation provides:

- `$TARGET_URL`
- `$OUTPUT_DIR` (default `docs/references/site/<site_name>/`)
- `$FIRECRAWL_API_KEY`
- `$VIEWPORTS` (default `desktop,mobile`)
- `$TARGET_STACK` (default `nextjs-tailwind-shadcn`)
- `$MODE` (default `static`; `playwright` to opt in)

Every helper script reads these from env. Export them once at the
start of the capture run, then call `init_capture.sh` to seed
`meta/capture.json`.

---

## Pass 1 — Discovery

```bash
mkdir -p "$OUTPUT_DIR/meta"

# Best-effort: many sites don't expose either.
curl -sS -L --max-time 10 "$TARGET_URL/sitemap.xml" \
     -o "$OUTPUT_DIR/meta/sitemap.xml" || true
curl -sS -L --max-time 10 "$TARGET_URL/robots.txt" \
     -o "$OUTPUT_DIR/meta/robots.txt" || true

# Always required.
scripts/firecrawl_map.sh "$TARGET_URL" \
  > "$OUTPUT_DIR/meta/url-map.json"
```

Reconcile sources into `$OUTPUT_DIR/meta/urls.txt`:

1. Parse `<loc>` entries from `meta/sitemap.xml` if present.
2. Parse `links[]` from `meta/url-map.json`.
3. Restrict to same-origin URLs (same scheme + host as
   `$TARGET_URL`).
4. Drop query strings unless the path is `/` (some marketing
   sites use `?ref=` tracking that doesn't affect content).
5. Drop fragments.
6. Dedupe, sort, write one URL per line to `meta/urls.txt`.

Stop the run if `meta/urls.txt` is empty.

---

## Pass 2 — Content + structure (Firecrawl `/v2/crawl`)

`scripts/firecrawl_crawl_content.sh "$TARGET_URL" "$OUTPUT_DIR"`

The script POSTs:

```json
{
  "url": "$TARGET_URL",
  "limit": 200,
  "scrapeOptions": {
    "formats": ["markdown", "html", "rawHtml", "links", "summary", "images"],
    "onlyMainContent": false,
    "waitFor": 2000
  }
}
```

Then polls `/v2/crawl/<id>` until `status == "completed"`.

For each returned page, write:

- `pages/<slug>/copy.md` ← `markdown`
- `pages/<slug>/dom.html` ← `html` with all `<script>` elements
  stripped (use a small sed/awk filter or the Node helper)
- `pages/<slug>/raw.html` ← `rawHtml` (preserve inline framework
  config in `<script>`)
- `pages/<slug>/links.json` ← `links` (canonicalised, same-origin
  flag per entry)
- `pages/<slug>/summary.md` ← `summary` with the
  non-authoritative banner prepended
- `pages/<slug>/images.json` ← `images` array

Record the crawl ID in `meta/capture.json` as
`crawls.content.id`.

---

## Pass 3 — Desktop screenshots (Firecrawl `/v2/crawl`)

`scripts/firecrawl_crawl_shot.sh 1440 900 "$TARGET_URL" "$OUTPUT_DIR" desktop`

POST:

```json
{
  "url": "$TARGET_URL",
  "limit": 200,
  "scrapeOptions": {
    "formats": [
      {
        "type": "screenshot",
        "fullPage": true,
        "quality": 100,
        "viewport": { "width": 1440, "height": 900 }
      }
    ],
    "waitFor": 2000
  }
}
```

For each page, base64-decode the screenshot and write to
`pages/<slug>/desktop.png`. Record crawl ID as
`crawls.desktop.id`.

---

## Pass 4 — Mobile screenshots (Firecrawl `/v2/crawl`)

`scripts/firecrawl_crawl_shot.sh 390 844 "$TARGET_URL" "$OUTPUT_DIR" mobile`

Same as Pass 3 with viewport 390 × 844. Output:
`pages/<slug>/mobile.png`. Record crawl ID as
`crawls.mobile.id`.

If `--viewports` includes `tablet`, fire a fourth crawl at
768 × 1024 → `pages/<slug>/tablet.png`, ID
`crawls.tablet.id`.

---

## Pass 5 — Asset enumeration + download

### Static mode (default)

```bash
scripts/enumerate_assets_static.sh "$OUTPUT_DIR"
scripts/download_assets.sh             "$OUTPUT_DIR"
```

`enumerate_assets_static.sh` parses each page's
`pages/<slug>/dom.html`, `raw.html`, and `images.json` for
asset references:

- `<img src>` and `<img data-src>` → images
- `<link rel="stylesheet" href>` → css
- `<link rel="preload" as="font" href>` → fonts
- `<source srcset>` → images or media (by extension)
- `<video|audio src>` → media
- `<script src>` → scripts (URL only)
- inline `style="…url(…)…"` → images / fonts / media (by ext)

URLs are HTML-entity-decoded before being emitted to
`.work/pending.json`.

`download_assets.sh` reads `.work/pending.json`, dedupes, and
`curl -L --fail --max-time 30`s each non-`scripts`/-`api` URL
into the matching `assets/<category>/` folder. CSS files are
re-parsed for `@font-face src` URLs and any missed fonts are
fetched. Final output: `assets/manifest.json`.

### Playwright mode (opt-in)

For each URL in `meta/urls.txt`, do **one Playwright session per
viewport**:

1. `browser_resize <w> <h>`.
2. `browser_navigate <url>`, wait for `networkidle`.
3. Scroll smoothly to the bottom, then back to the top, with a
   ~500 ms pause every 25 % to trigger any
   `IntersectionObserver`-based lazy loads.
4. `browser_network_requests` to dump the full transcript.
5. Categorise each request by `resource_type`:
   - `image` → assets/images/
   - `font` → assets/fonts/
   - `stylesheet` → assets/css/
   - `media` (video/audio) → assets/media/
   - `script` → `assets/js-urls.json` (URL only)
   - `xhr` / `fetch` → `assets/api.json` with method + URL +
     response shape if response ≤ 50 KB

Write the merged result to `.work/pending.json` in the same
shape `enumerate_assets_static.sh` would. Then run
`scripts/download_assets.sh` exactly as in static mode.

---

## Pass 6 — Design tokens + section segmentation

### Static mode (default)

```bash
node scripts/extract_tokens_static.mjs    "$OUTPUT_DIR"
node scripts/segment_sections_static.mjs  "$OUTPUT_DIR"
```

`extract_tokens_static.mjs` parses every page's `dom.html`,
`raw.html`, plus all downloaded `.css` files for:

- typography (family, size, weight, line-height, letter-spacing
  on representative selectors)
- palette (every hex/rgb/rgba/hsl value, frequency-counted,
  classified by role)
- spacing / radii / shadows / motion
- `@media (min|max-width: …)` breakpoints

Writes `design-tokens.json` (authoritative) and a
non-authoritative `design-tokens.md` mirror with a banner.

`segment_sections_static.mjs` walks each page's `dom.html` from
`<main>` (or `<body>`) downwards. It descends through Framer-style
single-child wrappers until siblings fan out (≥ 2 meaningful
children) or `MAX_DEPTH=20` is reached. If after MAX_DEPTH a
single ≥ 40% wrapper remains (typical of Framer's
absolute-positioned home pages), it falls back to one section
per `[data-framer-name]` attribute inside it. Per page, writes
`sections.json` (with empty `bbox` / `screenshot_crops` — those
require a browser) and `page.json` (manifest cross-linking
every sibling file).

### Playwright mode (opt-in)

Two Playwright `evaluate` payloads, run per viewport on every
page. The home page receives a deeper token sweep.

### 6a. Design tokens (home + one secondary page)

```bash
# Home page, desktop:
browser_resize 1440 900
browser_navigate "$TARGET_URL"
TOKENS_HOME=$(browser_evaluate < scripts/extract_design_tokens.js)

# First non-home URL from meta/urls.txt:
browser_navigate "$SECONDARY_URL"
TOKENS_SECONDARY=$(browser_evaluate < scripts/extract_design_tokens.js)
```

Merge both into a single token object (deduping by value,
summing frequency counts) and write
`$OUTPUT_DIR/design-tokens.json`. Schema is documented in
`output_schema.md`.

Also emit a non-authoritative
`$OUTPUT_DIR/design-tokens.md` mirror with the banner at the top.

### 6b. Section segmentation (every page, every viewport)

For each page, for each viewport:

1. Navigate at the right viewport.
2. `browser_evaluate < scripts/segment_sections.js` — returns
   an array of section descriptors:

   ```json
   {
     "id": "hero",
     "selector": "main > section:nth-child(1)",
     "bbox": { "x": 0, "y": 0, "w": 1440, "h": 720 },
     "dom_html_byte_range": [1234, 5678],
     "raw_html_byte_range": [1287, 6020],
     "copy_byte_range": [12, 248],
     "dominant_tokens": {
       "background_color": "#0f0f10",
       "text_color": "#fafafa",
       "font_family": "Inter, sans-serif"
     }
   }
   ```

   Section detection algorithm:
   - Start with `document.querySelectorAll('main > *')`;
     fall back to `body > *` if no `<main>`.
   - Keep elements whose bounding `width` ≥ 95 % of viewport
     width.
   - Assign each a stable `id`: prefer the element's own
     `id`/`data-section`; fall back to slug-of-first-h1-inside,
     fall back to `section-<n>`.

3. Crop the full-page screenshot to each section's Y-range:

   ```bash
   node scripts/crop_section.mjs \
     --input "pages/<slug>/<viewport>.png" \
     --top  <bbox.y> \
     --height <bbox.h> \
     --output "pages/<slug>/sections/<index>-<id>.<viewport>.png"
   ```

4. Compute byte ranges by re-reading `dom.html`, `raw.html`,
   and `copy.md` and finding each section's identifying
   substring (matching by the `outerHTML` start tag + a short
   stable prefix).

Write per page: `pages/<slug>/sections.json` (one array, with
the union of viewports per section — each section object has
`bbox.desktop`, `bbox.mobile`, etc.).

### 6c. Per-page manifest

Render `pages/<slug>/page.json`:

```json
{
  "url": "...",
  "slug": "...",
  "raw_html_sha256": "...",
  "files": {
    "copy_md":      "copy.md",
    "dom_html":     "dom.html",
    "raw_html":     "raw.html",
    "summary_md":   "summary.md",
    "links_json":   "links.json",
    "images_json":  "images.json",
    "sections_json": "sections.json",
    "screenshots": {
      "desktop": "desktop.png",
      "mobile":  "mobile.png"
    }
  },
  "section_count": 7,
  "asset_refs":    ["assets/images/...png", ...]
}
```

---

## After the six passes

Render the dossier-level artefacts in this order:

1. `scripts/build_index.sh "$OUTPUT_DIR"` → `INDEX.json`.
2. Render `AGENT_GUIDE.md` from
   `assets/agent_guide.md.tmpl` with template substitutions.
3. Render `rebuild-plan.md` from
   `assets/rebuild_plan.md.tmpl` — keep only the translation
   hint block matching `$TARGET_STACK`.
4. Render `observations.md` from
   `assets/observations.md.tmpl` (the agent fills in
   qualitative notes).
5. Update `meta/capture.json` with final crawl IDs, page count,
   asset count, end timestamp.

Run `scripts/verify_capture.sh "$OUTPUT_DIR"` — see
`quality_bar.md`.

---

## Slug derivation

- `/` → `home`
- otherwise: lowercase the URL path; replace `/` with `_`;
  replace any non-alphanumeric character (except `_` and `-`)
  with `-`; collapse repeated separators; trim leading/trailing
  separators.
- `/features/agents` → `features_agents`
- `/blog/2025/why-bleep/` → `blog_2025_why-bleep`

---

## Edge cases

- **Crawl returns < pages in `urls.txt`.** Re-run with
  `limit: 500`, log the gap. If still short, fall back to per-URL
  `/v2/scrape` for the missing pages.
- **Page has no `<main>` or `<section>`.** Section segmentation
  falls back to `body > *` direct children.
- **`networkidle` never fires.** Cap each Playwright navigation
  at 30 s; record the failure in `meta/capture.json` under
  `incomplete_pages[]` but continue with the rest.
- **Asset 404s or rate-limits.** Record in
  `assets/manifest.json` with `error: "<reason>"`; don't fail
  the whole capture.
- **Single-page apps** (`urls.txt` has one entry). The protocol
  still works — there's just one page directory.
