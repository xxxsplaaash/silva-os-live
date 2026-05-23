#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project id.}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-silva-backend}"
MEMORY="${MEMORY:-2Gi}"
CPU="${CPU:-1}"
TIMEOUT="${TIMEOUT:-300}"
ALLOW_LOCAL_ROOM_DEPLOY="${ALLOW_LOCAL_ROOM_DEPLOY:-0}"

cd "$(dirname "$0")/.."

if ! node -e "const lock=require('./package-lock.json'); process.exit(lock.packages && lock.packages['node_modules/aisha-runtime-pack1'] ? 0 : 1)" >/dev/null 2>&1; then
  if [[ "$ALLOW_LOCAL_ROOM_DEPLOY" != "1" ]]; then
    cat >&2 <<'MSG'
Deploy stopped before Cloud Run build:
  aisha-runtime-pack1 is not installed as a package dependency in package-lock.json.

Cloud Run builds from a clean source context, so the local node_modules symlink will not exist there.
Package or publish the runtime first, or rerun with ALLOW_LOCAL_ROOM_DEPLOY=1 if you intentionally want a local-room fallback deploy.
MSG
    exit 1
  fi
  echo "Warning: deploying without packaged aisha-runtime-pack1; A.I.S.H.A will not connect on Cloud Run." >&2
fi

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
ENV_VARS="NODE_ENV=production,AISHA_ENGINE_ENABLED=${AISHA_ENGINE_ENABLED:-true},SILVA_DB_PATH=${SILVA_DB_PATH:-/tmp/silva.db}"

if [[ -n "${SILVA_ALLOWED_ORIGINS:-}" ]]; then
  ENV_VARS="${ENV_VARS},SILVA_ALLOWED_ORIGINS=${SILVA_ALLOWED_ORIGINS}"
fi
if [[ -n "${SOCIAL_DIRECTOR_MODEL:-}" ]]; then
  ENV_VARS="${ENV_VARS},SOCIAL_DIRECTOR_MODEL=${SOCIAL_DIRECTOR_MODEL}"
fi

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
gcloud builds submit --tag "$IMAGE" .
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --timeout "$TIMEOUT" \
  --update-env-vars "$ENV_VARS"
