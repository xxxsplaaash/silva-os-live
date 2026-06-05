#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT_ID="${PROJECT_ID:-project-be35f944-1782-4f27-86f}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-silva-backend}"
AISHA_CLOUD_SQL_INSTANCE="${AISHA_CLOUD_SQL_INSTANCE:-aisha-pack1-postgres}"
AISHA_POSTGRES_DATABASE="${AISHA_POSTGRES_DATABASE:-aisha_pack1}"
AISHA_POSTGRES_USER="${AISHA_POSTGRES_USER:-aisha_pack1_runtime}"
AISHA_POSTGRES_PASSWORD_SECRET="${AISHA_POSTGRES_PASSWORD_SECRET:-aisha-postgres-password}"
AISHA_CLOUD_SQL_CONNECTION_NAME="${AISHA_CLOUD_SQL_CONNECTION_NAME:-${PROJECT_ID}:${REGION}:${AISHA_CLOUD_SQL_INSTANCE}}"
AISHA_CLOUD_SQL_TIER="${AISHA_CLOUD_SQL_TIER:-db-f1-micro}"
AISHA_CLOUD_SQL_STORAGE_GB="${AISHA_CLOUD_SQL_STORAGE_GB:-10}"
AISHA_CLOUD_SQL_VERSION="${AISHA_CLOUD_SQL_VERSION:-POSTGRES_15}"
PROVISION_CLOUD_SQL="${PROVISION_CLOUD_SQL:-1}"
RUN_DEPLOY="${RUN_DEPLOY:-1}"
BACKEND_URL="${BACKEND_URL:-}"

