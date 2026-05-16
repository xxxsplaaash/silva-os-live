# Prompt Generator Redesign Handoff

This package contains only the Prompt Generator surface and the backend contracts it depends on. It is meant for a design/code pass in another model without handing over the whole Silva OS project.

## Current Problem

The current generator says `Prompt Generator 5.1`, but it still feels like stacked technical cards. The user wants a human production workflow, not a router/debug dashboard.

The most important missed requirement:

> The user must be able to upload a picture of clothes, a clothing set, or separate clothing items, save those assets into the selected character's wardrobe, and reuse them later. Those clothing images must also be usable as visual references for final image generation.

Typing an outfit manually should still work, but uploaded wardrobe images are a first-class product requirement.

## What The Redesign Must Preserve

- Keep the app vanilla HTML/CSS/JS. No React, Next, Vite, TypeScript, or framework migration.
- Keep image generation routed only through `POST /api/image-generation/generate`.
- Keep Google Credits as the default route for referenced character work.
- Keep fal.ai as optional advanced/direct-ref lane.
- Keep Imagen no-reference only.
- Preserve compatibility IDs used by existing helpers and tests:
  - `g-character`
  - `g-platform`
  - `g-bucket`
  - `g-location`
  - `g-mood`
  - `g-time`
  - `g-posttype`
  - `g-mode`
  - `g-camera`
  - `g-spend-lane`
  - `g-route-intent`
  - `g-image-model`
  - `g-route-quality`
  - `g-image-aspect`
  - `g-attach-refs`
  - `gen-output-panel`
  - `gen-ai-tools`
  - `ai-helper-output`
  - `out-main`
  - `out-neg`

## Desired Product Shape

Build a true image-production console:

1. Pick character.
2. Lock identity references.
3. Pick or upload wardrobe.
4. Pick Home System / Assets / item refs.
5. Shape the shot.
6. See one clean route summary.
7. Generate one final image.
8. Review generated image beside exact refs used.

The first viewport should feel like one designed surface, not a set of unrelated panels.

## Wardrobe System Requirement

The redesign must support:

- Upload clothing set image.
- Upload separate clothing item image.
- Save uploaded items to the selected character wardrobe.
- Reuse saved wardrobe items later.
- Select one or multiple wardrobe items for the current shot.
- Send active wardrobe images as labeled reference objects in the generation payload.
- Allow typed outfit override without requiring an upload.

Suggested wardrobe item shape:

```js
{
  id: "wardrobe_vanya_black_blazer_001",
  characterId: "vanya",
  name: "Black fitted blazer",
  kind: "clothing_item", // clothing_item | clothing_set | accessory | shoes | bag | jewelry
  slot: "outerwear",
  palette: ["black", "gold"],
  garments: "fitted black blazer, clean collar, minimal hardware",
  notes: "Use as outfit reference, do not copy background.",
  image: {
    dataUrl: "...",
    url: null,
    source: "upload"
  },
  tags: ["work", "city", "premium"],
  createdAt: "ISO date"
}
```

When selected for a shot, compile into the existing reference system as:

```js
{
  type: "image",
  role: "wardrobe",
  label: "WARDROBE REFERENCE - BLACK FITTED BLAZER",
  priority: 40,
  dataUrl: "...",
  source: "character_wardrobe_upload",
  id: "wardrobe_vanya_black_blazer_001"
}
```

## Visual Direction

Use the Studio Pulse visual standard:

- Calm graphite/silver foundation.
- One elegant canvas-like workflow.
- Fewer borders.
- Better spacing rhythm.
- Stronger hierarchy.
- No giant debug text blocks.
- No repeated route/status cards.
- No “bunch of blocks glued together” layout.
- One primary action: `Generate Final Image`.

## Files In This Package

- `current/prompt_generator_v3.js`: current active generator layer.
- `current/prompt_generator_v3.css`: current generator styling.
- `current/index.html`: root shell and legacy helper guards.
- `backend-contracts/generator.js`: generator profile/concepts routes.
- `backend-contracts/imageGeneration.js`: generation endpoint contract.
- `backend-contracts/imageModels.js`: route preview/model metadata contract.
- `backend-contracts/modelRegistry.js`: model routing metadata.
- `tests/frontend.static.test.js`: current static expectations.
- `reference/current-generator-failure.png`: screenshot of the current UI failure.
- `reference/LIVE_SURFACE_OWNER_MAP.md`: ownership notes.
- `reference/FINAL_VERIFICATION.md`: prior verification log.
- `CLAUDE_TASK_PROMPT.md`: copy-paste prompt for Claude.
- `DESIGN_REQUIREMENTS.md`: detailed acceptance criteria.

## Expected Output From Claude

Claude should return:

- A redesigned `prompt_generator_v3.js` patch or replacement section.
- A redesigned `prompt_generator_v3.css` patch or replacement section.
- Any minimal backend additions needed for wardrobe save/load, preferably through existing `routes/generator.js`.
- A brief implementation note explaining how uploads are saved into character wardrobe and then included as generation references.

Do not accept a response that only changes colors, headings, or version labels.
