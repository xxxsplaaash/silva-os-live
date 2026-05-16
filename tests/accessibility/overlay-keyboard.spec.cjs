const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

const MOCK_MODELS = [
  { id: 'google/nano-banana-2', displayName: 'Nano Banana 2', providerAdapter: 'google', provider: 'Google Vertex AI', qualityTier: 'standard', costEstimateUsd: 0.04, costEstimateZar: 0.74, supportsTextToImage: true, supportsImageToImage: true, supportsMultiReference: true, supportsEditing: true, maxReferenceImages: 8, strengths: ['Nano Banana route'], weaknesses: ['Less premium than Pro'], bestFor: ['draft/general'], avoidWhen: ['final identity'] },
  { id: 'google/nano-banana-pro', displayName: 'Nano Banana Pro', providerAdapter: 'google', provider: 'Google Vertex AI', qualityTier: 'ultra', costEstimateUsd: 0.08, costEstimateZar: 1.48, supportsTextToImage: true, supportsImageToImage: true, supportsMultiReference: true, supportsEditing: true, maxReferenceImages: 10, strengths: ['Direct refs'], weaknesses: ['Preview access can vary'], bestFor: ['final identity'], avoidWhen: ['cheap drafts'] },
  { id: 'google/imagen-3-text-only', displayName: 'Imagen 3 Text-Only', providerAdapter: 'google', provider: 'Google Vertex AI', qualityTier: 'draft', costEstimateUsd: 0.04, costEstimateZar: 0.74, supportsTextToImage: true, supportsImageToImage: false, supportsMultiReference: false, supportsEditing: false, maxReferenceImages: 0, strengths: ['Clean bulk'], weaknesses: ['No refs'], bestFor: ['bulk'], avoidWhen: ['refs'] },
  { id: 'openai/gpt-image-2', displayName: 'GPT Image 2', providerAdapter: 'fal', provider: 'OpenAI GPT Image via fal.ai', qualityTier: 'premium', costEstimateUsd: 0.12, costEstimateZar: 2.22, supportsTextToImage: true, supportsImageToImage: true, supportsMultiReference: true, supportsEditing: true, maxReferenceImages: 10, strengths: ['Complex edits'], weaknesses: ['Requires fal.ai'], bestFor: ['complex edits'], avoidWhen: ['bulk'] },
  { id: 'openai/gpt-image-1.5', displayName: 'GPT Image 1.5', providerAdapter: 'fal', provider: 'OpenAI GPT Image via fal.ai', qualityTier: 'standard', costEstimateUsd: 0.08, costEstimateZar: 1.48, supportsTextToImage: true, supportsImageToImage: true, supportsMultiReference: true, supportsEditing: true, maxReferenceImages: 6, strengths: ['Fallback'], weaknesses: ['Older'], bestFor: ['fallback'], avoidWhen: ['GPT 2 available'] },
  { id: 'black-forest-labs/flux-2-pro', displayName: 'FLUX 2 Pro', providerAdapter: 'fal', provider: 'Black Forest Labs via fal.ai', qualityTier: 'premium', costEstimateUsd: 0.08, costEstimateZar: 1.48, supportsTextToImage: true, supportsImageToImage: false, supportsMultiReference: false, supportsEditing: false, maxReferenceImages: 0, strengths: ['Final render'], weaknesses: ['Text only'], bestFor: ['premium'], avoidWhen: ['bulk'] },
  { id: 'black-forest-labs/flux-2-max', displayName: 'FLUX 2 Max', providerAdapter: 'fal', provider: 'Black Forest Labs via fal.ai', qualityTier: 'ultra', costEstimateUsd: 0.16, costEstimateZar: 2.96, supportsTextToImage: true, supportsImageToImage: false, supportsMultiReference: false, supportsEditing: false, maxReferenceImages: 0, strengths: ['Ultra'], weaknesses: ['Expensive'], bestFor: ['final'], avoidWhen: ['draft'] },
  { id: 'bytedance/seedream-5-lite', displayName: 'Seedream 5 Lite', providerAdapter: 'fal', provider: 'ByteDance via fal.ai', qualityTier: 'standard', costEstimateUsd: 0.045, costEstimateZar: 0.83, supportsTextToImage: true, supportsImageToImage: true, supportsMultiReference: true, supportsEditing: true, maxReferenceImages: 6, strengths: ['Blending'], weaknesses: ['Not final'], bestFor: ['multi-ref'], avoidWhen: ['ultra'] },
  { id: 'fal/qwen-image-2-edit', displayName: 'Qwen Image 2 Edit', providerAdapter: 'fal', provider: 'Qwen Image via fal.ai', qualityTier: 'utility', costEstimateUsd: 0.01, costEstimateZar: 0.19, supportsTextToImage: false, supportsImageToImage: true, supportsMultiReference: false, supportsEditing: true, maxReferenceImages: 1, strengths: ['Utility edit'], weaknesses: ['Needs ref'], bestFor: ['utility'], avoidWhen: ['text-to-image'] }
];

