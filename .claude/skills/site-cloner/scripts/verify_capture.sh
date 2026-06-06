#!/usr/bin/env bash
# verify_capture.sh — enforce the quality bar from references/quality_bar.md.
#
# Exits 0 only if every gate passes. On failure, writes
# <output_dir>/CAPTURE-INCOMPLETE.md and exits non-zero.
#
# Usage: verify_capture.sh <output_dir>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <output_dir>" >&2
  exit 64
fi

OUTPUT_DIR=$1
FAILURES_FILE=$(mktemp)
trap 'rm -f "$FAILURES_FILE"' EXIT

fail() {
  echo "- $*" >> "$FAILURES_FILE"
}

require_file() {
  local rel=$1
  [[ -f "${OUTPUT_DIR}/${rel}" ]] || fail "missing required file: $rel"
}

require_file "INDEX.json"
require_file "AGENT_GUIDE.md"
require_file "design-tokens.json"
require_file "meta/capture.json"
require_file "meta/urls.txt"
require_file "assets/manifest.json"

# Gate 7: agent entry points reference the key files.
if [[ -f "${OUTPUT_DIR}/AGENT_GUIDE.md" ]]; then
  for needle in "INDEX.json" "design-tokens.json" "rebuild-plan.md"; do
    if ! grep -q "$needle" "${OUTPUT_DIR}/AGENT_GUIDE.md"; then
      fail "AGENT_GUIDE.md does not mention $needle"
    fi
  done
fi

# Gate 8: every markdown twin has the non-authoritative banner.
banner_required=(
  "AGENT_GUIDE.md"
  "design-tokens.md"
  "rebuild-plan.md"
)
for f in "${banner_required[@]}"; do
  full="${OUTPUT_DIR}/${f}"
  [[ -f "$full" ]] || continue
  head -n 5 "$full" | grep -q "Non-authoritative" || fail "missing non-authoritative banner: $f"
done
# Per-page summary.md banner.
if [[ -d "${OUTPUT_DIR}/pages" ]]; then
  while IFS= read -r -d '' s; do
    head -n 5 "$s" | grep -q "Non-authoritative" || fail "missing non-authoritative banner: ${s#${OUTPUT_DIR}/}"
  done < <(find "${OUTPUT_DIR}/pages" -maxdepth 3 -name summary.md -print0)
fi

# Gate 6: design-token completeness.
if [[ -f "${OUTPUT_DIR}/design-tokens.json" ]]; then
  palette_count=$(jq '.palette | length' "${OUTPUT_DIR}/design-tokens.json" 2>/dev/null || echo 0)
  typography_count=$(jq '.typography | length' "${OUTPUT_DIR}/design-tokens.json" 2>/dev/null || echo 0)
  breakpoint_count=$(jq '.breakpoints | length' "${OUTPUT_DIR}/design-tokens.json" 2>/dev/null || echo 0)
  (( palette_count >= 5 )) || fail "design-tokens.json palette has < 5 entries ($palette_count)"
  (( typography_count >= 1 )) || fail "design-tokens.json typography has 0 entries"
  (( breakpoint_count >= 1 )) || fail "design-tokens.json breakpoints has 0 entries"
fi

