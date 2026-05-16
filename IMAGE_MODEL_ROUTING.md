# Silver Studio Image Model Routing

Silver Studio image generation is routed by the backend. The browser only sees public model metadata, masked provider readiness, approximate cost, and normalized image outputs.

## Provider Split

- Google image generation uses Google Cloud Vertex AI with a service-account JSON key saved server-side. The Provider Control Center can paste/upload the JSON and write it to `.runtime/vertex-service-account.json`; advanced setups can still provide an existing local path.
- Google reference/final image generation is direct-reference first:
  - `google/nano-banana-pro` uses Vertex `gemini-3-pro-image-preview` for identity-critical reference renders.
  - `google/nano-banana-2` uses Vertex `gemini-2.5-flash-image` for fast direct-reference drafts and iterations.
  - Actual reference images are sent into the Gemini Image request as image parts.
- If a Gemini Image preview model is unavailable in the active Vertex project/region, the Google adapter stays on Google Credits and tries Vertex region fallbacks before downgrading the model. Default fallback order is `us-central1` -> `us-east4` -> `europe-west9` -> `global`, then the paired direct-reference Gemini Image route. It does not fall back to AI Studio, Imagen text-only, or fal.ai without an explicit route change.
- Imagen 3 (`imagen-3.0-generate-001`) is now an explicit text-only/no-reference fallback route, not the primary character-reference generator.
- Vertex Gemini Flash/Pro text models remain available for visual reasoning and prompt QA, but the reference image generation path uses Gemini Image models directly.
- fal.ai handles every live non-Google image route: GPT Image, FLUX, Seedream, Qwen utility edit, and future non-Google models.
- Direct OpenAI image routing is not used in this local setup. `OPENAI_API_KEY` is not required for image generation.
- Google models stay on Vertex AI and must not fall through to fal.ai.
- The legacy AI Studio image endpoint `POST /api/gemini/image` is disabled by default. It returns `410 legacy_ai_studio_image_disabled` unless `ENABLE_LEGACY_AI_STUDIO_IMAGE=1` is set intentionally. The visible generator must not use it as a fallback.

No API key, service-account JSON, raw service-account path, or fal key is returned to the browser.

## Raw Photo And Identity Fidelity Contract

Prompt Generator 3.7 treats character image generation as a raw source-photo workflow:

- `outputFormatMode: "raw_photo"` is the default for generator image requests.
- `identityMode: "exact_character"` is sent when character face/body references are attached.
- The image prompt must ask for a clean camera photograph only, not an Instagram post, social mockup, caption card, poster, phone screenshot, or framed UI.
- Provider prompts add hard negative constraints for social media frame, Instagram UI, username, caption text, white border, post template, mockup, poster, graphic design, watermark, text in image, phone screenshot, and UI chrome.
- Reference images are sent as labeled objects, not anonymous strings. Examples: `PRIMARY FACE IDENTITY REFERENCE`, `FULL BODY / BUILD REFERENCE`, `WARDROBE REFERENCE`, and `APPROVED GOLD OUTPUT - DO NOT COPY AS FRAME`.
- Google Gemini Image requests interleave each text label immediately before the matching image part so the provider knows which ref controls face identity, body/build, outfit, or approved output.
- Post-generation identity QA can compare the generated image against the reference pack and return `identityScore`, `identityVerdict`, and mismatch notes. Failed identity is not auto-spent into another generation; the UI shows repair actions.
- Gallery saves can include `identityScore`, `identityVerdict`, `referencePack`, `outputFormatMode`, `providerModel`, and `referenceStrategy`.

## Provider Vault

Prompt Generator and Provider Control Center use a server-side SQLite credential vault:

- `GET /api/provider-credentials/status`
- `POST /api/provider-credentials`
- `DELETE /api/provider-credentials/:id`

Secret values are encrypted server-side and returned only as masked status. Vault values override environment values without a server restart.

Supported live vault entries:

