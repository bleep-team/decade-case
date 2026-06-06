#!/usr/bin/env bash
# build_index.sh — walk a dossier and emit INDEX.json.
#
# Each entry has: path (relative to dossier root), purpose,
# authoritative (boolean), schema (optional), bytes.
#
# Usage: build_index.sh <output_dir>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <output_dir>" >&2
  exit 64
fi

OUTPUT_DIR=$1
INDEX="${OUTPUT_DIR}/INDEX.json"

if [[ ! -d "$OUTPUT_DIR" ]]; then
  echo "Not a directory: $OUTPUT_DIR" >&2
  exit 65
fi

# Pull provenance from capture.json (we expect it to exist by now).
CAPTURE="${OUTPUT_DIR}/meta/capture.json"
if [[ ! -f "$CAPTURE" ]]; then
  echo "Missing $CAPTURE" >&2
  exit 65
fi

SITE_NAME=$(jq -r '.site_name // empty'    "$CAPTURE")
SOURCE_URL=$(jq -r '.source_url // empty'  "$CAPTURE")
CAPTURE_DATE=$(jq -r '.capture_date // empty' "$CAPTURE")
TARGET_STACK=$(jq -r '.target_stack // empty' "$CAPTURE")

classify() {
  local path=$1
  case "$path" in
    AGENT_GUIDE.md)              echo "agent-entry-point|false|" ;;
    INDEX.json)                  echo "file-index|true|INDEX.schema.json" ;;
    rebuild-plan.md)             echo "rebuild-instructions|false|" ;;
    design-tokens.json)          echo "design-tokens|true|design-tokens.schema.json" ;;
    design-tokens.md)            echo "design-tokens-mirror|false|" ;;
    observations.md)             echo "qualitative-notes|false|" ;;
    meta/capture.json)           echo "capture-provenance|true|capture.schema.json" ;;
    meta/url-map.json)           echo "firecrawl-map-raw|true|" ;;
    meta/sitemap.xml)            echo "raw-fetch|false|" ;;
    meta/robots.txt)             echo "raw-fetch|false|" ;;
    meta/urls.txt)               echo "canonical-url-list|true|" ;;
    pages/*/page.json)           echo "page-manifest|true|page.schema.json" ;;
    pages/*/sections.json)       echo "section-breakdown|true|sections.schema.json" ;;
    pages/*/links.json)          echo "page-links|true|links.schema.json" ;;
    pages/*/images.json)         echo "page-images|true|images.schema.json" ;;
    pages/*/copy.md)             echo "page-copy|true|" ;;
    pages/*/summary.md)          echo "page-summary-mirror|false|" ;;
    pages/*/dom.html)            echo "rendered-html|true|" ;;
    pages/*/raw.html)            echo "raw-html|true|" ;;
    pages/*/*.png)               echo "screenshot|true|" ;;
    pages/*/sections/*.png)      echo "section-screenshot|true|" ;;
    assets/manifest.json)        echo "asset-inventory|true|manifest.schema.json" ;;
    assets/js-urls.json)         echo "script-urls|true|js-urls.schema.json" ;;
    assets/api.json)             echo "api-inventory|true|api.schema.json" ;;
    assets/images/*|assets/fonts/*|assets/css/*|assets/media/*)
                                 echo "downloaded-asset|true|" ;;
    *)                           echo "auxiliary|false|" ;;
  esac
}

FILES_JSON='[]'

# Walk the tree, skip the INDEX itself and any transient files under .work/.
while IFS= read -r abs; do
  rel="${abs#${OUTPUT_DIR}/}"
  case "$rel" in
    INDEX.json) continue ;;
    .work/*) continue ;;
    # legacy locations from older skill versions — silently skip
    assets/_pending.json|assets/.pending-consumed.json) continue ;;
  esac
  meta=$(classify "$rel")
  purpose=$(echo "$meta" | cut -d'|' -f1)
  authoritative=$(echo "$meta" | cut -d'|' -f2)
  schema=$(echo "$meta" | cut -d'|' -f3)
  bytes=$(stat -f%z "$abs" 2>/dev/null || stat -c%s "$abs")
  FILES_JSON=$(echo "$FILES_JSON" | jq \
    --arg path "$rel" \
    --arg purpose "$purpose" \
    --argjson authoritative "$authoritative" \
    --arg schema "$schema" \
    --argjson bytes "$bytes" \
    '. + [{
      path: $path,
      purpose: $purpose,
      authoritative: $authoritative,
      schema: (if $schema == "" then null else $schema end),
      bytes: $bytes
    }]')
done < <(find "$OUTPUT_DIR" -type f | LC_ALL=C sort)

jq -n \
  --arg site_name "$SITE_NAME" \
  --arg source_url "$SOURCE_URL" \
  --arg capture_date "$CAPTURE_DATE" \
  --arg target_stack "$TARGET_STACK" \
  --argjson files "$FILES_JSON" \
  '{
    site_name: $site_name,
    source_url: $source_url,
    capture_date: $capture_date,
    target_stack: $target_stack,
    files: $files
  }' > "$INDEX"

echo "Wrote $INDEX ($(jq 'length' <<<"$FILES_JSON") files)" >&2
