# A.I.S.H.A Studio Pulse Host Adapter — Integration Guide

**Status**: Implemented (fixture path). Production path blocked by missing `GEMINI_API_KEY`.
**Package**: `aisha-runtime-pack1`
**Branch**: `pack8-1-external-judge-demo-handoff`

---

## Current Status

| Component | Status |
|-----------|--------|
| `src/host/studioPulseContract.ts` | ✅ Complete — full TypeScript contract |
| `src/host/aishaHostAdapter.ts` | ✅ Complete — wraps `processTurn()` |
| `src/host/index.ts` | ✅ Complete — public exports |
| `src/host/aishaHostAdapterFixtures.ts` | ✅ Complete — 9 deterministic tests |
| `package.json` | ✅ Added — `typecheck`, `test:fixtures`, `test:host`, `test:all`, `check` |
| Production Gemini path | ❌ Blocked — `GEMINI_API_KEY` required; returns `engineMode: "unavailable"` |
| HTTP service endpoint | ❌ Not implemented — local function call only |
| Session persistence | ❌ Not implemented — all stores are in-memory per process |

---

## How Studio Pulse Should Call A.I.S.H.A Later

### Step 1: Import the contract (now)

```typescript
// In Studio Pulse / Codex
import type {
  AishaStudioPulseRequest,
  AishaStudioPulseResponse,
} from "aisha-runtime-pack1";
```

### Step 2: Build a mock adapter (now)

```typescript
// lib/aisha/aishaAdapter.ts — mock for local Studio Pulse dev
import type { AishaStudioPulseRequest, AishaStudioPulseResponse } from "aisha-runtime-pack1";

export async function callAishaEngine(
  request: AishaStudioPulseRequest,
): Promise<AishaStudioPulseResponse> {
  // TODO: replace with real call when engine is available
  return {
    ok: false,
    responses: [{ content: "[Mock A.I.S.H.A response]" }],
    memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
    stateEnvelope: { certainty: 0, load: 0, tension: 0, valence: 0, desire: 0, trust: 0 },
    relationshipDeltas: [],
    trace: { traceId: "mock", sessionId: request.sessionId, status: "succeeded", events: [] },
    engineMode: "mock",
    aishaEngineConnected: false,
    confidence: 0,
  };
}
```

### Step 3: Wire the real adapter (when GEMINI_API_KEY is present)

```typescript
// Replace the mock with a direct function call (local package link) OR
// an HTTP POST to the A.I.S.H.A service when it is deployed.
import { processAishaRequest } from "aisha-runtime-pack1";
import { buildProductionRuntime } from "aisha-runtime-pack1/internal"; // not yet exported

const result = await processAishaRequest(request, { deps, engineMode: "production" });
```

---

## What Is Real Now

- `AishaStudioPulseRequest` / `AishaStudioPulseResponse` — real, final TypeScript types.
- `processAishaRequest()` — real function call, wraps `processTurn()` end-to-end.
- Fixture path (in-memory generator, no Gemini) — fully operational.
- `engineMode`, `aishaEngineConnected` — always honest. Never faked.
- Trace events — real trace from `processTurn()` internal instrumentation.
- Fallback path — if `processTurn()` returns `ok: false`, adapter preserves it correctly.
- Unavailable path — if `deps` are absent, returns `engineMode: "unavailable"` with zero confusion.

---

## What Is Fixture-Only

- The **generator** in tests uses `InMemoryGeneratorAdapter` — returns stub text, not Gemini output.
- The **note versioning** in tests uses `FixtureNoteVersioning` — no real extraction logic.
- `memorySummary.activeTruths` will be empty in fixture mode because no real notes are extracted.

---

## What Is Missing

| Missing Component | Blocking What |
|-------------------|--------------|
| `GEMINI_API_KEY` in environment | Production generator path |
| `package.json` `exports` resolution for `tsx` | `npm run check` resolves via tsx directly, not node resolution |
| HTTP transport layer | Remote Studio Pulse → A.I.S.H.A calls |
| Session persistence (disk/DB store) | Memory continuity across process restarts |
| Real `noteVersioning` wired into `buildProductionRuntime` | `memorySummary.activeTruths` population in production |

---

## What Codex Must NOT Duplicate

| Component | Why |
|-----------|-----|
| Note store / truth store | A.I.S.H.A's `INoteVersioning` is the single source of truth |
| Contradiction detection | Handled internally by `processTurn()` + `retrievalPlanner` |
| Episode boundary logic | `DeterministicEpisodeBoundaryDetector` owns this |
| State snapshot tracking | `StateSnapshotRecord` is A.I.S.H.A's, not Studio Pulse's |
| `engineMode` or `aishaEngineConnected` values | Must come from the adapter response, not hardcoded |

---

## Exact Commands to Test

```bash
# Install dependencies (first time)
npm install

# Type check
npm run typecheck

# Run core fixture tests (in-memory, no Gemini)
npm run test:fixtures

# Run host adapter tests
npm run test:host

# Run everything
npm run test:all

# Full check (typecheck + all tests)
npm run check

# Direct npx commands still work:
npx tsx src/eval/runDefaultFixtures.ts
npx tsx src/eval/runIntegrationFixtures.ts
npx tsx src/host/aishaHostAdapterFixtures.ts
```