async function installFastApiMocks(page) {
  await page.route('**/api/provider-credentials/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      providers: [
        { id: 'google', displayName: 'Google Vertex AI', providerAdapter: 'google', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['google/nano-banana-2', 'google/nano-banana-pro', 'google/imagen-3-text-only'] },
        { id: 'fal', displayName: 'fal.ai Image Hub', providerAdapter: 'fal', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['openai/gpt-image-2', 'openai/gpt-image-1.5', 'black-forest-labs/flux-2-pro'] },
        { id: 'studio-gemini', displayName: 'Studio Pulse Gemini', providerAdapter: 'google', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['gemini text'] }
      ],
      settings: { usdZarRate: { source: 'approximate-default', value: 18.5 } }
    })
  }));
  await page.route('**/api/image-models/route-preview', async route => {
    const request = route.request();
    let body = {};
    try { body = request.postDataJSON(); } catch (_) {}
    const selected = MOCK_MODELS.find(model => model.id === (body.preferredModel || 'google/nano-banana-2')) || MOCK_MODELS[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        selectedModel: selected,
        alternatives: MOCK_MODELS.filter(model => model.id !== selected.id).slice(0, 3),
        reasoning: ['Mocked route preview for browser UI stability.'],
        estimatedCostUsd: selected.costEstimateUsd,
        estimatedCostZar: selected.costEstimateZar
      })
    });
  });
  await page.route('**/api/image-models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, schemaVersion: 'image-routing.v1', items: MOCK_MODELS })
  }));
}

