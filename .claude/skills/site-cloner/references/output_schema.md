# Output schema

Every machine-readable file in a dossier matches one of the
schemas below. `scripts/verify_capture.sh` validates each file
with `ajv-cli` using these schemas (inlined into the script's
heredoc, sourced from this document).

If you change a schema here, update the matching definition in
`scripts/verify_capture.sh`.

---

## Directory layout

```
<output_dir>/
├── AGENT_GUIDE.md              non-authoritative (banner required)
├── INDEX.json                  authoritative
├── rebuild-plan.md             non-authoritative
├── design-tokens.json          authoritative
├── design-tokens.md            non-authoritative (banner required)
├── observations.md             qualitative-only, no JSON twin
├── meta/
│   ├── sitemap.xml             raw fetched (optional)
│   ├── robots.txt              raw fetched (optional)
│   ├── url-map.json            Firecrawl /v2/map response
│   ├── urls.txt                newline-delimited canonical URL list
│   └── capture.json            authoritative provenance
├── pages/<slug>/
│   ├── page.json               authoritative (page manifest)
│   ├── sections.json           authoritative (section breakdown)
│   ├── <viewport>.png          full-page screenshot per viewport
│   ├── sections/
│   │   └── <NN>-<id>.<viewport>.png  cropped section screenshot
│   ├── dom.html                scripts stripped
│   ├── raw.html                scripts preserved
│   ├── copy.md                 authoritative for text
│   ├── summary.md              non-authoritative (banner required)
│   ├── links.json              authoritative
│   └── images.json             authoritative
└── assets/
    ├── images/                 downloaded bytes
    ├── fonts/                  downloaded bytes
    ├── css/                    downloaded bytes
    ├── media/                  downloaded bytes
    ├── js-urls.json            authoritative (URLs only)
    ├── api.json                authoritative
    └── manifest.json           authoritative
```

---

## Slug derivation

- `/` → `home`
- otherwise: `tolower(path).replace('/', '_').replace(/[^A-Za-z0-9_-]/g, '-')`,
  collapse repeated separators, trim leading/trailing separators.

---

## JSON Schemas

### `INDEX.json`

```json
{
  "type": "object",
  "required": ["site_name", "source_url", "capture_date", "target_stack", "files"],
  "properties": {
    "site_name": { "type": "string" },
    "source_url": { "type": "string", "format": "uri" },
    "capture_date": { "type": "string", "format": "date-time" },
    "target_stack": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "purpose", "authoritative", "bytes"],
        "properties": {
          "path": { "type": "string" },
          "purpose": { "type": "string" },
          "authoritative": { "type": "boolean" },
          "schema": { "type": "string" },
          "bytes": { "type": "integer", "minimum": 0 }
        }
      }
    }
  }
}
```

### `meta/capture.json`

```json
{
  "type": "object",
  "required": ["site_name", "source_url", "capture_date", "viewports", "target_stack", "crawls"],
  "properties": {
    "site_name": { "type": "string" },
    "source_url": { "type": "string", "format": "uri" },
    "capture_date": { "type": "string", "format": "date-time" },
    "end_date": { "type": "string", "format": "date-time" },
    "viewports": { "type": "array", "items": { "enum": ["desktop", "mobile", "tablet"] } },
    "target_stack": { "enum": ["nextjs-tailwind-shadcn", "vite-react", "astro", "plain-html"] },
    "crawls": {
      "type": "object",
      "properties": {
        "content": { "type": "object", "properties": { "id": { "type": "string" } } },
        "desktop": { "type": "object", "properties": { "id": { "type": "string" } } },
        "mobile": { "type": "object", "properties": { "id": { "type": "string" } } },
        "tablet": { "type": "object", "properties": { "id": { "type": "string" } } }
      }
    },
    "incomplete_pages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["url", "reason"],
        "properties": {
          "url": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "ip_notice": { "type": "string" }
  }
}
```

### `pages/<slug>/page.json`

