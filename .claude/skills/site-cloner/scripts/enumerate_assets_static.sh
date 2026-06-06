#!/usr/bin/env bash
# enumerate_assets_static.sh — build .work/pending.json by parsing
# Firecrawl's per-page images.json and the rendered dom.html / raw.html
# for stylesheet, font, image, and media URLs. No browser required.
#
# Usage: enumerate_assets_static.sh <output_dir>
#
# Emits <output_dir>/.work/pending.json — input for download_assets.sh.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <output_dir>" >&2
  exit 64
fi

OUT=$1
PAGES_DIR="${OUT}/pages"
ASSETS_DIR="${OUT}/assets"
WORK_DIR="${OUT}/.work"
mkdir -p "$ASSETS_DIR" "$WORK_DIR"

TMP_PENDING=$(mktemp)
trap 'rm -f "$TMP_PENDING"' EXIT

# Decode common HTML entities in a URL.
decode_entities() {
  printf '%s' "$1" \
    | sed -E 's/&amp;/\&/g; s/&#38;/\&/g; s/&#x26;/\&/g; s/&quot;/"/g; s/&#39;/'\''/g; s/&lt;/</g; s/&gt;/>/g'
}

# Append one URL spec to TMP_PENDING as a JSON line.
# Args: <original_url> <category> <referencing_page_slug>
emit() {
  local url=$1 cat=$2 slug=$3
  # Decode HTML entities so curl can use the URL.
  url=$(decode_entities "$url")
  # Skip data: URLs, blob:, javascript:, mailto:, tel:, and empty.
  case "$url" in
    ""|data:*|blob:*|javascript:*|mailto:*|tel:*|\#*) return 0 ;;
  esac
  # Resolve protocol-relative URLs.
  case "$url" in
    //*) url="https:$url" ;;
  esac
  # Skip non-http(s).
  case "$url" in
    http://*|https://*) ;;
    *) return 0 ;;
  esac
  jq -nc \
    --arg url "$url" \
    --arg cat "$cat" \
    --arg slug "$slug" \
    '{original_url: $url, category: $cat, referencing_pages: [$slug], viewports: ["desktop","mobile"]}'
}

for page_dir in "$PAGES_DIR"/*/; do
  slug=$(basename "$page_dir")

  # Images from Firecrawl's images.json (array of { src, alt, ... } or strings).
  if [[ -f "$page_dir/images.json" ]]; then
    while IFS= read -r src; do
      emit "$src" images "$slug" >> "$TMP_PENDING"
    done < <(jq -r '
      if type == "array" then
        .[]
        | if type == "string" then . elif type == "object" then (.src // .url // empty) else empty end
      else empty end
    ' "$page_dir/images.json" 2>/dev/null)
  fi

  # Stylesheets, fonts, video, audio, additional images from dom.html.
  for html in "$page_dir/dom.html" "$page_dir/raw.html"; do
    [[ -f "$html" ]] || continue
    # <link rel="stylesheet" href="...">
    perl -ne 'while (m{<link[^>]+rel\s*=\s*["'\'']?(?:stylesheet|preload)["'\'']?[^>]+href\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | while IFS= read -r u; do emit "$u" css "$slug" >> "$TMP_PENDING"; done
    # <link rel="..." as="font" href="...">  → fonts (preload)
    perl -ne 'while (m{<link[^>]+as\s*=\s*["'\'']?font["'\'']?[^>]+href\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | while IFS= read -r u; do emit "$u" fonts "$slug" >> "$TMP_PENDING"; done
    # <img src="..."> (also catches lazy-loaded if attr exists at render time)
    perl -ne 'while (m{<img[^>]+(?:data-src|src)\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | while IFS= read -r u; do emit "$u" images "$slug" >> "$TMP_PENDING"; done
    # <source src="...">  → media if inside <video>/<audio>, image-like otherwise. Categorise by extension.
    perl -ne 'while (m{<source[^>]+srcset?\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | tr ',' '\n' | awk '{print $1}' \
      | while IFS= read -r u; do
          case "$u" in
            *.mp4|*.webm|*.mov|*.mp3|*.wav|*.ogg) emit "$u" media "$slug" >> "$TMP_PENDING" ;;
            *) emit "$u" images "$slug" >> "$TMP_PENDING" ;;
          esac
        done
    # <video|audio src="...">
    perl -ne 'while (m{<(?:video|audio)[^>]+src\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | while IFS= read -r u; do emit "$u" media "$slug" >> "$TMP_PENDING"; done
    # url(...) inside inline style="" attributes.
    perl -ne 'while (m{style\s*=\s*["'\''][^"'\'']*url\(([^)]+)\)[^"'\'']*["'\'']}gi) {
                my $u = $1; $u =~ s/^["'\''\s]+|["'\''\s]+$//g; print "$u\n"; }' "$html" \
      | while IFS= read -r u; do
          case "$u" in
            *.woff|*.woff2|*.ttf|*.otf|*.eot) emit "$u" fonts "$slug" >> "$TMP_PENDING" ;;
            *.mp4|*.webm|*.mov)               emit "$u" media "$slug" >> "$TMP_PENDING" ;;
            *)                                 emit "$u" images "$slug" >> "$TMP_PENDING" ;;
          esac
        done
    # <script src="...">  → URL only, no download.
    perl -ne 'while (m{<script[^>]+src\s*=\s*["'\'']([^"'\'']+)["'\'']}gi) { print "$1\n"; }' "$html" \
      | while IFS= read -r u; do emit "$u" scripts "$slug" >> "$TMP_PENDING"; done
  done
done

# Dedupe by URL, merge referencing_pages.
jq -s '
  group_by(.original_url)
  | map({
      original_url:      .[0].original_url,
      category:          .[0].category,
      referencing_pages: ([.[].referencing_pages[]] | unique),
      viewports:         (.[0].viewports)
    })
' "$TMP_PENDING" > "$WORK_DIR/pending.json"

total=$(jq 'length' "$WORK_DIR/pending.json")
echo "[pending.json: $total unique URLs]"
jq -r 'group_by(.category) | map({(.[0].category): length}) | add | to_entries | map("\(.key)=\(.value)") | join(" ")' \
  "$WORK_DIR/pending.json"
