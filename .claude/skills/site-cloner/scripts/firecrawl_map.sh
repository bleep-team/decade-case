#!/usr/bin/env bash
# firecrawl_map.sh — discover every URL on a site via Firecrawl /v2/map.
#
# Usage: firecrawl_map.sh <url>
# Env:   FIRECRAWL_API_KEY must be set.
# Stdout: the JSON response from /v2/map.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <url>" >&2
  exit 64
fi

if [[ -z "${FIRECRAWL_API_KEY:-}" ]]; then
  echo "FIRECRAWL_API_KEY is not set" >&2
  exit 78
fi

URL=$1

curl -sS --fail-with-body \
  -X POST "https://api.firecrawl.dev/v2/map" \
  -H "Authorization: Bearer ${FIRECRAWL_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$(jq -nc --arg url "$URL" '{url: $url, includeSubdomains: false}')"