- `google.vertex_service_account_path`: generated Vertex AI service-account JSON file path. It can be created from pasted/uploaded JSON in the Provider Control Center, or entered manually as an advanced existing file path. Public status shows only a masked basename.
- `google.vertex_project_id`: optional Vertex project override. Default: `project-be35f944-1782-4f27-86f`.
- `google.vertex_location`: optional Vertex location override. Default: `us-central1`.
- `google.vertex_imagen_model`: optional legacy Imagen text-only model override. Default: `imagen-3.0-generate-001`.
- `google.vertex_gemini_fast_model`: optional fast visual-reasoning model override. Default: `gemini-2.5-flash`. If a saved override points to an unavailable Gemini model, the Google adapter falls forward to the default fast/pro models before failing.
- `google.vertex_gemini_pro_model`: optional pro visual-reasoning model override. Default: `gemini-2.5-pro`.
- `google.vertex_claude_model`: optional Vertex Model Garden Claude override. Default: `claude-3-5-sonnet-v2@20241022`.
- `fal.api_key`: fal.ai key for GPT Image, FLUX, Seedream, Qwen utility edit, and non-Google image models.
- `fal.gpt_image_2_model`: optional fal endpoint override for `openai/gpt-image-2`.
- `fal.gpt_image_1_5_model`: optional fal endpoint override for `openai/gpt-image-1.5`.
- `fal.flux_2_pro_model`: optional fal endpoint override for FLUX 2 Pro.
- `fal.flux_2_max_model`: optional fal endpoint override for FLUX 2 Max.
- `fal.seedream_text_model`: optional fal endpoint override for Seedream text-to-image.
- `fal.seedream_edit_model`: optional fal endpoint override for Seedream edit.
- `fal.utility_edit_model`: optional fal endpoint override for Qwen utility edit.
- `settings.usd_zar_rate`: local cost display rate.
- `studio_pulse.gemini_api_key`: optional Studio Pulse Gemini compatibility key.

Legacy `openai.*` and `replicate.*` credential rows may remain in the database as hidden compatibility data, but they are not visible live image-provider routes.

## Live Models

| Model ID | Adapter | Role |
| --- | --- | --- |
| `google/nano-banana-2` | `google` | Fast Google-credit direct-reference route via Vertex `gemini-2.5-flash-image` |
| `google/nano-banana-pro` | `google` | Primary Google-credit final/reference route via Vertex `gemini-3-pro-image-preview` |
| `google/imagen-3-text-only` | `google` | Legacy/no-reference text-to-image fallback via Vertex Imagen 3 |
| `openai/gpt-image-2` | `fal` | Complex edit and semantic reference route through fal.ai |
| `openai/gpt-image-1.5` | `fal` | GPT Image fallback or special-feature route through fal.ai |
| `black-forest-labs/flux-2-pro` | `fal` | Premium final render |
| `black-forest-labs/flux-2-max` | `fal` | Ultra-premium final-only render |
| `bytedance/seedream-5-lite` | `fal` | Multi-reference and mid-cost edit route |
| `fal/qwen-image-2-edit` | `fal` | Utility image edit route |

Deprecated saved prompts that still reference `prunaai/p-image-edit` are aliased server-side to `fal/qwen-image-2-edit`.

Deprecated saved prompts that still reference `google/imagen-4` are aliased server-side to `google/imagen-3-text-only`.

## Routing Rules

Use `selectImageModel()` from `lib/imageGeneration/modelRegistry.js`.

Supported intents:

- `cheap_draft`
- `bulk_clean_generation`
- `multi_reference`
- `complex_edit`
- `premium_final_render`
- `ultra_premium_final`
- `utility_edit`

Default routing:

- `cheap_draft`: Nano Banana 2 for fast Google direct-reference drafts, or Imagen 3 text-only when no references are attached.
- `bulk_clean_generation`: Imagen 3 text-only for simple no-reference bulk generation.
- `google_credits` with references: Nano Banana Pro by default, Nano Banana 2 as the faster Google-credit fallback.
- `multi_reference`: Seedream through fal.ai, then GPT Image 2 through fal.ai.
- `complex_edit`: GPT Image 2 through fal.ai, then Seedream through fal.ai.
- `premium_final_render`: FLUX 2 Pro through fal.ai for text-to-image final renders.
- `ultra_premium_final`: FLUX 2 Max through fal.ai.
- `utility_edit`: Qwen Image 2 Edit through fal.ai.

