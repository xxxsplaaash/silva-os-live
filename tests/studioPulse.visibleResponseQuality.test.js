const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateVisibleResponse } = require('../lib/studio/socialDirector/visibleResponseQuality');

function issueKeys(issues) {
  return issues.map(item => `${item.family}:${item.category}`);
}

test('visible response quality rejects fake build-reflection language on style turns', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'My landing page style is black glass with a single red pulse.',
    visibleText: [
      'Black glass with a single red pulse. It is stark, almost aggressive.',
      'Understood. We will ensure the build reflects that visual intensity without performance lag.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects fake content-reflection implementation promises', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
    visibleText: [
      'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
      'We will ensure the content reflects that edge across the dashboard and landing page.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects fake page-reflection implementation promises', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
    visibleText: [
      'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
      'We will ensure the page reflects that edge across the dashboard and landing page.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects fake interface-reflection implementation promises', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
    visibleText: [
      'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
      'We will ensure the interface reflects that edge across the dashboard and landing page.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects fake experience-reflection implementation promises', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
    visibleText: [
      'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
      'We will ensure the experience reflects that edge across the dashboard and landing page.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects fake visual/reflection implementation promises', () => {
  const fixtures = [
    'We will ensure the visuals reflect that edge across the dashboard and landing page.',
    'We will ensure the layout reflects that edge across the dashboard and landing page.',
    'We will ensure the design reflects that edge across the dashboard and landing page.',
    'We will ensure the product reflects that edge across the dashboard and landing page.',
    'The landing page will reflect that edge across the dashboard and landing page.'
  ];

  for (const fixture of fixtures) {
    const issues = evaluateVisibleResponse({
      userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
      visibleText: [
        'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
        fixture
      ].join('\n')
    });

    assert.ok(issueKeys(issues).includes('self-theater:meta-language'), fixture);
  }
});

test('visible response quality rejects fake UI surface-reflection implementation promises', () => {
  const fixtures = [
    'We will ensure the UI reflects that edge across the dashboard and landing page.',
    'We will ensure the screen reflects that edge across the dashboard and landing page.',
    'We will ensure the frontend reflects that edge across the dashboard and landing page.',
    'We will ensure the dashboard reflects that edge across the dashboard and landing page.',
    'We will ensure the hero reflects that edge across the dashboard and landing page.',
    'We will ensure the brand reflects that edge across the dashboard and landing page.',
    'We will ensure the aesthetic reflects that edge across the dashboard and landing page.',
    'The UI will reflect that edge across the landing page.',
    'The dashboard will reflect that edge across the landing page.',
    'The hero will reflect that edge across the landing page.'
  ];

  for (const fixture of fixtures) {
    const issues = evaluateVisibleResponse({
      userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
      visibleText: [
        'The direction is black field, severe spacing, one red signal, and no friendly SaaS softness.',
        fixture
      ].join('\n')
    });

    assert.ok(issueKeys(issues).includes('self-theater:meta-language'), fixture);
  }
});

test('visible response quality rejects continuity answers that ask what changed instead of using ledger evidence', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What changed?',
    visibleText: 'What specifically has changed in your view? I need a clear summary of any new developments.',
    continuity: { active: 1, superseded: 1 }
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
});
