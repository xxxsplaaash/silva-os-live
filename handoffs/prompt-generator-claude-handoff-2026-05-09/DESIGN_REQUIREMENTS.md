# Design Requirements For Prompt Generator Rebuild

## What Failed

The current 5.1 UI still reads as:

- stacked cards
- route/debug panels
- technical labels first
- no real wardrobe asset workflow
- no clean relationship between character, clothing, refs, shot, route, and output

The redesign must be structurally different, not a CSS pass.

## Required Mental Model

This is not a prompt form. It is a production shotboard.

The user should feel:

> I am dressing a living character, choosing what references enter the shot, composing the camera moment, and generating the final photo.

## Required Workflow

### 1. Character

- Select character.
- Show identity refs.
- Show exact identity readiness.
- Let user choose face/body refs used for this shot.

### 2. Wardrobe

- Show saved wardrobe for selected character.
- Upload new clothing images.
- Save upload to character wardrobe.
- Select wardrobe items for this shot.
- Type one-off outfit override.
- Use wardrobe images as actual generation references.

### 3. Home / Assets / Items

- Surface available Home System or Assets Vault refs.
- Let user select rooms, locations, cars, phones, bags, laptops, props, or signature items.
- Selected refs must enter the generation payload as labeled image references.

### 4. Shot Builder

Controls:

- location
- action
- pose
- camera distance
- lens
- lighting
- mood
- movement
- props
- crop/platform

Randomization:

- identity is always locked
- outfit, scene, light, camera, props, mood can be locked/unlocked
- randomization never spends image credits

### 5. Route

Show one route summary only:

- spend lane
- selected model
- readiness
- cost
- why selected

Model details live in a drawer.

### 6. Final Output

- One primary button: `Generate Final Image`.
- Show generated image large.
- Show exact refs used beside it.
- Approve/save is explicit.

## Visual Requirements

- Use Studio Pulse-level polish.
- Avoid nested card stacks.
- Avoid giant debug panels.
- Avoid repetitive headings.
- Avoid cramped typography.
- Avoid 3 columns of unrelated boxes.
- Make the first viewport understandable at normal zoom.
- Use drawers/sheets for secondary details.

## Data Requirements

Wardrobe and references should be stateful and reusable.

Suggested storage:

- server profile route: `POST /api/generator/profile`
- local fallback can exist, but server profile is preferred
- versioned keys:
  - `generator_closet_v1`
  - `generator_scene_library_v1`
  - `generator_presets_v1`

## Testing Requirements

Add/adjust tests for:

- `Prompt Generator 5.1`
- one active generator shell
- one primary `Generate Final Image` CTA
- wardrobe upload/save UI exists
- wardrobe item selection changes payload
- selected wardrobe refs are labeled objects
- no duplicate route/prompt-kit blocks
- no visible draft/mockup/social-frame language
- generated payload still goes to `/api/image-generation/generate`
