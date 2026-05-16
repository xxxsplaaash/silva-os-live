# Studio Pulse + Continuity Engine Brief

## Current Studio Pulse Role

Studio Pulse is the room workspace for the Silva OS. It is not just a chatbot and it is not the prompt generator. It is the conversational operating layer where the user can ask for direction, continuity checks, asset reasoning, prompt improvement, workflow thinking, and character-aware judgement.

The current live path is:

```text
server.js
  -> index.html
    -> studio_pulse_v400.js
      -> POST /api/studio/pulse
        -> routes/studio.js
          -> lib/studio/*
```

Room chat is live. Workflow and commit tools are paused during the rebuild, which means the room can answer and reason, but the deeper workflow automation lane should not be treated as complete yet.

## Why The Room Showed "Provider Unavailable"

That message meant the Studio Pulse provider call failed or returned unusable output for that turn. The user message was still preserved locally/thread-side, but the backend fallback was leaking an internal reason (`provider-unavailable`) into the room as user-facing copy.

The corrected behavior is:

- Keep the raw diagnostic reason in backend metadata/logs.
- Show the user a clean retryable message.
- Do not imply the room is offline when only the provider turn missed.

## Character Roles

The five active Studio Pulse characters are specialist lenses. The continuity engine should treat them as persistent agents with stable domains, not as random names in a prompt.

| Character | Role | What They Protect |
|---|---|---|
| Aisha Motsepe | Coherence, Standards & Emotional Truth | Truth, internal consistency, emotional honesty, room integrity |
| Leah Mokoena | Content Intelligence | Taste, culture, audience fit, voice, creative specificity |
| Claudia Naidoo | Client Systems & Operations | Sequencing, ownership, delivery realism, client standards |
| Grok / Gerhard | Technical Systems & Automation | Architecture, mechanisms, contradictions, code/system truth |
| Vanya Khumalo | People & Culture | Room energy, social truth, trust, people dynamics, cultural tone |

## Continuity Engine Goal

The continuity engine should make Studio Pulse remember and evaluate continuity across:

- Character identity and voice.
- Project history and prior decisions.
- Visual/output canon.
- Relationship dynamics between characters and users.
- Repeated failure patterns.
- Asset, wardrobe, prompt, and route consistency.
- What changed since the previous turn or session.

The engine should answer questions like:

- "Does this new output contradict the established character?"
- "Did we already decide this?"
- "Which character should notice this problem first?"
- "Is this prompt drift, visual drift, workflow drift, or memory drift?"
- "What must stay locked for the next generation?"

## Suggested Integration Shape

Add the continuity engine as a separate service layer, not as more frontend prompt text:

```text
Studio Pulse request
  -> normalize input
  -> hydrate thread and project memory
  -> run continuity engine
  -> select character speakers
  -> call provider with continuity summary
  -> validate output against continuity rules
  -> persist turn + continuity deltas
```

Recommended backend module boundary:

```text
lib/studio/continuityEngine.js
```

Recommended input:

```js
{
  userMessage,
  activeThread,
  selectedCharacter,
  projectState,
  recentOutputs,
  continuityProfiles,
  relationshipState,
  generatorState
}
```

Recommended output:

```js
{
  continuitySummary,
  risks,
  lockedFacts,
  suggestedSpeakers,
  memoryUpdates,
  promptConstraints,
  userVisibleNotes
}
```

## Important Rule

Continuity should guide Studio Pulse; it should not flatten the room. The characters still need their own taste, standards, warmth, disagreements, and timing. The continuity engine is the memory spine, not the personality layer.
