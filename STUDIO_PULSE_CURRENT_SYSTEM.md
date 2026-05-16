# Studio Pulse Current System

## Purpose

This document freezes the current Studio Pulse system as a reference baseline before the living-room engine rebuild.

It is not the future architecture.
It is the map of what exists today, what still works, and what should be preserved or retired during the rebuild.

## Room Intelligence v0.1 Provider-Hardened Baseline

Freeze status: `studio-pulse-room-intelligence-v0.1-provider-hardened`.

This baseline records the current Studio Pulse Room Intelligence host layer only. It does not claim that Project A.I.S.H.A is connected, and it must not be used as proof of a full A.I.S.H.A continuity or memory engine.

Canonical runtime metadata:

- `engineMode: local-room-intelligence`
- `aishaEngineConnected: false`
- Real A.I.S.H.A is not connected in this repo.
- Studio Pulse currently runs a local bridge/host surface for future A.I.S.H.A integration.

Current provider modes:

- `deterministic-fallback` — deterministic local room response; no provider call required.
- `provider-accepted` — provider output passed Room Intelligence validation.
- `provider-rejected-fallback` — provider output was rejected and replaced with the planned speaker's natural fallback.
- `provider-unavailable-fallback` — provider call failed or timed out and the planned speaker's natural fallback was used.

Current provider validation behavior:

- Provider text is accepted only after speaker identity, user-topic relevance, generic assistant tone, internal metadata leakage, unauthorized group voice, unavailable room facts, and non-meta architecture-language checks pass.
- Non-meta room chat must not leak phrases such as architecture, implementation, selection, validation, generation, presence system, room intelligence, assistant cosplay, or generic AI-assistant copy.
- Meta/system-design prompts may discuss why the room feels fake or how Studio Pulse behaves, but only when perception explicitly gates the turn as meta.

Current UI rule:

- Visible chips stay humanized, such as `Present`, `Quiet`, `Away`, `Warm`, `Sharp`, `Focused`, `Guarded`, `Playful`, `Diagnostic`, `Listening`, `Leaning in`, and `Holding back`.
- Raw technical tags, provider modes, validation fallback reasons, and trace details remain metadata only.

Latest recorded verification:

- `node --check routes/studio.js studio_pulse_v400.js` — passing.
- `node --check lib/studio/roomIntelligence/adapter.js` — passing.
- `node --check lib/studio/council.js` — passing.
- `node --test tests/studioPulse.roomIntelligence.test.js` — `11/11` passing.
- `node --test tests/studioPulse.livePath.test.js` — `12/12` passing.
- `node --test tests/frontend.static.test.js` — `24/24` passing.
- `npm test` — `115/115` passing.
- `npm run test:a11y` — `9/9` passing.

Known limitation:

- This is not production-ready A.I.S.H.A. It is a Studio Pulse-local Room Intelligence v0.1 bridge with deterministic perception/planning, natural fallback, provider validation, and metadata discipline.
- Do not add fake A.I.S.H.A adapter logic to satisfy integration language. The next real A.I.S.H.A step must connect an actual external engine, adapter, service, or import boundary.

## Live Owner Path

The live runtime path is:

```text
server.js
  -> repo-root index.html
    -> studio_pulse_v400.js
      -> POST /api/studio/pulse
        -> routes/studio.js
          -> roomRuntime / prompt / workflow / fallback / history / sqlite
```

Important truth:

- The root legacy shell is still the live shell.
- `studio_pulse_v400.js` is the live Pulse frontend owner.
- `routes/studio.js` is the current backend orchestration gate.
- The current system is a mixed architecture, not one clean engine.

## Current Frontend Owner

Primary file:

- `studio_pulse_v400.js`

Current responsibilities:

- Pulse page rendering
- thread state
- local Pulse persistence
- archive/history display
- composer draft state
- reply targeting
- spark scheduling
- attachment state
- workflow state
- commit card display state
- provider settings surface
- tuning UI
- bridge into global shell `STATE`

Current local Pulse state store:

