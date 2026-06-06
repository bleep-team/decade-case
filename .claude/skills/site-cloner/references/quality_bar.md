# Quality bar

Every gate below is enforced by `scripts/verify_capture.sh`. The
script exits 0 only when **every** gate passes. On failure it
writes `<output_dir>/CAPTURE-INCOMPLETE.md` listing each failing
gate and exits non-zero.

The dossier is **not** ready to hand to a consuming agent until
this script exits clean.

## Gates

### 1. Schema validity

Every JSON file in the dossier validates against its schema (see
`output_schema.md`):

- `INDEX.json`
- `meta/capture.json`
- `meta/url-map.json`
- every `pages/<slug>/page.json`
- every `pages/<slug>/sections.json`
- every `pages/<slug>/links.json`
- every `pages/<slug>/images.json`
- `design-tokens.json`
- `assets/manifest.json`
- `assets/js-urls.json`
- `assets/api.json`

Validation runs through `ajv-cli`.

### 2. Cross-reference integrity

Every path referenced in any JSON file resolves on disk:

- `INDEX.json[].path`
- `page.json.files.*`
- `page.json.asset_refs[]`
- `sections.json[].screenshot_crops.*`
- `manifest.json[].local_path`

### 3. Coverage

Every URL in `meta/urls.txt`:

1. Has a matching `pages/<slug>/page.json`.
2. Has every viewport's screenshot at the top of the page dir
   (one PNG per viewport listed in `meta/capture.json.viewports`).
3. Has `dom.html`, `raw.html`, `copy.md`, `links.json`,
   `images.json`, `sections.json`.

### 4. Section completeness

For every entry in every `sections.json`:

1. Each `screenshot_crops.<viewport>` file exists.
2. `dom_html_byte_range` produces non-empty content when sliced
   from `dom.html`.
3. `copy_byte_range` produces non-empty content when sliced
   from `copy.md`.
4. `dominant_tokens` is non-empty.

### 5. Asset integrity

For every entry in `assets/manifest.json` without an `error`:

1. `local_path` exists on disk.
2. File size matches `bytes`.
3. CSS files parse (run through a minimal AST check).
4. Font files begin with a valid magic number
   (`wOFF`, `wOF2`, `OTTO`, `\x00\x01\x00\x00`).

### 6. Token completeness

`design-tokens.json` contains:

- ≥ 5 unique entries in `palette`.
- ≥ 1 entry in `typography`.
- ≥ 1 entry in `breakpoints`.

### 7. Agent entry points

The dossier root contains both `AGENT_GUIDE.md` and
`INDEX.json`. `AGENT_GUIDE.md` contains a "Recommended read
order" section that names at least: `INDEX.json`,
`design-tokens.json`, `rebuild-plan.md`, and one
`pages/<slug>/page.json`.

### 8. Authority clarity

Every markdown file that has a JSON twin opens with the
non-authoritative banner from `agent_audience.md`. Files
checked:

- `design-tokens.md` (twin of `design-tokens.json`)
- every `pages/<slug>/summary.md`
- `AGENT_GUIDE.md` (twin of `INDEX.json`)
- `rebuild-plan.md` (twin of `design-tokens.json` + `sections.json`)

### 9. Provenance

`meta/capture.json` contains:

- `site_name`, `source_url`, `capture_date`, `end_date`.
- Every `viewports[]` entry the capture covered.
- A `crawls.{content,desktop,mobile[,tablet]}.id` field for
  each Firecrawl crawl executed.
- An `ip_notice` field with the canonical statement:
  _"This dossier captures publicly available content from
  <source_url> for the sole purpose of internal design
  reference. Captured assets are not redistributed and are not
  re-used in shipped product code."_

### 10. No orphan files

Every file under the dossier root is either listed in
`INDEX.json` or matches an allowed-orphan pattern (raw fetches
like `meta/sitemap.xml`, `meta/robots.txt`).
