const test = require('node:test');
const assert = require('node:assert/strict');

const { selectImageModel } = require('../lib/imageGeneration/modelRegistry');

const env = { USD_ZAR_RATE: '18' };

test('image model routing chooses expected defaults', () => {
  assert.equal(selectImageModel({ intent: 'cheap_draft' }, env).selectedModel.id, 'google/nano-banana-2');
  assert.equal(selectImageModel({ intent: 'bulk_clean_generation' }, env).selectedModel.id, 'google/imagen-3-text-only');
  assert.equal(selectImageModel({ intent: 'multi_reference', referenceCount: 3 }, env).selectedModel.id, 'bytedance/seedream-5-lite');
  assert.equal(selectImageModel({ intent: 'complex_edit', requiresEditing: true }, env).selectedModel.id, 'openai/gpt-image-2');
  assert.equal(selectImageModel({ intent: 'premium_final_render' }, env).selectedModel.id, 'black-forest-labs/flux-2-pro');
  assert.equal(selectImageModel({ intent: 'ultra_premium_final' }, env).selectedModel.id, 'black-forest-labs/flux-2-max');
  assert.equal(selectImageModel({ intent: 'utility_edit', requiresEditing: true, referenceCount: 1 }, env).selectedModel.id, 'fal/qwen-image-2-edit');
});

test('GPT Image app-facing routes resolve through fal.ai metadata', () => {
  const complex = selectImageModel({ intent: 'complex_edit', requiresEditing: true, requiresTextRendering: true }, env);
  assert.equal(complex.selectedModel.id, 'openai/gpt-image-2');
  assert.equal(complex.selectedModel.providerAdapter, 'fal');
  assert.match(complex.selectedModel.provider, /fal\.ai/);
});

test('cheap draft adapts to edit and low-budget clean generation needs', () => {
  assert.equal(
    selectImageModel({ intent: 'cheap_draft', budgetTier: 'low' }, env).selectedModel.id,
    'google/imagen-3-text-only'
  );
  assert.equal(
    selectImageModel({ intent: 'cheap_draft', requiresEditing: true, referenceCount: 1, budgetTier: 'cheap' }, env).selectedModel.id,
    'fal/qwen-image-2-edit'
  );
  assert.equal(
    selectImageModel({ intent: 'cheap_draft', requiresEditing: true, referenceCount: 2, budgetTier: 'cheap' }, env).selectedModel.id,
    'bytedance/seedream-5-lite'
  );
});

test('Google credit direct-reference requests can route to Nano Banana Pro', () => {
  const routed = selectImageModel({
    intent: 'complex_edit',
    referenceCount: 2,
    requiresEditing: true,
    quality: 'premium',
    budgetTier: 'google_credits',
    preferredModel: 'google/nano-banana-pro'
  }, env);
  assert.equal(routed.selectedModel.id, 'google/nano-banana-pro');
  assert.equal(routed.selectedModel.providerAdapter, 'google');
  assert.equal(routed.selectedModel.model, 'gemini-3-pro-image-preview');
});

test('preferred model wins only when it supports the requested inputs', () => {
  const complex = selectImageModel({
    intent: 'complex_edit',
    requiresEditing: true,
    preferredModel: 'openai/gpt-image-2'
  }, env);
  assert.equal(complex.selectedModel.id, 'openai/gpt-image-2');
  assert.match(complex.reasoning.join(' '), /Preferred model openai\/gpt-image-2 supports/);

  const unsupportedPreferred = selectImageModel({
    intent: 'multi_reference',
    referenceCount: 3,
    preferredModel: 'google/imagen-4'
  }, env);
  assert.equal(unsupportedPreferred.selectedModel.id, 'bytedance/seedream-5-lite');
  assert.match(unsupportedPreferred.reasoning.join(' '), /does not support/);
});

test('image model routing covers Generator 3.0 production intents', () => {
  assert.equal(
    selectImageModel({ intent: 'premium_final_render', quality: 'premium' }, env).selectedModel.id,
    'black-forest-labs/flux-2-pro'
  );
  assert.equal(
    selectImageModel({ intent: 'ultra_premium_final', quality: 'ultra' }, env).selectedModel.id,
    'black-forest-labs/flux-2-max'
  );
  assert.equal(
    selectImageModel({ intent: 'utility_edit', requiresEditing: true, referenceCount: 1 }, env).selectedModel.id,
    'fal/qwen-image-2-edit'
  );
  assert.equal(
    selectImageModel({ intent: 'complex_edit', requiresEditing: true, requiresTextRendering: true }, env).selectedModel.id,
    'openai/gpt-image-2'
  );
  assert.equal(
    selectImageModel({ intent: 'multi_reference', referenceCount: 6, preferredModel: 'bytedance/seedream-5-lite' }, env).selectedModel.id,
    'bytedance/seedream-5-lite'
  );
});

test('deprecated Pruna preferred model aliases to fal Qwen utility edit', () => {
  const routed = selectImageModel({
    intent: 'utility_edit',
    requiresEditing: true,
    referenceCount: 1,
    preferredModel: 'prunaai/p-image-edit'
  }, env);
  assert.equal(routed.selectedModel.id, 'fal/qwen-image-2-edit');
  assert.match(routed.reasoning.join(' '), /Deprecated preferred model prunaai\/p-image-edit was mapped/);
});
