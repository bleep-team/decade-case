#!/usr/bin/env bash
# render_templates.sh — render the dossier-root markdown artefacts from
# the skill's assets/*.tmpl templates.
#
# Produces:
#   <output_dir>/AGENT_GUIDE.md
#   <output_dir>/observations.md
#   <output_dir>/rebuild-plan.md   (only the matching --target-stack block)
#
# Variables substituted in templates: {{site_name}}, {{source_url}},
# {{capture_date}}, {{target_stack}}, {{page_count}}, {{asset_count}}.
#
# Usage:
#   render_templates.sh <output_dir>
# Reads from <output_dir>/meta/capture.json for variable values.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <output_dir>" >&2
  exit 64
fi

OUT=$1
CAPTURE="${OUT}/meta/capture.json"
if [[ ! -f "$CAPTURE" ]]; then
  echo "Missing $CAPTURE — run init_capture.sh first." >&2
  exit 65
fi

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
ASSETS_DIR="${SKILL_DIR}/assets"

# Pull values from capture.json. Compute counts from disk so they reflect
# the actual on-disk state, not whatever was seeded at init time.
SITE=$(jq -r '.site_name'    "$CAPTURE")
URL=$(jq -r '.source_url'    "$CAPTURE")
DATE=$(jq -r '.capture_date' "$CAPTURE")
STACK=$(jq -r '.target_stack // "nextjs-tailwind-shadcn"' "$CAPTURE")

PAGES=$(find "$OUT/pages" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
ASSETS=0
if [[ -f "$OUT/assets/manifest.json" ]]; then
  ASSETS=$(jq 'length' "$OUT/assets/manifest.json")
fi

# Write counts back to capture.json so the rest of the dossier matches.
TMP=$(mktemp)
jq --argjson pages "$PAGES" --argjson assets "$ASSETS" \
   --arg end "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.page_count = $pages | .asset_count = $assets | .end_date = $end' \
   "$CAPTURE" > "$TMP"
mv "$TMP" "$CAPTURE"

# Simple substitution renderer for AGENT_GUIDE + observations.
# Templates contain {{var}} markers — replace with capture.json values.
subst() {
  sed \
    -e "s|{{site_name}}|$SITE|g" \
    -e "s|{{source_url}}|$URL|g" \
    -e "s|{{capture_date}}|$DATE|g" \
    -e "s|{{target_stack}}|$STACK|g" \
    -e "s|{{page_count}}|$PAGES|g" \
    -e "s|{{asset_count}}|$ASSETS|g" \
    "$1"
}

subst "${ASSETS_DIR}/agent_guide.md.tmpl"   > "$OUT/AGENT_GUIDE.md"
subst "${ASSETS_DIR}/observations.md.tmpl"  > "$OUT/observations.md"

# rebuild-plan.md needs stack-conditional block handling.
# Templates use {{#stack:name}} … {{/stack}} fences; we keep only the block
# whose name matches $STACK.
perl -e '
  use strict; use warnings;
  my ($stack, $site) = @ARGV;
  my $in_blk = 0; my $keep = 0;
  while (<STDIN>) {
    if (/\{\{#stack:([a-z0-9-]+)\}\}/) {
      $in_blk = 1;
      $keep   = ($1 eq $stack);
      next;
    }
    if (/\{\{\/stack\}\}/) { $in_blk = 0; $keep = 0; next; }
    if ($in_blk) { print if $keep; next; }
    s/\{\{site_name\}\}/$site/g;
    s/\{\{target_stack\}\}/$stack/g;
    print;
  }
' "$STACK" "$SITE" \
  < "${ASSETS_DIR}/rebuild_plan.md.tmpl" \
  > "$OUT/rebuild-plan.md"

echo "Rendered AGENT_GUIDE.md, observations.md, rebuild-plan.md" >&2
echo "  site_name=$SITE  target_stack=$STACK  pages=$PAGES  assets=$ASSETS" >&2
