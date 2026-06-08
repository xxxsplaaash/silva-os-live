#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-be35f944-1782-4f27-86f}"
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

if [[ ! -f packages/aisha-runtime-pack1/dist/index.js || ! -f packages/aisha-runtime-pack1/dist/index.cjs ]]; then
  if [[ "$ALLOW_LOCAL_ROOM_DEPLOY" != "1" ]]; then
    cat >&2 <<'MSG'
Deploy stopped before Cloud Run build:
  packages/aisha-runtime-pack1/dist is missing required runtime entrypoints.

Run npm --prefix packages/aisha-runtime-pack1 run build, commit the dist files, then deploy again.
MSG
    exit 1
  fi
  echo "Warning: deploying without A.I.S.H.A dist entrypoints; A.I.S.H.A will not connect on Cloud Run." >&2
fi

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
ENV_VARS="NODE_ENV=production,AISHA_ENGINE_ENABLED=${AISHA_ENGINE_ENABLED:-true},SILVA_DB_PATH=${SILVA_DB_PATH:-/tmp/silva.db}"

if [[ -n "${SILVA_ALLOWED_ORIGINS:-}" ]]; then
  ENV_VARS="${ENV_VARS},SILVA_ALLOWED_ORIGINS=${SILVA_ALLOWED_ORIGINS}"
fi
if [[ -n "${SOCIAL_DIRECTOR_MODEL:-}" ]]; then
  ENV_VARS="${ENV_VARS},SOCIAL_DIRECTOR_MODEL=${SOCIAL_DIRECTOR_MODEL}"
fi
for AISHA_ENV_NAME in \
  AISHA_PERSISTENCE \
  AISHA_POSTGRES_DATABASE \
  AISHA_POSTGRES_USER \
  AISHA_CLOUD_SQL_CONNECTION_NAME \
  AISHA_POSTGRES_POOL_MAX \
  AISHA_POSTGRES_PORT; do
  if [[ -n "${!AISHA_ENV_NAME:-}" ]]; then
    ENV_VARS="${ENV_VARS},${AISHA_ENV_NAME}=${!AISHA_ENV_NAME}"
  fi
done
if [[ -n "${AISHA_POSTGRES_URL:-}" ]]; then
  ENV_VARS="${ENV_VARS},AISHA_POSTGRES_URL=${AISHA_POSTGRES_URL}"
fi

CLOUD_SQL_ARGS=()
if [[ -n "${AISHA_CLOUD_SQL_CONNECTION_NAME:-}" ]]; then
  CLOUD_SQL_ARGS+=(--add-cloudsql-instances "$AISHA_CLOUD_SQL_CONNECTION_NAME")
fi

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com

SECRET_ARGS=()
if [[ "${AISHA_PERSISTENCE:-}" == "postgres" ]]; then
  AISHA_POSTGRES_PASSWORD_SECRET="${AISHA_POSTGRES_PASSWORD_SECRET:-aisha-postgres-password}"
  if ! gcloud secrets describe "$AISHA_POSTGRES_PASSWORD_SECRET" --project "$PROJECT_ID" >/dev/null 2>&1; then
    cat >&2 <<MSG
Deploy stopped before Cloud Run update:
  AISHA_PERSISTENCE=postgres requires Secret Manager secret "$AISHA_POSTGRES_PASSWORD_SECRET".

Create it first, or set AISHA_POSTGRES_PASSWORD_SECRET to an existing secret name.
MSG
    exit 1
  fi
  SECRET_ARGS+=(--update-secrets "AISHA_POSTGRES_PASSWORD=${AISHA_POSTGRES_PASSWORD_SECRET}:latest")
fi

gcloud builds submit --tag "$IMAGE" .

DEPLOY_ARGS=(
  "$SERVICE"
  --image "$IMAGE"
  --region "$REGION"
  --platform managed
  --allow-unauthenticated
  --memory "$MEMORY"
  --cpu "$CPU"
  --timeout "$TIMEOUT"
  --update-env-vars "$ENV_VARS"
)
if ((${#SECRET_ARGS[@]})); then
  DEPLOY_ARGS+=("${SECRET_ARGS[@]}")
fi
if ((${#CLOUD_SQL_ARGS[@]})); then
  DEPLOY_ARGS+=("${CLOUD_SQL_ARGS[@]}")
fi

gcloud run deploy "${DEPLOY_ARGS[@]}"