# Gate 3: every URL has a matching page.json with the expected files.
if [[ -f "${OUTPUT_DIR}/meta/urls.txt" && -f "${OUTPUT_DIR}/meta/capture.json" ]]; then
  viewports=()
  while IFS= read -r vp; do
    [[ -n "$vp" ]] && viewports+=("$vp")
  done < <(jq -r '.viewports[]?' "${OUTPUT_DIR}/meta/capture.json")
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    slug=$(printf '%s' "$url" \
      | awk -F/ '{ for (i=4; i<=NF; i++) printf "%s%s", (i>4 ? "_" : ""), $i }')
    [[ -z "$slug" || "$slug" == "_" ]] && slug="home"
    slug=$(printf '%s' "$slug" \
      | tr '[:upper:]' '[:lower:]' \
      | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/_+/_/g; s/^[-_]+//; s/[-_]+$//')
    page_dir="${OUTPUT_DIR}/pages/${slug}"
    [[ -d "$page_dir" ]] || { fail "missing pages/$slug for url $url"; continue; }
    for f in page.json sections.json dom.html raw.html copy.md \
             links.json images.json; do
      [[ -f "${page_dir}/${f}" ]] || fail "missing pages/${slug}/${f}"
    done
    for vp in "${viewports[@]}"; do
      [[ -f "${page_dir}/${vp}.png" ]] || fail "missing pages/${slug}/${vp}.png"
    done
  done < "${OUTPUT_DIR}/meta/urls.txt"
fi

# Gate 4: every section in every sections.json has its crops + non-empty ranges.
if [[ -d "${OUTPUT_DIR}/pages" ]]; then
  while IFS= read -r -d '' sj; do
    page_dir=$(dirname "$sj")
    page_dom="${page_dir}/dom.html"
    page_copy="${page_dir}/copy.md"
    # All screenshot crop paths must exist relative to the page dir.
    while IFS= read -r crop_rel; do
      [[ -z "$crop_rel" ]] && continue
      [[ -f "${page_dir}/${crop_rel}" ]] || fail "missing section crop ${page_dir#${OUTPUT_DIR}/}/${crop_rel}"
    done < <(jq -r '.[].screenshot_crops[]?' "$sj" 2>/dev/null)
    # Byte ranges must yield non-empty slices.
    while IFS= read -r range; do
      [[ -z "$range" ]] && continue
      from=$(echo "$range" | cut -d, -f1)
      to=$(echo "$range" | cut -d, -f2)
      len=$(( to - from ))
      (( len > 0 )) || fail "empty byte range in $sj: [$from,$to]"
    done < <(jq -r '.[].dom_html_byte_range | "\(.[0]),\(.[1])"' "$sj" 2>/dev/null)
  done < <(find "${OUTPUT_DIR}/pages" -maxdepth 3 -name sections.json -print0)
fi

# Gate 5: every asset entry without an "error" has its file with matching size.
if [[ -f "${OUTPUT_DIR}/assets/manifest.json" ]]; then
  jq -c '.[]' "${OUTPUT_DIR}/assets/manifest.json" | while read -r entry; do
    has_err=$(echo "$entry" | jq -r '.error // empty')
    [[ -n "$has_err" ]] && continue
    local_path=$(echo "$entry" | jq -r '.local_path // empty')
    bytes=$(echo "$entry" | jq -r '.bytes // empty')
    [[ -z "$local_path" ]] && { fail "asset entry without local_path: $entry"; continue; }
    full="${OUTPUT_DIR}/${local_path}"
    [[ -f "$full" ]] || { fail "asset missing on disk: $local_path"; continue; }
    if [[ -n "$bytes" ]]; then
      actual=$(stat -f%z "$full" 2>/dev/null || stat -c%s "$full")
      [[ "$actual" == "$bytes" ]] || fail "asset size mismatch ($local_path): manifest=$bytes actual=$actual"
    fi
  done
fi

# Gate 1: JSON validity. Quick parse on every .json file in the dossier
# (excluding transient runtime files under .work/).
while IFS= read -r -d '' jf; do
  rel="${jf#${OUTPUT_DIR}/}"
  case "$rel" in
    .work/*) continue ;;
  esac
  jq empty "$jf" 2>/dev/null || fail "invalid JSON: $rel"
done < <(find "${OUTPUT_DIR}" -type f -name '*.json' -print0)

# Emit report.
if [[ -s "$FAILURES_FILE" ]]; then
  {
    echo "# Capture incomplete"
    echo
    echo "The following quality gates failed. Fix or re-capture before"
    echo "handing this dossier to a consuming agent."
    echo
    cat "$FAILURES_FILE"
  } > "${OUTPUT_DIR}/CAPTURE-INCOMPLETE.md"
  echo "Verification FAILED. See ${OUTPUT_DIR}/CAPTURE-INCOMPLETE.md" >&2
  exit 1
fi

# Clear any stale incomplete report from a previous run.
rm -f "${OUTPUT_DIR}/CAPTURE-INCOMPLETE.md"
echo "Verification PASSED for ${OUTPUT_DIR}" >&2
