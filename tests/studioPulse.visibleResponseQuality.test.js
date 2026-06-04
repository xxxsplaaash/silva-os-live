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

test('visible response quality rejects fake surface translation and update promises', () => {
  const fixtures = [
    'We can translate that into the interface across the landing page.',
    'We can carry that into the dashboard visuals.',
    'That will carry through the hero and product pages.',
    'We will apply that aesthetic across the site.',
    'I can update the page to match that direction.'
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

test('visible response quality rejects old preference recall answers that only cite current record', () => {
  const recentTurns = [
    { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
    { speakerId: 'aisha', role: 'primary', text: 'Obsidian with one red accent. Noted.' },
    { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' },
    { speakerId: 'aisha', role: 'primary', text: 'Current record is pale blue with no red accents. Prior record was obsidian with one red accent.' }
  ];

  for (const userMessage of [
    'What was my old dashboard preference?',
    'What was my original dashboard preference?',
    'What was my earlier dashboard preference?',
    'What did I used to want for the dashboard?'
  ]) {
    const issues = evaluateVisibleResponse({
      userMessage,
      recentTurns,
      visibleText: 'Your dashboard preference is pale blue with no red accents.',
      continuity: { active: 1, superseded: 1 }
    });

    assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'), userMessage);
  }
});

test('visible response quality rejects old preference recall answers that omit the active record', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What was my old dashboard preference?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ],
    visibleText: 'Obsidian with one red accent.',
    continuity: { active: 1, superseded: 1 }
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
});

test('visible response quality rejects sterile roll-call monitoring voice', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'how is everyone?',
    visibleText: [
      'Present. Focused on the current objective.',
      'Here and ready. Just checking the temperature.',
      "Present. Observing the room's current state.",
      'Operational. Ready for the next step.',
      'Here. Monitoring for anomalies.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('speaker-flatness:roll-call'));
});

test('visible response quality rejects thin next-action non-answers', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'answer normally, what should I do today?',
    visibleText: 'The ask is to move forward. Name one thing you need to do next, and do it.'
  });

  assert.ok(issueKeys(issues).includes('weak-next-move:normal-answer'));
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

test('visible response quality rejects continuity answers from the wrong claim pair', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
      { speakerId: 'aisha', role: 'primary', text: 'landing page style is white editorial with no red. Noted.' }
    ],
    visibleText: 'Changed: active preference is pale blue with no red accents. Prior record: obsidian with one red accent.'
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
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

test('visible response quality rejects live planning invention and sterile execution voice', () => {
  const planningIssues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      "Let's outline tomorrow's priorities. What are the critical items we need to address first?",
      "I have a draft schedule based on today's outcomes. We need to confirm the key deliverables for the morning session.",
      "Before we dive into specifics, let's ensure everyone's energy levels are accounted for. Any immediate needs or concerns for tomorrow?"
    ].join('\n')
  });

  assert.ok(issueKeys(planningIssues).includes('invented-detail:project-planning'));

  const foodIssues = evaluateVisibleResponse({
    userMessage: 'I am hungry before training, what should I eat?',
    visibleText: [
      'Eat something simple. A banana and a handful of almonds if training is immediate.',
      'Sustenance is a parameter, not a performance art. Execute.'
    ].join('\n')
  });

  assert.ok(issueKeys(foodIssues).includes('self-theater:meta-language'));
});

test('visible response quality rejects room self-review language from live repairs', () => {
  const fixtures = [
    'The tension is simple: this room wants to be useful without shrinking into customer support.',
    'The weak point is the polished dodge. Useful beats impressive here.',
    'The constraint is useful. It removes theatrical planning.',
    'Do the first block before reopening the debate. Evidence beats another round of room theatre.',
    'A repeated answer is a failed answer wearing a badge. Good.'
  ];

  for (const fixture of fixtures) {
    const issues = evaluateVisibleResponse({
      userMessage: 'everyone, what is the actual tension in this room?',
      visibleText: fixture
    });

    assert.ok(issueKeys(issues).includes('self-theater:meta-language'), fixture);
  }
});