fail() {
  echo "prove-aisha-postgres-rollout: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

secret_exists() {
  gcloud secrets describe "$AISHA_POSTGRES_PASSWORD_SECRET" \
    --project "$PROJECT_ID" >/dev/null 2>&1
}

upsert_password_secret_from_env() {
  if [[ -z "${AISHA_POSTGRES_PASSWORD:-}" ]]; then
    secret_exists || fail "set AISHA_POSTGRES_PASSWORD or create Secret Manager secret ${AISHA_POSTGRES_PASSWORD_SECRET}"
    return
  fi

  local tmp
  tmp="$(mktemp)"
  chmod 600 "$tmp"
  trap 'rm -f "$tmp"' RETURN
  printf '%s' "$AISHA_POSTGRES_PASSWORD" > "$tmp"

  if secret_exists; then
    gcloud secrets versions add "$AISHA_POSTGRES_PASSWORD_SECRET" \
      --project "$PROJECT_ID" \
      --data-file "$tmp" >/dev/null
  else
    gcloud secrets create "$AISHA_POSTGRES_PASSWORD_SECRET" \
      --project "$PROJECT_ID" \
      --data-file "$tmp" \
      --replication-policy automatic >/dev/null
  fi
}

postgres_password_from_secret() {
  gcloud secrets versions access latest \
    --project "$PROJECT_ID" \
    --secret "$AISHA_POSTGRES_PASSWORD_SECRET"
}

ensure_cloud_sql() {
  if [[ "$PROVISION_CLOUD_SQL" != "1" ]]; then
    gcloud sql instances describe "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" >/dev/null
    gcloud sql databases describe "$AISHA_POSTGRES_DATABASE" \
      --instance "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" >/dev/null
    secret_exists || fail "missing Secret Manager secret ${AISHA_POSTGRES_PASSWORD_SECRET}"
    return
  fi

  if ! gcloud sql instances describe "$AISHA_CLOUD_SQL_INSTANCE" \
    --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud sql instances create "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" \
      --region "$REGION" \
      --database-version "$AISHA_CLOUD_SQL_VERSION" \
      --tier "$AISHA_CLOUD_SQL_TIER" \
      --storage-size "$AISHA_CLOUD_SQL_STORAGE_GB" \
      --storage-type SSD \
      --quiet
  fi

  if ! gcloud sql databases describe "$AISHA_POSTGRES_DATABASE" \
    --instance "$AISHA_CLOUD_SQL_INSTANCE" \
    --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud sql databases create "$AISHA_POSTGRES_DATABASE" \
      --instance "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" \
      --quiet
  fi

  local pg_password
  pg_password="$(postgres_password_from_secret)"
  if gcloud sql users list \
    --instance "$AISHA_CLOUD_SQL_INSTANCE" \
    --project "$PROJECT_ID" \
    --format='value(name)' | grep -qx "$AISHA_POSTGRES_USER"; then
    gcloud sql users set-password "$AISHA_POSTGRES_USER" \
      --instance "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" \
      --password "$pg_password" \
      --quiet
  else
    gcloud sql users create "$AISHA_POSTGRES_USER" \
      --instance "$AISHA_CLOUD_SQL_INSTANCE" \
      --project "$PROJECT_ID" \
      --password "$pg_password" \
      --quiet
  fi
}

run_postgres_conformance() {
  [[ -n "${AISHA_TEST_POSTGRES_URL:-}" ]] || fail "AISHA_TEST_POSTGRES_URL is required and must point at the real Postgres test database"
  local out
  out="$(mktemp)"
  trap 'rm -f "$out"' RETURN
  AISHA_TEST_POSTGRES_URL="$AISHA_TEST_POSTGRES_URL" \
    node --test tests/aisha.postgresPersistence.test.js | tee "$out"
  if grep -q '# SKIP' "$out"; then
    fail "Postgres conformance skipped; AISHA_TEST_POSTGRES_URL was not accepted"
  fi
}

assert_live_persistence_status() {
  local status_json showcase_json
  status_json="$(curl -fsS "$BACKEND_URL/api/studio/pulse/aisha-status")"
  showcase_json="$(curl -fsS "$BACKEND_URL/api/studio/pulse-showcase/status?refresh=1")"
  STATUS_JSON="$status_json" SHOWCASE_JSON="$showcase_json" node -e '
    const status = JSON.parse(process.env.STATUS_JSON || "{}");
    const showcase = JSON.parse(process.env.SHOWCASE_JSON || "{}");
    const failures = [];
    const engineMode = status.engineMode || status.aishaEngineMode;
    if (status.activeEngine !== "aisha-runtime-pack1") failures.push(`activeEngine=${status.activeEngine}`);
    if (engineMode !== "production") failures.push(`engineMode=${engineMode}`);
    if (showcase.persistence?.connected !== true) failures.push(`persistence.connected=${showcase.persistence?.connected}`);
    if (failures.length) {
      console.error(`A.I.S.H.A Postgres status proof failed: ${failures.join(", ")}`);
      process.exit(1);
    }
  '
}

need_cmd gcloud
need_cmd curl
need_cmd node
need_cmd npm

[[ "${AISHA_PERSISTENCE:-}" == "postgres" ]] || fail "AISHA_PERSISTENCE must be set to postgres"
[[ -n "$AISHA_CLOUD_SQL_CONNECTION_NAME" ]] || fail "AISHA_CLOUD_SQL_CONNECTION_NAME is required"
[[ -n "$AISHA_POSTGRES_DATABASE" ]] || fail "AISHA_POSTGRES_DATABASE is required"
[[ -n "$AISHA_POSTGRES_USER" ]] || fail "AISHA_POSTGRES_USER is required"

export PROJECT_ID REGION SERVICE
export AISHA_PERSISTENCE=postgres
export AISHA_POSTGRES_DATABASE
export AISHA_POSTGRES_USER
export AISHA_CLOUD_SQL_CONNECTION_NAME
export AISHA_POSTGRES_PASSWORD_SECRET

gcloud config set project "$PROJECT_ID"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  --project "$PROJECT_ID"

upsert_password_secret_from_env
ensure_cloud_sql

npm --prefix packages/aisha-runtime-pack1 run build
npm --prefix packages/aisha-runtime-pack1 run smoke:production
node --test tests/aisha.adapter.test.js
node --test tests/studioPulse.livePath.test.js
node --test tests/frontend.static.test.js
SILVA_API_BASE_URL="${BACKEND_URL:-https://silva-backend-799875816242.us-central1.run.app}" npm run build:vercel
bash -n scripts/deploy-cloud-run.sh scripts/verify-cloud-run-providers.sh
run_postgres_conformance

if [[ "$RUN_DEPLOY" == "1" ]]; then
  ./scripts/deploy-cloud-run.sh
else
  echo "RUN_DEPLOY=0; skipping Cloud Run deploy after successful proof gates."
  exit 0
fi

if [[ -z "$BACKEND_URL" ]]; then
  BACKEND_URL="$(gcloud run services describe "$SERVICE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(status.url)')"
fi
[[ -n "$BACKEND_URL" ]] || fail "could not resolve Cloud Run BACKEND_URL"
export BACKEND_URL

node scripts/smoke-aisha-runtime-cloud-run.mjs
./scripts/verify-cloud-run-providers.sh
assert_live_persistence_status

echo "Pack 1 Postgres rollout proof passed for ${BACKEND_URL}."
