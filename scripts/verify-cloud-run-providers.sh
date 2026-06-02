#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-be35f944-1782-4f27-86f}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-silva-backend}"

if ! command -v curl >/dev/null 2>&1; then
  echo "Missing required command: curl" >&2
  exit 1
fi

if [[ -z "${BACKEND_URL:-}" ]] && ! command -v gcloud >/dev/null 2>&1; then
  echo "Missing required command: gcloud, or set BACKEND_URL explicitly." >&2
  exit 1
fi

BACKEND_URL="${BACKEND_URL:-$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')}"
if [[ -z "$BACKEND_URL" ]]; then
  echo "Could not resolve Cloud Run URL for ${SERVICE}." >&2
  exit 1
fi

echo "Backend: $BACKEND_URL"

echo
echo "== /health =="
curl -fsS "$BACKEND_URL/health"

echo
echo
echo "== /api/provider-credentials/status =="
curl -fsS "$BACKEND_URL/api/provider-credentials/status"

echo
echo
echo "== /api/studio/pulse/aisha-status =="
curl -fsS "$BACKEND_URL/api/studio/pulse/aisha-status"

echo
echo
echo "== /api/image-models/route-preview =="
curl -fsS -X POST "$BACKEND_URL/api/image-models/route-preview" \
  -H 'Content-Type: application/json' \
  -d '{"modelId":"google/nano-banana-2","prompt":"provider readiness smoke","referenceCount":0}'

echo
