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

test('visible response quality rejects passive and adjacent surface-reflection promises', () => {
  const fixtures = [
    'The website will reflect that edge across the landing page.',
    'The app will reflect that edge across the landing page.',
    'The homepage will reflect that edge across the product.',
    'The page now reflects that edge across the dashboard.',
    'The visuals now reflect that edge across the dashboard.',
    'This will be reflected in the interface across the landing page.',
    'That edge will be reflected in the UI.'
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

test('visible response quality rejects fake implementation-alignment promises from live turns', () => {
  const fixtures = [
    'Let us ensure the implementation aligns with that clarity.',
    'We need to ensure all assets align with that constraint.',
    'The implementation aligns with that clarity.',
    'Assets align with that constraint now.'
  ];

  for (const fixture of fixtures) {
    const issues = evaluateVisibleResponse({
      userMessage: 'My dashboard preference is obsidian with one red accent.',
      visibleText: [
        'Obsidian with one red accent. Noted.',
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

test('visible response quality rejects preference recall answers that ignore ledger evidence', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What dashboard preference did I give the room?',
    visibleText: 'I do not have a recorded dashboard preference yet. Tell me the preference and I will track it.',
    continuity: { active: 1, superseded: 0 }
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
});

test('visible response quality accepts specific preference recall from memory', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What dashboard preference did I give the room?',
    visibleText: 'You prefer obsidian dashboards with one red accent.',
    continuity: { active: 1, superseded: 0 }
  });

  assert.equal(issueKeys(issues).includes('continuity-miss:ledger-answer'), false);
});

test('visible response quality rejects accepted answers that defend a superseded preference', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Actually my dashboard preference is pale blue with no red accents.',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'aisha', role: 'primary', text: 'Obsidian with one red accent. Noted.' }
    ],
    visibleText: 'The note states obsidian with one red accent. We will proceed with that.'
  });

  assert.ok(issueKeys(issues).includes('continuity-conflict:superseded-current-turn'));
});

test('visible response quality rejects reversed active and prior continuity denial', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'No, I never said black glass. Did I?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
      { speakerId: 'aisha', role: 'primary', text: 'landing page style is white editorial with no red. Noted.' }
    ],
    visibleText: 'Yes: prior record was landing page style is white editorial with no red; current record is landing page style is black glass with a single red pulse.'
  });

  assert.ok(issueKeys(issues).includes('continuity-conflict:reversed-active-prior'));
});

test('visible response quality rejects invented project specifics on generic planning asks', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      'Let us outline tomorrow. What are the critical items that need to be addressed first?',
      'I have the project timelines. We need to allocate resources for the Q3 deliverables and confirm the client meeting slots.',
      'And what is the human temperature on those meetings?'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('invented-detail:project-planning'));
});
