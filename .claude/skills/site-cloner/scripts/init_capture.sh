#!/usr/bin/env bash
# init_capture.sh — seed <output_dir>/meta/capture.json from invocation args.
#
# Usage:
#   init_capture.sh <output_dir> <site_name> <source_url> <target_stack> <viewports_csv>
#
# Example:
#   init_capture.sh docs/references/site/grovia-framer-ai \
#                   grovia-framer-ai \
#                   https://grovia.framer.ai \
#                   nextjs-tailwind-shadcn \
#                   desktop,mobile
set -euo pipefail

if [[ $# -ne 5 ]]; then
  echo "Usage: $(basename "$0") <output_dir> <site_name> <source_url> <target_stack> <viewports_csv>" >&2
  exit 64
fi

OUT=$1
SITE=$2
URL=$3
STACK=$4
VIEWPORTS_CSV=$5

mkdir -p "$OUT/meta" "$OUT/pages" \
         "$OUT/assets/images" "$OUT/assets/fonts" \
         "$OUT/assets/css"    "$OUT/assets/media" \
         "$OUT/.work"

# Split CSV into a JSON array.
VIEWPORTS_JSON=$(printf '%s' "$VIEWPORTS_CSV" \
  | tr ',' '\n' \
  | jq -R . | jq -s 'map(select(length > 0))')

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
IP_NOTICE="This dossier captures publicly available content from ${URL} for the sole purpose of internal design reference. Captured assets are not redistributed and are not re-used in shipped product code."

# Cost estimate: 1 Firecrawl /v2/crawl call for content, plus one per
# viewport for screenshots. Recorded for billing audit.
VIEWPORT_COUNT=$(printf '%s' "$VIEWPORTS_JSON" | jq 'length')
CRAWL_COUNT=$((1 + VIEWPORT_COUNT))

jq -n \
  --arg site_name    "$SITE" \
  --arg source_url   "$URL" \
  --arg capture_date "$NOW" \
  --arg target_stack "$STACK" \
  --argjson viewports "$VIEWPORTS_JSON" \
  --argjson crawl_count "$CRAWL_COUNT" \
  --arg ip_notice    "$IP_NOTICE" \
  '{
    site_name:      $site_name,
    source_url:     $source_url,
    capture_date:   $capture_date,
    viewports:      $viewports,
    target_stack:   $target_stack,
    crawls:         {},
    cost_estimate:  {
      firecrawl_crawl_calls: $crawl_count,
      notes: "1 content crawl + one screenshot crawl per viewport. Actual page count populated post-run as page_count."
    },
    ip_notice:      $ip_notice
  }' > "$OUT/meta/capture.json"

echo "Seeded $OUT/meta/capture.json (viewports: $VIEWPORTS_CSV, target_stack: $STACK)" >&2