async function installMutableProviderMocks(page) {
  if (typeof page.unrouteAll === 'function') {
    await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => page.unrouteAll().catch(() => {}));
  } else {
    await Promise.all([
      page.unroute('**/api/provider-credentials/status').catch(() => {}),
      page.unroute('**/api/provider-credentials').catch(() => {}),
      page.unroute('**/api/image-models/route-preview').catch(() => {}),
      page.unroute('**/api/image-models').catch(() => {})
    ]);
  }
  const status = {
    ok: true,
    providers: [
      { id: 'google', displayName: 'Google Vertex AI', providerAdapter: 'google', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['google/nano-banana-2', 'google/nano-banana-pro', 'google/imagen-3-text-only'] },
      { id: 'fal', displayName: 'fal.ai Image Hub', providerAdapter: 'fal', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['openai/gpt-image-2', 'openai/gpt-image-1.5', 'black-forest-labs/flux-2-pro', 'black-forest-labs/flux-2-max', 'bytedance/seedream-5-lite', 'fal/qwen-image-2-edit'] },
      { id: 'studio-gemini', displayName: 'Studio Pulse Gemini', providerAdapter: 'google', configured: false, status: 'missing key', source: 'missing', supportedModelIds: ['gemini text'] }
    ],
    settings: { usdZarRate: { source: 'approximate-default', value: 18.5 } }
  };
  const readinessFor = model => {
    const provider = status.providers.find(item => item.providerAdapter === model.providerAdapter) || status.providers[0];
    return {
      configured: Boolean(provider.configured),
      status: provider.status,
      source: provider.source,
      providerAdapter: model.providerAdapter
    };
  };
  const modelWithReadiness = model => Object.assign({}, model, { providerReadiness: readinessFor(model) });
  await page.route('**/api/provider-credentials/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(Object.assign({}, status, { lastCheckedAt: new Date().toISOString() }))
  }));
  await page.route('**/api/provider-credentials', async route => {
    const body = route.request().postDataJSON();
    const provider = status.providers.find(item => item.id === body.provider);
    if (provider) {
      provider.configured = true;
      provider.status = 'ready';
      provider.source = 'vault';
      provider.maskedValue = body.provider === 'fal' ? 'fal_...test' : '.../service-account.json';
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: Object.assign({}, status, { lastCheckedAt: new Date().toISOString() }) })
    });
  });
  await page.route('**/api/image-models/route-preview', async route => {
    let body = {};
    try { body = route.request().postDataJSON(); } catch (_) {}
    const selected = modelWithReadiness(MOCK_MODELS.find(model => model.id === (body.preferredModel || 'google/nano-banana-2')) || MOCK_MODELS[0]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        selectedModel: selected,
        alternatives: MOCK_MODELS.filter(model => model.id !== selected.id).slice(0, 3).map(modelWithReadiness),
        reasoning: ['Mocked mutable route preview.'],
        estimatedCostUsd: selected.costEstimateUsd,
        estimatedCostZar: selected.costEstimateZar
      })
    });
  });
  await page.route('**/api/image-models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, schemaVersion: 'image-routing.v1', items: MOCK_MODELS.map(modelWithReadiness) })
  }));
}

async function openApp(page) {
  await installFastApiMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('silva_brief_date', new Date().toDateString());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.waitForFunction(() => typeof window.openModal === 'function' && typeof window.nav === 'function');
}

