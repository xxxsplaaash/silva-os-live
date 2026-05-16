# Studio Pulse Turn Model

## Purpose

This file defines the clean turn architecture for the living-room engine rebuild.

Every user turn must resolve once, then every subsystem must obey that resolution.

## Turn Lanes

Allowed lanes:

- `room`
- `direct`
- `diagnostic`
- `workflow`
- `commit`
- `spark`

Every turn resolves into exactly one lane.

## Lane Rules

### room

Normal room conversation.

- no workflow activation unless explicitly requested
- one speaker usually leads
- additional speakers only if genuinely earned

### direct

User explicitly addresses one character.

- target character must lead unless validation fails hard
- no support-speaker stuffing by default

### diagnostic

System critique, bug critique, failure analysis.

- real diagnosis first
- no social filler
- Grok or Claudia usually lead

### workflow

Explicit planning, analysis, making, staging.

- only from explicit user or UI workflow action
- never from vague creative language alone

### commit

Explicit commit/confirm action.

- requires explicit commit intent or UI action

### spark

Room initiative.

- either earned impulse or explicit quiet
- not workflow reminders

## Turn Pipeline

```text
input
  -> turn plan
  -> observation pass
  -> signal detection
  -> emotion / need / belief update
  -> memory anchor selection
  -> speaker selection
  -> prompt build
  -> provider generation
  -> validation
  -> state update
  -> UI payload
```

## Response Contract

```js
{
  lane,
  intentFamily,
  targetSpeakerId,
  activeSpeakers,
  memoryAnchors,
  workflowContext,
  replyPolicy,
  output: {
    messageEvents: [
      {
        speakerId,
        kind,
        text,
        tone,
        replyToId,
        targetSpeakerId,
        metadata
      }
    ]
  },
  debug
}
```

`messageEvents` is the only live response contract.

## Speaker Selection Principles

Speaker selection should weigh:

- direct address
- salience
- relationship tension
- held thought pressure
- memory pressure
- emotional trigger
- unmet need
- contradiction
- rhythm of the room
- autonomous impulse

Not:

- bare keyword ownership
- workflow stickiness
- old council role assumptions

## Memory Usage Rule

Each turn should use only a few memory anchors:

- thread summary
- open loop
- unresolved tension
- one or two character stance traces

No broad runtime dumping into prompts.

## Workflow Rule

Workflow activates only from:

- explicit button/action
- explicit upload + explicit analyze/make request
- explicit language like `make a plan`, `stage this`, `commit this`

Never from:

- `content`
- `campaign`
- `post`
- vague studio chat

## Spark Rule

Spark means:

- held pressure surfaced
- contradiction surfaced
- relational tension surfaced
- organic impulse surfaced

Not:

- timer fired
- workflow exists
- reminder disguised as personality

## Provider Budget

Per user turn:

- main response: 1 provider call
- optional spark: 1 provider call max
- optional surfaced second reply: 1 provider call max
- all observation/state updates: 0 provider calls