- `silva_studio_pulse_v4012_rebuild`

This was intentionally bumped for the rebuild start so the visible Pulse room resets cleanly without deleting backend thread history.

Provider settings remain in:

- `silva_provider_shell_v12`
- `silva_provider_shell_v12_backup`

## Current Backend Owner

Primary file:

- `routes/studio.js`

Current responsibilities are too broad:

- request normalization
- thread hydration
- history loading
- workflow inference
- workflow staging
- commit handling
- direct-address handling
- diagnostic routing
- provider prompt creation
- provider calling
- repair logic
- fallback routing
- spark routing
- runtime capture
- persistence
- response normalization

This file is the current behavior choke point and must be broken into cleaner subsystems during the rebuild.

## Active Subsystems

### Room Runtime

Primary file:

- `lib/studio/roomRuntime.js`

Current strengths:

- direct-address detection
- speaker scoring
- holding/autonomy concepts
- runtime/personhood vocabulary
- spark planning concepts

Current weakness:

- its decisions are often overridden by route policy, workflow policy, or fallback policy

### Prompt Layer

Primary file:

- `lib/studio/prompt.js`

Current strengths:

- per-speaker prompt path exists
- lighter room prompting is possible

Current weakness:

- legacy council/report assumptions still exist beside living-room intentions

### Fallback Layer

Primary file:

- `lib/studio/fallback.js`

Current strengths:

- outage resilience
- deterministic rescue
- quick intent scaffolding

Current weakness:

- it grew into a second room writer
- it still shapes too much live behavior

### Workflow Layer

Primary file:

- `lib/studio/pulseWorkflow.js`

Current strengths:

- draft/attachment/commit infrastructure exists
- analysis vs committable workflow separation has started

Current weakness:

- workflow semantics still sit too close to ordinary room chat

### Persistence Layer

Primary files:

- `lib/studio/history.js`
- `db/sqlite.js`
- `routes/state.js`

Current strengths:

- thread and message storage already exist
- assets/workflows already exist
- runtime snapshots already exist

Current weakness:

- memory is scattered across thread payloads, runtime overlay, local state, and support tables

## Current Character Definition Drift

Character identity currently exists across multiple places:

- `lib/studio/systemContext.js`
- `lib/studio/roomRuntime.js`
- `lib/studio/council.js`
- `lib/studio/voiceLibrary.js`
- `lib/studio/fallback.js`
- `studio_pulse_v400.js`

This is one of the biggest architectural defects.

The rebuild must replace this with one canonical character source.

## Current Tuning Reference Snapshot

Current frontend tuning defaults live in:

- `studio_pulse_v400.js`

Current default posture summary:

- Aisha: high assertiveness, high directness, high strictness, final-call bias
- Leah: high creative risk, high directness, taste/editor posture
- Claudia: high detail, high strictness, operations and accountability posture
- Grok: highest detail/directness, technical/diagnostic posture
- Vanya: highest warmth/playfulness, social/standards posture

This is useful as a reference, but it is not a stable character system.

The rebuild should preserve the insight while moving character truth into the backend.

## Current Product/Behavior Failures

Observed recurring failures:

- repetition without durable memory consequence
- characters sounding like response routing
- fallback writing the room too often
- workflow state contaminating normal chat
- sparks behaving like nudges or reminders
- Aisha still acting like hidden product owner
- direct address and speaker selection being overridden too often
- frontend carrying too much system/debug/workflow weight inside the room surface

## What To Preserve

- live shell
- page structure
- thread/message UI
- composer base surface
- attachment plumbing
- archive/history plumbing
- provider adapter if still useful
- SQLite thread/message/workflow persistence

## What To Demote or Retire

- council framing
- fallback as personality engine
- multi-source character truth
- sticky workflow inference
- automatic multi-speaker stuffing
- Aisha as structural chair/default closer
- room initiative triggered by workflow existence

## Rebuild Rule

The rebuild should happen in parallel under `lib/studio2/`.

The old system is a reference map.
It is not the engine we keep extending.
