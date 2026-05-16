# Copy-Paste Prompt For Claude

You are redesigning only the Prompt Generator surface for a vanilla Node/Express app called Silva OS / Silver Studio AI Division.

The current Prompt Generator is unacceptable because it still looks like stacked technical cards and does not support the core wardrobe workflow. Redesign it as a real final-image production console.

## Non-Negotiable Goal

The user must be able to upload a picture of clothes, a full clothing set, or separate clothing items. The upload must save into the selected character's wardrobe and be reusable later. The selected clothing images must be sent as visual references when generating the final image.

Typing an outfit manually is also allowed, but image-based wardrobe refs are the main missing feature.

## Architecture Constraints

- Vanilla HTML/CSS/JS only.
- Do not convert to React, Next, Vite, TypeScript, or a new framework.
- Keep current backend generation route: `POST /api/image-generation/generate`.
- Keep Google Credits as default for referenced character images.
- Keep fal.ai as optional advanced lane.
- Keep Imagen no-reference only.
- Preserve existing compatibility IDs:
  - `g-character`, `g-platform`, `g-bucket`, `g-location`, `g-mood`, `g-time`, `g-posttype`, `g-mode`, `g-camera`
  - `g-spend-lane`, `g-route-intent`, `g-image-model`, `g-route-quality`, `g-image-aspect`, `g-attach-refs`
  - `gen-output-panel`, `gen-ai-tools`, `ai-helper-output`, `out-main`, `out-neg`

## Redesign The Interaction Model

Replace the current block pile with one cohesive console:

- Top command strip: character, job type, spend lane, selected model, Generate Final Image.
- Left panel: character identity, exact refs, wardrobe library.
- Center canvas: shot builder with outfit, location, action, pose, camera, lighting, mood, props.
- Right panel: route summary and final prompt contract.
- Bottom review drawer: generated image, exact refs used, approve/save actions.

Make it fit naturally in the first viewport. The user should not need to zoom out to understand the surface.

## Wardrobe UX

Add a proper wardrobe system:

- `Upload clothing`
- `Upload outfit set`
- `Add typed outfit`
- `Save to this character`
- `Use in current shot`
- `Remove from current shot`
- `Edit wardrobe item`

Wardrobe cards should show:

- image thumbnail
- item name
- clothing type or slot
- palette
- tags/vibe
- selected state

The user should be able to select multiple clothing refs for the same shot.

## Prompt Contract

Do not generate long generic paragraphs. Compile state into a compact recipe:

```js
{
  promptContractVersion: "prompt-contract-v5.1",
  jobType,
  character,
  identityRefs,
  wardrobeRefs,
  homeSystemRefs,
  itemRefs,
  shot: {
    location,
    action,
    pose,
    cameraDistance,
    lens,
    lighting,
    mood,
    movement,
    props,
    crop
  },
  realism: "raw_photo_identity_lock",
  outputFormat: "raw_photo",
  mustPreserve: [],
  mustNotRender: []
}
```

Provider prompt rules:

- Reference images override text.
- Face/body refs are identity authority.
- Wardrobe refs are clothing authority.
- Home/item refs are object/location authority.
- Output is raw final photo only.
- No Instagram UI, captions, borders, mockups, poster layouts, watermark, or text inside image.

## Payload Requirement

The final generation payload must include selected wardrobe refs as labeled objects:

```js
referenceImages: [
  {
    type: "image",
    role: "primary_face",
    label: "PRIMARY FACE IDENTITY REFERENCE",
    priority: 100,
    dataUrl: "..."
  },
  {
    type: "image",
    role: "wardrobe",
    label: "WARDROBE REFERENCE - BLACK FITTED BLAZER",
    priority: 40,
    dataUrl: "..."
  }
]
```

Also include:

- `generatorRecipe`
- `wardrobePack`
- `scenePack`
- `selectedReferencePack`
- `identityPack`
- `promptContractVersion: "prompt-contract-v5.1"`

## Acceptance Criteria

- It must not look like stacked cards or tabs.
- It must not merely change the version label.
- It must include image upload/save/reuse for character wardrobe.
- It must let the user select wardrobe refs for a shot.
- It must update prompt preview and payload immediately when wardrobe/shot refs change.
- It must have one primary CTA: `Generate Final Image`.
- It must preserve the current generation route and backend contract.
- It must feel premium, calm, and designed, closer to Studio Pulse than a debug dashboard.

Return concrete code changes for the files in this package, not just advice.
