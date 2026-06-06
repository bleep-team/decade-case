#!/usr/bin/env bash
# download_assets.sh — fetch every unique asset URL recorded in
# <output_dir>/.work/pending.json into the right category folder
# and emit assets/manifest.json.
#
# An asset-enumeration pass (static or Playwright) writes
# <output_dir>/.work/pending.json with objects shaped like:
#   { original_url, category, referencing_pages[], viewports[] }
# Categories: images | fonts | css | media | scripts | api.
#
# We download images/fonts/css/media; scripts go to js-urls.json
# (URL only); api entries are passed through to api.json.
#
# Usage: download_assets.sh <output_dir>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <output_dir>" >&2
  exit 64
fi

OUTPUT_DIR=$1
ASSETS_DIR="${OUTPUT_DIR}/assets"
WORK_DIR="${OUTPUT_DIR}/.work"
PENDING="${WORK_DIR}/pending.json"
MANIFEST="${ASSETS_DIR}/manifest.json"
JS_URLS="${ASSETS_DIR}/js-urls.json"
API_FILE="${ASSETS_DIR}/api.json"

mkdir -p "$WORK_DIR"

if [[ ! -f "$PENDING" ]]; then
  echo "Missing $PENDING — run an asset-enumeration pass first." >&2
  exit 65
fi

mkdir -p "${ASSETS_DIR}/images" "${ASSETS_DIR}/fonts" \
         "${ASSETS_DIR}/css"   "${ASSETS_DIR}/media"

# Sanitise a URL to a safe filename: keep the basename, strip query,
# fall back to a sha1 hash if empty / collides.
safe_name() {
  local url=$1
  local base
  base=$(printf '%s' "$url" | sed -E 's|[?#].*$||' | awk -F/ '{print $NF}')
  if [[ -z "$base" || "$base" == "/" ]]; then
    base="$(printf '%s' "$url" | shasum | awk '{print $1}').bin"
  fi
  # Replace anything non-safe with -.
  printf '%s' "$base" | sed -E 's/[^A-Za-z0-9._-]+/-/g'
}

# Initialise output files.
echo '[]' > "$MANIFEST"
echo '[]' > "$JS_URLS"
echo '[]' > "$API_FILE"

append_manifest() {
  local json=$1
  local tmp
  tmp=$(mktemp)
  jq --argjson item "$json" '. + [$item]' "$MANIFEST" > "$tmp"
  mv "$tmp" "$MANIFEST"
}
append_js() {
  local json=$1
  local tmp
  tmp=$(mktemp)
  jq --argjson item "$json" '. + [$item]' "$JS_URLS" > "$tmp"
  mv "$tmp" "$JS_URLS"
}
append_api() {
  local json=$1
  local tmp
  tmp=$(mktemp)
  jq --argjson item "$json" '. + [$item]' "$API_FILE" > "$tmp"
  mv "$tmp" "$API_FILE"
}

# Iterate the pending list. Each line is one asset spec.
jq -c '.[]' "$PENDING" | while read -r spec; do
  url=$(echo "$spec" | jq -r '.original_url')
  category=$(echo "$spec" | jq -r '.category')

  case "$category" in
    scripts)
      append_js "$spec"
      continue
      ;;
    api)
      append_api "$spec"
      continue
      ;;
    images|fonts|css|media)
      ;;
    *)
      echo "  skipping unknown category $category for $url" >&2
      continue
      ;;
  esac

  fname=$(safe_name "$url")
  rel_path="assets/${category}/${fname}"
  local_path="${OUTPUT_DIR}/${rel_path}"

  # Avoid clobber: if filename collides with a different URL, suffix with hash.
  if [[ -f "$local_path" ]]; then
    suffix=$(printf '%s' "$url" | shasum | awk '{print substr($1, 1, 8)}')
    fname="${suffix}-${fname}"
    rel_path="assets/${category}/${fname}"
    local_path="${OUTPUT_DIR}/${rel_path}"
  fi

  if ! curl -sS --fail-with-body -L --max-time 30 \
      -A "Mozilla/5.0 (compatible; site-cloner/1.0)" \
      "$url" -o "$local_path"; then
    echo "  download failed: $url" >&2
    err_entry=$(echo "$spec" | jq --arg err "download failed" '. + {error: $err}')
    append_manifest "$err_entry"
    continue
  fi

  bytes=$(stat -f%z "$local_path" 2>/dev/null || stat -c%s "$local_path")
  mime=$(file --mime-type -b "$local_path")

  entry=$(echo "$spec" | jq \
    --arg local "$rel_path" \
    --argjson bytes "$bytes" \
    --arg mime "$mime" \
    '. + {local_path: $local, bytes: $bytes, mime: $mime}')
  append_manifest "$entry"
done

# Parse downloaded CSS files for @font-face src URLs and fetch any
# fonts that the network capture missed.
shopt -s nullglob
for css in "${ASSETS_DIR}/css/"*.css; do
  while IFS= read -r font_url; do
    [[ -z "$font_url" ]] && continue
    # Already on disk?
    if jq -e --arg u "$font_url" '.[] | select(.original_url == $u)' \
         "$MANIFEST" > /dev/null; then
      continue
    fi
    fname=$(safe_name "$font_url")
    rel_path="assets/fonts/${fname}"
    local_path="${OUTPUT_DIR}/${rel_path}"
    if [[ -f "$local_path" ]]; then
      suffix=$(printf '%s' "$font_url" | shasum | awk '{print substr($1, 1, 8)}')
      fname="${suffix}-${fname}"
      rel_path="assets/fonts/${fname}"
      local_path="${OUTPUT_DIR}/${rel_path}"
    fi
    if curl -sS --fail-with-body -L --max-time 30 \
         "$font_url" -o "$local_path"; then
      bytes=$(stat -f%z "$local_path" 2>/dev/null || stat -c%s "$local_path")
      mime=$(file --mime-type -b "$local_path")
      entry=$(jq -nc \
        --arg orig "$font_url" \
        --arg local "$rel_path" \
        --arg cat "fonts" \
        --argjson bytes "$bytes" \
        --arg mime "$mime" \
        '{original_url: $orig, local_path: $local, category: $cat,
          bytes: $bytes, mime: $mime,
          referencing_pages: [], viewports: []}')
      append_manifest "$entry"
    fi
  done < <(perl -ne 'while (m{src:\s*url\(([^)]+)\)}gi) {
                       my $u = $1;
                       $u =~ s/^["'\'']|["'\'']$//g;
                       print "$u\n";
                     }' "$css")
done

# Tidy the pending file away.
mv "$PENDING" "${WORK_DIR}/pending-consumed.json"
