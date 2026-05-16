# Studio Pulse Rebuild Plan

## Goal

Rebuild Studio Pulse as a living-room engine inside the existing legacy shell.

Do not replace the shell.
Do not preserve the current mixed behavior architecture.

## Product Truth

Studio Pulse is a room first.

- workflow is a lane
- diagnostics are a lane
- spark is initiative
- fallback is failure handling
- Aisha is a character, not the operating system

## Keep

- root shell
- page layout
- thread UI
- composer visual system
- existing persistence primitives
- provider wiring where reusable

## Replace

- room behavior engine
- character truth model
- turn-routing logic
- memory model
- spark model
- workflow-chat coupling
- fallback dominance

## Build Location

New parallel engine:

```text
lib/studio2/
```

Feature flag:

```js
const USE_STUDIO2 = process.env.STUDIO2_ENGINE === '1';
```

## Phase Order

### Phase 0: Freeze and Reset

- document current system
- preserve current backend as reference
- reset visible/local Pulse state
- keep stored backend history as backup

### Phase 1: Canonical Character System

Build one backend truth source for:

- identity
- desire
- wound
- triggers
- memory stance
- relationship stance
- interruption rules
- disagreement rules

### Phase 2: Turn Planning Core

Build one canonical turn planner that resolves every turn into exactly one lane:

- `room`
- `direct`
- `diagnostic`
- `workflow`
- `commit`
- `spark`

### Phase 3: Memory Core

Build a compact first-class thread memory model:

- summary
- open loops
- unresolved tensions
- user signals
- recent decisions
- per-character stance traces

### Phase 4: Room Response Engine

Build the normal speaking engine for:

- room chat
- direct address
- diagnostics
- follow-ups

No ambient workflow leakage.

### Phase 5: Workflow Lane

Workflow becomes explicit-only.

It should activate only from:

- explicit UI action
- explicit user language
- explicit upload + analyze/make request
- explicit commit/continue instruction

### Phase 6: Spark Engine

Spark becomes earned initiative:

- held thought pressure
- contradiction
- unresolved tension
- relationship shift
- impulse queue

Not workflow reminders.

### Phase 7: Cutover

- wire frontend to `messageEvents` only
- move route entry onto `studio2` engine behind flag
- keep old engine for rollback

## Non-Negotiables

- no council-simulator framing
- no fallback room writing as the default
- no hidden workflow pressure in ordinary chat
- no Aisha-first architecture
- no multiple competing speaker selectors
- no background provider spam

## Provider Budget

Target maximum per user turn:

- main response: 1 provider call
- optional spark: 1 provider call max
- optional surfaced char-to-char reply: 1 provider call max
- all observation/memory/belief/emotion updates: 0 provider calls

## Success Criteria

We are done when:

- short social turns feel human
- direct address feels precise
- characters disagree naturally
- memory changes later behavior
- workflow appears only when explicitly invoked
- spark feels earned
- Aisha is vivid without owning the machinery
- diagnostics produce real diagnosis

## Delivery Strategy

Do not land everything at once.

Land in slices:

1. docs + scaffold
2. characters + turn model
3. memory core
4. base room engine
5. workflow lane
6. spark lane
7. feature-flag route cutover