```json
{
  "type": "object",
  "required": ["url", "slug", "raw_html_sha256", "files", "section_count"],
  "properties": {
    "url": { "type": "string", "format": "uri" },
    "slug": { "type": "string" },
    "raw_html_sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "files": {
      "type": "object",
      "required": [
        "copy_md",
        "dom_html",
        "raw_html",
        "links_json",
        "images_json",
        "sections_json",
        "screenshots"
      ],
      "properties": {
        "copy_md": { "type": "string" },
        "dom_html": { "type": "string" },
        "raw_html": { "type": "string" },
        "summary_md": { "type": "string" },
        "links_json": { "type": "string" },
        "images_json": { "type": "string" },
        "sections_json": { "type": "string" },
        "screenshots": { "type": "object", "additionalProperties": { "type": "string" } }
      }
    },
    "section_count": { "type": "integer", "minimum": 0 },
    "asset_refs": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `pages/<slug>/sections.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": [
      "id",
      "selector",
      "bbox",
      "dom_html_byte_range",
      "raw_html_byte_range",
      "copy_byte_range",
      "dominant_tokens",
      "screenshot_crops"
    ],
    "properties": {
      "id": { "type": "string" },
      "selector": { "type": "string" },
      "bbox": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "required": ["x", "y", "w", "h"],
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" },
            "w": { "type": "number" },
            "h": { "type": "number" }
          }
        }
      },
      "dom_html_byte_range": {
        "type": "array",
        "items": { "type": "integer" },
        "minItems": 2,
        "maxItems": 2
      },
      "raw_html_byte_range": {
        "type": "array",
        "items": { "type": "integer" },
        "minItems": 2,
        "maxItems": 2
      },
      "copy_byte_range": {
        "type": "array",
        "items": { "type": "integer" },
        "minItems": 2,
        "maxItems": 2
      },
      "dominant_tokens": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      },
      "screenshot_crops": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    }
  }
}
```

### `design-tokens.json`

```json
{
  "type": "object",
  "required": ["typography", "palette", "spacing", "radii", "shadows", "breakpoints", "motion"],
  "properties": {
    "typography": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["selector", "font_family", "font_size"],
        "properties": {
          "selector": { "type": "string" },
          "font_family": { "type": "string" },
          "font_size": { "type": "string" },
          "font_weight": { "type": "string" },
          "line_height": { "type": "string" },
          "letter_spacing": { "type": "string" }
        }
      }
    },
    "palette": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["value", "frequency", "roles"],
        "properties": {
          "value": { "type": "string" },
          "frequency": { "type": "integer", "minimum": 1 },
          "roles": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "spacing": { "type": "array", "items": { "type": "string" } },
    "radii": { "type": "array", "items": { "type": "string" } },
    "shadows": { "type": "array", "items": { "type": "string" } },
    "breakpoints": { "type": "array", "items": { "type": "string" } },
    "motion": { "type": "array", "items": { "type": "string" } }
  }
}
```

### `assets/manifest.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["original_url", "category"],
    "properties": {
      "original_url": { "type": "string", "format": "uri" },
      "local_path": { "type": "string" },
      "category": { "enum": ["images", "fonts", "css", "media"] },
      "mime": { "type": "string" },
      "bytes": { "type": "integer", "minimum": 0 },
      "referencing_pages": { "type": "array", "items": { "type": "string" } },
      "viewports": { "type": "array", "items": { "enum": ["desktop", "mobile", "tablet"] } },
      "error": { "type": "string" }
    }
  }
}
```

### `assets/js-urls.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["original_url"],
    "properties": {
      "original_url": { "type": "string", "format": "uri" },
      "referencing_pages": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### `assets/api.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["method", "url"],
    "properties": {
      "method": { "type": "string" },
      "url": { "type": "string" },
      "referencing_pages": { "type": "array", "items": { "type": "string" } },
      "response_sample": {}
    }
  }
}
```

### `pages/<slug>/links.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["href"],
    "properties": {
      "href": { "type": "string" },
      "text": { "type": "string" },
      "same_origin": { "type": "boolean" }
    }
  }
}
```

### `pages/<slug>/images.json`

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["src"],
    "properties": {
      "src": { "type": "string" },
      "alt": { "type": "string" },
      "width": { "type": "integer" },
      "height": { "type": "integer" }
    }
  }
}
```
