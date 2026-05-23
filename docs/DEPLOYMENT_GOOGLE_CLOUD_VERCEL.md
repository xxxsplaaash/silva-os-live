# Silva / Studio Pulse Deployment: Cloud Run Backend + Vercel Frontend

This split keeps the Node/Express API on Google Cloud Run and ships the browser UI as a static Vercel deployment.

## Current Reality Check

- The backend listens on `process.env.PORT`, so it is compatible with Cloud Run.
- The local SQLite default should be treated as demo persistence only on Cloud Run. Cloud Run filesystems are ephemeral; use Cloud SQL/Postgres or another durable store before calling persistence production-grade.
- `aisha-runtime-pack1` is currently a local `node_modules` symlink, not a package-lock dependency. A clean Cloud Run build will not include it until the runtime is published, vendored, or otherwise installed as a real dependency.
- Secrets must be provided through Google Secret Manager or Cloud Run secret env vars. Do not commit keys, print keys, or write them to shell startup files.

## Backend: Cloud Run

Minimum deploy shape:

```bash
PROJECT_ID="your-gcp-project"
REGION="us-central1"
SERVICE="silva-backend"
SILVA_ALLOWED_ORIGINS="https://your-vercel-app.vercel.app"

PROJECT_ID="$PROJECT_ID" \
REGION="$REGION" \
SERVICE="$SERVICE" \
SILVA_ALLOWED_ORIGINS="$SILVA_ALLOWED_ORIGINS" \
scripts/deploy-cloud-run.sh
```

The deploy script intentionally stops if `aisha-runtime-pack1` is not packaged. If you only want to prove the backend shell in degraded Local Room Intelligence mode:

```bash
ALLOW_LOCAL_ROOM_DEPLOY=1 PROJECT_ID="$PROJECT_ID" scripts/deploy-cloud-run.sh
```

Add Gemini/A.I.S.H.A secrets after the service exists:

```bash
gcloud secrets create gemini-api-key --replication-policy="automatic"
printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

Smoke the backend:

```bash
BACKEND_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
curl "$BACKEND_URL/health"
curl "$BACKEND_URL/api/studio/pulse/aisha-status"
```

## Frontend: Vercel

The static bundle is built into `dist/vercel` and receives the Cloud Run API base at build time:

```bash
SILVA_API_BASE_URL="https://your-cloud-run-service.run.app" npm run build:vercel
```

Vercel settings:

- Build command: `npm run build:vercel`
- Output directory: `dist/vercel`
- Environment variable: `SILVA_API_BASE_URL=https://your-cloud-run-service.run.app`

The deployed UI can also be pointed at a backend manually for a one-off smoke:

```text
https://your-vercel-app.vercel.app/?apiBase=https://your-cloud-run-service.run.app
```

## Required Production Follow-Ups

- Package `aisha-runtime-pack1` before claiming A.I.S.H.A connected in Cloud Run.
- Move persistence off ephemeral SQLite before relying on cross-revision or long-lived state.
- Replace temporary `*.vercel.app` origins with the final custom domain in `SILVA_ALLOWED_ORIGINS`.
- Run the Studio Pulse browser feel-pass against the Vercel URL after backend secrets are attached.
