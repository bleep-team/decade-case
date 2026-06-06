#!/usr/bin/env bash
# firecrawl_crawl_shot.sh — Firecrawl /v2/crawl for screenshots at a viewport.
#
# Submits a screenshot crawl at the given viewport, polls until
# completed, decodes each page's PNG, and writes it to
# pages/<slug>/<viewport_label>.png.
#
# Usage: firecrawl_crawl_shot.sh <width> <height> <url> <output_dir> <viewport_label>
#   e.g. firecrawl_crawl_shot.sh 1440 900 https://example.com out desktop
# Env:   FIRECRAWL_API_KEY must be set.
set -euo pipefail

if [[ $# -ne 5 ]]; then
  echo "Usage: $(basename "$0") <width> <height> <url> <output_dir> <viewport_label>" >&2
  exit 64
fi

if [[ -z "${FIRECRAWL_API_KEY:-}" ]]; then
  echo "FIRECRAWL_API_KEY is not set" >&2
  exit 78
fi

WIDTH=$1
HEIGHT=$2
URL=$3
OUTPUT_DIR=$4
LABEL=$5
PAGES_DIR="${OUTPUT_DIR}/pages"
mkdir -p "${PAGES_DIR}"

PAYLOAD=$(jq -nc \
  --arg url "$URL" \
  --argjson w "$WIDTH" \
  --argjson h "$HEIGHT" '{
    url: $url,
    limit: 200,
    scrapeOptions: {
      formats: [
        { type: "screenshot", fullPage: true, quality: 100,
          viewport: { width: $w, height: $h } }
      ],
      waitFor: 2000
    }
  }')

START_RESP=$(curl -sS --fail-with-body \
  -X POST "https://api.firecrawl.dev/v2/crawl" \
  -H "Authorization: Bearer ${FIRECRAWL_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD")

CRAWL_ID=$(echo "$START_RESP" | jq -r '.id // empty')
if [[ -z "$CRAWL_ID" ]]; then
  echo "Could not extract crawl id from response: $START_RESP" >&2
  exit 70
fi

echo "Crawl id (${LABEL}): $CRAWL_ID" >&2

while :; do
  STATUS_RESP=$(curl -sS --fail-with-body \
    -H "Authorization: Bearer ${FIRECRAWL_API_KEY}" \
    "https://api.firecrawl.dev/v2/crawl/${CRAWL_ID}")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // "unknown"')
  echo "  ${LABEL} crawl status: $STATUS" >&2
  case "$STATUS" in
    completed) break ;;
    failed|cancelled) echo "Crawl failed: $STATUS_RESP" >&2; exit 70 ;;
    *) sleep 5 ;;
  esac
done

slugify() {
  local url=$1
  local path
  path=$(printf '%s' "$url" | awk -F/ '{ for (i=4; i<=NF; i++) printf "%s%s", (i>4 ? "_" : ""), $i }')
  if [[ -z "$path" || "$path" == "_" ]]; then
    printf 'home'
    return
  fi
  printf '%s' "$path" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/_+/_/g; s/^[-_]+//; s/[-_]+$//'
}

echo "$STATUS_RESP" | jq -c '.data[]?' | while read -r doc; do
  doc_url=$(echo "$doc" | jq -r '.metadata.sourceURL // .metadata.url // empty')
  if [[ -z "$doc_url" ]]; then
    continue
  fi
  # Skip the same non-HTML responses that content crawl skips, otherwise
  # Firecrawl creates dummy screenshots for sitemap.xml / robots.txt etc.
  case "$doc_url" in
    *.xml|*.xml\?*|*.txt|*.txt\?*|*.json|*.json\?*|*.rss|*.rss\?*|*.atom|*.atom\?*|*.ico)
      echo "  skipping non-HTML: $doc_url" >&2
      continue
      ;;
  esac
  ct=$(echo "$doc" | jq -r '.metadata.contentType // .metadata["content-type"] // empty' | tr '[:upper:]' '[:lower:]')
  case "$ct" in
    application/xml*|text/xml*|text/plain*|application/json*|application/rss*|application/atom*)
      echo "  skipping by content-type ($ct): $doc_url" >&2
      continue
      ;;
  esac
  slug=$(slugify "$doc_url")
  page_dir="${PAGES_DIR}/${slug}"
  mkdir -p "$page_dir"

  # Screenshot may be returned either as a base64 string or as a URL pointing
  # at Firecrawl's CDN. Handle both.
  shot=$(echo "$doc" | jq -r '.screenshot // empty')
  if [[ -z "$shot" ]]; then
    echo "  no screenshot for $doc_url" >&2
    continue
  fi
  case "$shot" in
    http://*|https://*)
      curl -sS --fail -L "$shot" -o "${page_dir}/${LABEL}.png"
      ;;
    data:image/*\;base64,*)
      printf '%s' "${shot#*base64,}" | base64 -d > "${page_dir}/${LABEL}.png"
      ;;
    *)
      # Assume bare base64.
      printf '%s' "$shot" | base64 -d > "${page_dir}/${LABEL}.png"
      ;;
  esac
done

CAPTURE="${OUTPUT_DIR}/meta/capture.json"
mkdir -p "$(dirname "$CAPTURE")"
if [[ ! -f "$CAPTURE" ]]; then
  echo '{}' > "$CAPTURE"
fi
TMP=$(mktemp)
jq --arg id "$CRAWL_ID" --arg label "$LABEL" \
  '.crawls = (.crawls // {}) | .crawls[$label] = {id: $id}' \
  "$CAPTURE" > "$TMP"
mv "$TMP" "$CAPTURE"