`preferredModel` wins only when the selected model supports the requested inputs. Otherwise the router returns the closest valid route plus reasoning.

## Public Endpoints

### `GET /api/image-models`

Returns safe public registry data only.

### `POST /api/image-models/route-preview`

Returns selected model, alternatives, reasoning, estimated USD/ZAR cost, and masked provider readiness.

### `POST /api/image-generation/generate`

Routes the request, validates credentials, calls the selected provider adapter, and returns normalized browser-safe image outputs. Raw provider payloads are only included when `IMAGE_PROVIDER_DEBUG=1` is set server-side.

### `POST /api/gemini/image`

Legacy AI Studio compatibility endpoint. Disabled by default to prevent accidental Google AI Studio prepay billing. Use `/api/image-generation/generate` for all live image generation.

## Environment Variables

- `VERTEX_SERVICE_ACCOUNT_JSON_PATH`: absolute local path to the Vertex AI service-account JSON file.
- `GOOGLE_APPLICATION_CREDENTIALS`: optional fallback service-account JSON path.
- `VERTEX_PROJECT_ID`: optional Vertex project override. Default: `project-be35f944-1782-4f27-86f`.
- `VERTEX_LOCATION`: optional Vertex region override. Default: `us-central1`.
- `VERTEX_LOCATION_FALLBACKS`: optional comma-separated Vertex fallback locations. Default: `us-east4,europe-west9,global`.
- `VERTEX_IMAGEN_MODEL`: optional legacy Imagen text-only model override. Default: `imagen-3.0-generate-001`.
- `VERTEX_GEMINI_FAST_MODEL`: optional fast visual-reasoning model override. Default: `gemini-2.5-flash`.
- `VERTEX_GEMINI_PRO_MODEL`: optional pro visual-reasoning model override. Default: `gemini-2.5-pro`.
- `VERTEX_CLAUDE_MODEL`: optional Vertex Model Garden Claude override. Default: `claude-3-5-sonnet-v2@20241022`.
- `FAL_KEY`: fal.ai key for GPT Image, FLUX, Seedream, Qwen utility edit, and non-Google image models.
- `FAL_GPT_IMAGE_2_MODEL`: optional endpoint override for `openai/gpt-image-2`.
- `FAL_GPT_IMAGE_1_5_MODEL`: optional endpoint override for `openai/gpt-image-1.5`.
- `FAL_FLUX_2_PRO_MODEL`: optional endpoint override for FLUX 2 Pro.
- `FAL_FLUX_2_MAX_MODEL`: optional endpoint override for FLUX 2 Max.
- `FAL_SEEDREAM_TEXT_MODEL`: optional endpoint override for Seedream text-to-image.
- `FAL_SEEDREAM_EDIT_MODEL`: optional endpoint override for Seedream edit.
- `FAL_UTILITY_EDIT_MODEL`: optional endpoint override for Qwen utility edit.
- `USD_ZAR_RATE`: optional local display conversion for approximate costs.
- `IMAGE_PROVIDER_DEBUG`: optional server-side raw provider payload inclusion when set to `1`.
- `ENABLE_LEGACY_AI_STUDIO_IMAGE`: optional emergency compatibility flag. Leave unset for normal use so image generation stays on Vertex AI / Google Cloud credits.

## Pricing Notes

Registry costs are planning estimates, not billing truth. Update `costEstimateUsd` and `costBasis` in `lib/imageGeneration/modelRegistry.js` when provider pricing changes or when real usage accounting is added.

Prompt Generator reads the public registry and provider status, then displays USD/ZAR estimates and provider readiness before generation.

## Adding Future Models

1. Add the model to `IMAGE_MODELS` in `lib/imageGeneration/modelRegistry.js`.
2. Set `providerAdapter: "google"` only for Google Vertex AI models.
3. Set `providerAdapter: "fal"` for every live non-Google image model.
4. Fill in capability flags, quality tier, strengths, weaknesses, best-use cases, and avoid rules.
5. Add or adjust routing priority in `priorityForRequest()`.
6. Add tests for the new route or capability.
7. Keep secrets server-side only.
