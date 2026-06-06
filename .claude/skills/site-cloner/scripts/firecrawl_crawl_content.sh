#!/usr/bin/env bash
# firecrawl_crawl_content.sh — Firecrawl /v2/crawl with text formats.
#
# Submits a crawl that produces markdown + html + rawHtml + links +
# summary + images for every page, then polls until completed and
# writes per-page artefacts under <output_dir>/pages/<slug>/.
#
# Usage: firecrawl_crawl_content.sh <url> <output_dir>
# Env:   FIRECRAWL_API_KEY must be set.
#
# Side effects:
#   - Creates pages/<slug>/{copy.md,dom.html,raw.html,links.json,summary.md,images.json}
#   - Appends the crawl id to <output_dir>/meta/capture.json under crawls.content.id
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $(basename "$0") <url> <output_dir>" >&2
  exit 64
fi

if [[ -z "${FIRECRAWL_API_KEY:-}" ]]; then
  echo "FIRECRAWL_API_KEY is not set" >&2
  exit 78
fi

URL=$1
OUTPUT_DIR=$2
PAGES_DIR="${OUTPUT_DIR}/pages"
mkdir -p "${PAGES_DIR}"

PAYLOAD=$(jq -nc --arg url "$URL" '{
  url: $url,
  limit: 200,
  scrapeOptions: {
    formats: ["markdown", "html", "rawHtml", "links", "summary", "images"],
    onlyMainContent: false,
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

echo "Crawl id (content): $CRAWL_ID" >&2

# Poll until done.
while :; do
  STATUS_RESP=$(curl -sS --fail-with-body \
    -H "Authorization: Bearer ${FIRECRAWL_API_KEY}" \
    "https://api.firecrawl.dev/v2/crawl/${CRAWL_ID}")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // "unknown"')
  echo "  content crawl status: $STATUS" >&2
  case "$STATUS" in
    completed) break ;;
    failed|cancelled) echo "Crawl failed: $STATUS_RESP" >&2; exit 70 ;;
    *) sleep 5 ;;
  esac
done

# Slug derivation matches references/capture_protocol.md.
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

# Iterate documents from the response.
echo "$STATUS_RESP" | jq -c '.data[]?' | while read -r doc; do
  doc_url=$(echo "$doc" | jq -r '.metadata.sourceURL // .metadata.url // empty')
  if [[ -z "$doc_url" ]]; then
    continue
  fi
  # Skip non-HTML responses that Firecrawl returns alongside real pages.
  # sitemap.xml, robots.txt, RSS/Atom feeds, JSON endpoints — none of these
  # belong as page directories.
  case "$doc_url" in
    *.xml|*.xml\?*|*.txt|*.txt\?*|*.json|*.json\?*|*.rss|*.rss\?*|*.atom|*.atom\?*|*.ico)
      echo "  skipping non-HTML: $doc_url" >&2
      continue
      ;;
  esac
  # Also skip if the returned MIME (via metadata.contentType) is non-HTML.
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

  echo "$doc" | jq -r '.markdown // ""'                          > "${page_dir}/copy.md"
  # Strip <script>...</script> from html to produce dom.html.
  echo "$doc" | jq -r '.html // ""' \
    | perl -0777 -pe 's{<script\b[^>]*>.*?</script>}{}gis'        > "${page_dir}/dom.html"
  echo "$doc" | jq -r '.rawHtml // ""'                            > "${page_dir}/raw.html"
  echo "$doc" | jq -c '.links // []'                              > "${page_dir}/links.json"
  echo "$doc" | jq -c '.images // []'                             > "${page_dir}/images.json"
  {
    printf '%s\n\n' "> **Non-authoritative.** The source of truth for this content is the structured artefacts in this page directory."
    echo "$doc" | jq -r '.summary // ""'
  }                                                                > "${page_dir}/summary.md"
done

# Record crawl id in meta/capture.json (create-or-merge).
mkdir -p "${OUTPUT_DIR}/meta"
CAPTURE="${OUTPUT_DIR}/meta/capture.json"
if [[ ! -f "$CAPTURE" ]]; then
  echo '{}' > "$CAPTURE"
fi
TMP=$(mktemp)
jq --arg id "$CRAWL_ID" '.crawls = (.crawls // {}) | .crawls.content = {id: $id}' \
  "$CAPTURE" > "$TMP"
mv "$TMP" "$CAPTURE"
