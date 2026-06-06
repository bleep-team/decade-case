# Audience and authority rules

A `site-cloner` dossier is consumed by **a coding agent**
(Claude Code, Codex, or similar) attempting to re-implement the
captured site in a target stack. Treat every output as input to
another agent, not as a human reading guide.

Apply these rules to every artefact produced:

## 1. JSON is authoritative

Markdown files exist only as human-skim mirrors of structured
JSON. They are not the source of truth. Every markdown twin of a
JSON file must open with this banner:

```
> **Non-authoritative.** The source of truth for this content is
> `<filename>.json`. If the two disagree, trust the JSON.
```

Verifier `scripts/verify_capture.sh` rejects dossiers where this
banner is missing.

## 2. One fact, one home

Never write the same fact in two files. Below is the authority
hierarchy — when in doubt, consult this table:

| Fact                   | Authoritative file                   |
| ---------------------- | ------------------------------------ |
| Page list              | `meta/urls.txt`                      |
| Page-level metadata    | `pages/<slug>/page.json`             |
| Section breakdown      | `pages/<slug>/sections.json`         |
| Design tokens          | `design-tokens.json`                 |
| Asset inventory        | `assets/manifest.json`               |
| Network API endpoints  | `assets/api.json`                    |
| Script URLs (no bytes) | `assets/js-urls.json`                |
| Rebuild instructions   | `rebuild-plan.md` (per target stack) |
| Visual ground truth    | screenshots in `pages/<slug>/`       |
| Pre-JS markup          | `pages/<slug>/raw.html`              |
| Post-JS markup         | `pages/<slug>/dom.html`              |
| Copy                   | `pages/<slug>/copy.md`               |
| Capture provenance     | `meta/capture.json`                  |
| File index             | `INDEX.json`                         |

## 3. Cross-link everything

Each page-level file references its siblings via the
`page.json` manifest. A consuming agent should never need to
guess which files belong to a given page — `page.json` lists
them all by relative path.

## 4. Deterministic structure

File paths, slug rules, JSON keys, and section IDs are stable
across captures. A consuming agent can hard-code expectations
like `pages/<slug>/sections.json[0].screenshot_crop.desktop`
without checking what's actually present.

## 5. Don't summarise where data exists

Never write prose like "this section uses brand colours" when
`sections.json` already has a `dominant_tokens` field. Prose is
for behaviour that JSON cannot capture: motion, interactions,
layout rhythm. That qualitative material lives only in
`observations.md`.

## 6. Reference, don't reproduce

Captured assets and copy are reference material for the consuming
agent. Re-using them verbatim in shipped product code is out of
scope and noted in every dossier's `AGENT_GUIDE.md`.