test.describe('Silva overlay accessibility', () => {
  test.describe.configure({ timeout: 180000 });

  test('generic modal traps focus, closes with Escape, and restores focus', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'a11y-modal-trigger';
      trigger.textContent = 'Open test dialog';
      trigger.onclick = () => window.openModal(`
        <h2 class="section-title">Keyboard test dialog</h2>
        <button id="modal-first">First action</button>
        <button id="modal-second">Second action</button>
      `);
      document.body.appendChild(trigger);
    });

    await page.locator('#a11y-modal-trigger').focus();
    await page.evaluate(() => document.getElementById('a11y-modal-trigger').click());

    await expect(page.locator('#modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#modal-first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.modal-close')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#modal-first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#modal-second')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('.modal-close')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);
    await expect(page.locator('#a11y-modal-trigger')).toBeFocused();
  });

  test('command palette opens with keyboard focus and supports keyboard activation', async ({ page }) => {
    await openApp(page);

    await page.keyboard.press('Control+K');
    await expect(page.locator('#command-palette')).toHaveClass(/open/);
    await expect(page.locator('#palette-input')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#palette-item-0')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#command-palette')).not.toHaveClass(/open/);
  });

  test('studio brief opens with focus inside and restores the opener', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'a11y-brief-trigger';
      trigger.textContent = 'Open brief';
      trigger.onclick = () => window.openBrief();
      document.body.appendChild(trigger);
    });

    await page.locator('#a11y-brief-trigger').focus();
    await page.locator('#a11y-brief-trigger').click();

    await expect(page.locator('#studio-brief')).toHaveClass(/open/);
    await expect(page.locator('#studio-brief .brief-footer button').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#studio-brief')).not.toHaveClass(/open/);
    await expect(page.locator('#a11y-brief-trigger')).toBeFocused();
  });

  test('War Room drawer traps focus and restores the opener', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'a11y-war-trigger';
      trigger.textContent = 'Open War Room';
      trigger.onclick = () => window.openWarRoom();
      document.body.appendChild(trigger);
    });

    await page.locator('#a11y-war-trigger').focus();
    await page.locator('#a11y-war-trigger').click();

    await expect(page.locator('#war-room')).toHaveClass(/open/);
    await expect(page.locator('#wr-search')).toBeFocused();

    await page.keyboard.press('Tab');
    const focusStayedInside = await page.evaluate(() => {
      const active = document.activeElement;
      const room = document.getElementById('war-room');
      return Boolean(room && active && room.contains(active));
    });
    expect(focusStayedInside).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#war-room')).not.toHaveClass(/open/);
    await expect(page.locator('#a11y-war-trigger')).toBeFocused();
  });

  test('planner add modal and gallery log modal open with form focus', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const planner = document.createElement('button');
      planner.id = 'a11y-plan-trigger';
      planner.textContent = 'Schedule content';
      planner.onclick = () => window.openAddPlanModal('2026-05-06');
      document.body.appendChild(planner);

      const gallery = document.createElement('button');
      gallery.id = 'a11y-gallery-trigger';
      gallery.textContent = 'Log gallery output';
      gallery.onclick = () => window.openAddGalleryModal();
      document.body.appendChild(gallery);
    });

    await page.locator('#a11y-plan-trigger').focus();
    await page.locator('#a11y-plan-trigger').click();
    await expect(page.locator('#modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#plan-title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);
    await expect(page.locator('#a11y-plan-trigger')).toBeFocused();

    await page.locator('#a11y-gallery-trigger').focus();
    await page.locator('#a11y-gallery-trigger').click();
    await expect(page.locator('#modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#gal-title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);
    await expect(page.locator('#a11y-gallery-trigger')).toBeFocused();
  });

  test('keyboard-only non-destructive workflow can generate prompt, schedule, log, and export', async ({ page }) => {
    await openApp(page);

    await page.evaluate(() => {
      window.nav('generator');
    });
    await expect(page.locator('#g-char')).toBeVisible();
    await page.locator('#g-char').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.evaluate(() => window.generateFullKit());
    await expect(page.locator('#gen-output-panel')).toBeVisible();

    await page.evaluate(() => window.openAddPlanModal('2026-05-06'));
    await expect(page.locator('#plan-title')).toBeFocused();
    await page.locator('#plan-title').fill('Accessibility scheduled post');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);

    await page.evaluate(() => window.openAddGalleryModal());
    await expect(page.locator('#gal-title')).toBeFocused();
    await page.locator('#gal-title').fill('Accessibility gallery log');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);

    const exportAvailable = await page.evaluate(() => typeof window.exportSilvaWorkspace === 'function');
    expect(exportAvailable).toBe(true);
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);
  });

  test('core screen and modal overlay have no serious axe violations', async ({ page }) => {
    await openApp(page);

    const pageResults = await new AxeBuilder({ page })
      .include('#sidebar')
      .include('#page-home')
      .disableRules(['color-contrast'])
      .analyze();
    const seriousPageViolations = pageResults.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(seriousPageViolations).toEqual([]);

    await page.evaluate(() => window.openModal(`
      <h2 class="section-title">Accessible modal</h2>
      <p>Keyboard and screen-reader smoke test content.</p>
      <button>Confirm</button>
    `));

    const modalResults = await new AxeBuilder({ page })
      .include('#modal-overlay')
      .disableRules(['color-contrast'])
      .analyze();
    const seriousModalViolations = modalResults.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(seriousModalViolations).toEqual([]);
  });

  test('generator/provider/settings surfaces claim the new owners and keep preview stable', async ({ page }) => {
    test.setTimeout(240000);
    await installFastApiMocks(page);
    await page.goto('/?perf=1#generator');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#page-generator')).toHaveClass(/active/);
    await expect(page.locator('#prompt-generator-52-shell')).toBeVisible();
    await expect(page.locator('#g-route-preview')).toBeVisible();
    await expect(page.locator('#gen-ai-tools')).toHaveCount(1);
    await expect(page.locator('#ai-helper-output')).toHaveCount(1);

    const generatorOwner = await page.evaluate(() => window.SilvaSurfaceOwners?.snapshot?.().generator?.owner || '');
    expect(generatorOwner).toBe('assets/prompt_generator_v3.js');

    await expect(page.locator('#pg50-model-drawer')).toBeHidden();
    await page.locator('#pg50-model-drawer-toggle').click();
    await expect(page.locator('#pg50-model-drawer')).toBeVisible();
    await expect(page.locator('.pg3-model-card')).toHaveCount(9);
    await expect(page.locator('.pg3-model-card').first()).toBeVisible();
    await expect(page.locator('.pg3-model-card').first()).toContainText('Nano Banana 2');
    await expect(page.locator('#prompt-generator-52-shell')).not.toContainText('Route cockpit');
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => {
      const first = document.querySelector('.pg3-model-card');
      first && (first.dataset.stabilityProbe = 'same-node');
      return window.PromptGeneratorV3?.perfSnapshot?.().modelBoardRenderCount || 0;
    });
    await page.evaluate(() => window.previewImageRouteFromGenerator?.({ force: true }));
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => ({
      count: window.PromptGeneratorV3?.perfSnapshot?.().modelBoardRenderCount || 0,
      sameNode: document.querySelector('.pg3-model-card')?.dataset.stabilityProbe === 'same-node'
    }));
    expect(after.sameNode).toBe(true);
    expect(after.count).toBe(before);

    await page.goto('/#providers');
    await expect(page.locator('#provider-wrap .pvc-shell')).toBeVisible();
    await expect(page.locator('#page-providers .page-title')).toHaveText('Provider Control Center');
    await expect(page.locator('#page-providers')).not.toContainText('Provider Layer Shell');
    const providerOwner = await page.evaluate(() => window.SilvaSurfaceOwners?.snapshot?.().providers?.owner || '');
    expect(providerOwner).toBe('assets/provider_control_center_v1.js');

    await page.goto('/#settings');
    await expect(page.locator('#settings-provider-wrap .pvc-settings-shell')).toBeVisible();
    const settingsOwner = await page.evaluate(() => window.SilvaSurfaceOwners?.snapshot?.().settings?.owner || '');
    expect(settingsOwner).toBe('assets/provider_control_center_v1.js');
  });

  test('provider save updates generator readiness without a reload', async ({ page }) => {
    await installMutableProviderMocks(page);
    await page.goto('/#providers');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#provider-wrap .pvc-shell')).toBeVisible();

    const falCard = page.locator('[data-provider="fal"]');
    await expect(falCard).toHaveCount(1);
    await falCard.locator('[data-provider-input="fal"]').fill('fal_mock_token_for_browser_test');
    await falCard.locator('[data-provider-save="fal"]').click();
    await expect(falCard).toContainText('configured');

    await page.goto('/#generator');
    await expect(page.locator('#prompt-generator-52-shell')).toBeVisible();
    await page.locator('#pg50-model-drawer-toggle').click();
    await expect(page.locator('.pg3-model-card')).toHaveCount(9);
    await page.locator('.pg3-model-card[data-model-id="openai/gpt-image-2"]').click();
    await expect(page.locator('#g-image-model')).toHaveValue('openai/gpt-image-2');
    await page.locator('#g-image-model').selectOption('openai/gpt-image-2');
    await page.evaluate(() => window.previewImageRouteFromGenerator?.({ force: true }));
    await expect(page.locator('#g-route-preview')).toContainText('Ready to generate');
    await expect(page.locator('.pg3-model-card[data-model-id="openai/gpt-image-2"]')).toContainText('ready');
  });
});
