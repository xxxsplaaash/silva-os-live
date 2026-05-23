# Silva / Studio Pulse Deployment: Cloud Run Backend + Vercel Frontend

This split keeps the Node/Express API on Google Cloud Run and ships the browser UI as a static Vercel deployment.

## Current Reality Check

- The backend listens on `process.env.PORT`, so it is compatible with Cloud Run.
- Local SQLite is demo persistence only on Cloud Run. Cloud Run filesystems are ephemeral, so use Cloud SQL/Postgres or another durable store before relying on cross-revision persistence.
- `aisha-runtime-pack1` is vendored as a local file dependency and must ship with `packages/aisha-runtime-pack1/dist`.
- Secrets must be provided through Google Secret Manager or Cloud Run secret env vars. Do not commit keys, print keys, or write them to shell startup files.

## Backend: Cloud Run

Deploy the backend:

```bash
PROJECT_ID="project-be35f944-1782-4f27-86f" \
REGION="us-central1" \
SERVICE="silva-backend" \
SILVA_ALLOWED_ORIGINS="https://silva-os-live.vercel.app" \
AISHA_ENGINE_ENABLED=true \
scripts/deploy-cloud-run.sh
```

The deploy script stops if the A.I.S.H.A runtime package is not present in `package-lock.json` or if `packages/aisha-runtime-pack1/dist` is missing. If you intentionally want to deploy only the degraded local-room fallback, set `ALLOW_LOCAL_ROOM_DEPLOY=1`.

Attach Gemini/A.I.S.H.A secrets through Cloud Run secret env vars. Example shape:

```bash
gcloud run services update silva-backend \
  --region us-central1 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

## A.I.S.H.A Runtime Verification

Before deploying, prove a clean source package can import the runtime:

```bash
tmp="$(mktemp -d)"
git archive HEAD | tar -x -C "$tmp"
cd "$tmp"
npm ci --omit=dev
NODE_ENV=production AISHA_ENGINE_ENABLED=true node -e "import('aisha-runtime-pack1').then(m => console.log(typeof m.processAishaRequest))"
```

After deploying, verify Cloud Run:

```bash
BACKEND_URL="https://silva-backend-799875816242.us-central1.run.app"

curl -fsS "$BACKEND_URL/health"
curl -fsS "$BACKEND_URL/api/studio/pulse/aisha-status"
BACKEND_URL="$BACKEND_URL" node scripts/smoke-aisha-runtime-cloud-run.mjs
```

Success means `/api/studio/pulse/aisha-status` reports `aishaEngineConnected: true` and `activeEngine: "aisha-runtime-pack1"`. If it still reports `fallbackReason: "aisha-runtime-unavailable"`, Cloud Run did not load the vendored runtime package.

## Frontend: Vercel

Build the static frontend with the Cloud Run API base:

```bash
SILVA_API_BASE_URL="https://silva-backend-799875816242.us-central1.run.app" npm run build:vercel
```

Vercel settings:

- Build command: `npm run build:vercel`
- Output directory: `dist/vercel`
- Environment variable: `SILVA_API_BASE_URL=https://silva-backend-799875816242.us-central1.run.app`

The deployed UI can also be pointed at a backend manually for a one-off smoke:

```text
https://silva-os-live.vercel.app/?apiBase=https://silva-backend-799875816242.us-central1.run.app
```

## Required Production Follow-Ups

- Keep `packages/aisha-runtime-pack1/dist` committed whenever the runtime package source changes.
- Move persistence off ephemeral SQLite before relying on cross-revision or long-lived Studio Pulse state.
- Replace temporary Vercel origins with the final custom domain in `SILVA_ALLOWED_ORIGINS`.
- Run the Studio Pulse browser feel-pass against the Vercel URL after backend secrets are attached.
