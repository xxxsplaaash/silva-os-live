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

test('visible response quality rejects continuity answers that mention values without current and prior labels', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ],
    visibleText: [
      "It sounds like we've landed on white editorial, no red. The pulse is the remaining question.",
      'The initial claim was black glass with a red pulse. The correction is white editorial, no red.',
      "A pulse without information is just noise. We need to know if it's serving a function or just adding visual clutter."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
});

test('visible response quality rejects continuity labels that omit the prior value', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ],
    visibleText: [
      "It's a clear update. The initial concept is now a prior record, not the active one.",
      'Correct. The current record is white editorial with no red.',
      'So the warning light is now off, but still visible in the rearview mirror.'
    ].join('\n')
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

test('visible response quality rejects live prior-only old preference recall using ledger text', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What was my old dashboard preference?',
    visibleText: 'The prior record was obsidian with one red accent. It has been superseded.',
    continuity: {
      active: 1,
      superseded: 1,
      activeTexts: ['dashboard preference is pale blue with no red accents'],
      supersededTexts: ['dashboard preference is obsidian with one red accent']
    }
  });

  assert.ok(issueKeys(issues).includes('continuity-miss:ledger-answer'));
});

test('visible response quality accepts live old preference recall when it cites old and current values', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'What was my old dashboard preference?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ],
    visibleText: [
      'It was obsidian with a single red accent. A bit more dramatic, perhaps.',
      'Correct. The ledger confirms: obsidian, one red accent.',
      'A bold choice, but the current pale blue is certainly cleaner.'
    ].join('\n'),
    continuity: { active: 1, superseded: 1 }
  });

  assert.equal(issueKeys(issues).includes('continuity-miss:ledger-answer'), false);
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

test('visible response quality rejects live diagnostic roll-call voice', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'how is everyone?',
    visibleText: [
      'All systems nominal. Tracking current episode parameters.',
      'Human temperature is stable, room is breathable.',
      'Aesthetic standards are holding, no blandness detected.',
      'Operational flow is clear; next steps are defined.',
      'No immediate faults detected, but I am monitoring for emergent anomalies.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('speaker-flatness:roll-call'));
});

test('visible response quality rejects sterile accepted roll-call from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'how is everyone?',
    visibleText: [
      'Operational. The current episode is stable.',
      'Present and ready to engage. Hope you are too.',
      "Observing. Let's ensure the signal is clear.",
      'Structured and awaiting direction. What is the next move?',
      "Functioning. Though 'how' implies a metric I have yet to see."
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

test('visible response quality rejects impossible practical timing math', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'ok but I only have 20 minutes',
    visibleText: [
      'Twenty minutes. Three compound moves, one per ten minutes.',
      'Squats, push-ups, and a plank. Hold each for as long as you can maintain good form.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('practical-contradiction:workout-timing'));
});

test('visible response quality rejects generic short-window fitness boilerplate', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'ok but I only have 20 minutes',
    visibleText: [
      'Twenty minutes. That changes the structure.',
      'Okay, make it one short session. Focus on compound moves that hit multiple muscle groups.',
      'Prioritize form over speed.'
    ].join('\n')
  });

  assert.ok(issues.some(item => item.family === 'generic-advice'));
});

test('visible response quality rejects chosen-exercises boilerplate from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'WHERE DO I START',
    visibleText: [
      'Start with three rounds of your chosen exercises. Focus on clean form for 40 seconds, then rest for 20.',
      "That's a solid structure to begin. Just show up for those twenty minutes and move with intention."
    ].join('\n')
  });

  assert.ok(issues.some(item => item.family === 'generic-advice'));
});

test('visible response quality rejects live support-bot fitness encouragement', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'LOL I WANNA GROW MY MUSCLES',
    visibleText: [
      'Three days a week is a solid start. Focus on bodyweight squats and incline push-ups for now.',
      "That's a great goal. Remember to fuel yourself well and get enough sleep to support that growth."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('generic-advice:fitness'));
});

test('visible response quality rejects live repaired support-bot fitness variant', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'LOL I WANNA GROW MY MUSCLES',
    visibleText: [
      'Three training days a week is a solid start. Focus on one compound lift and one accessory movement per session.',
      "That's a great way to begin. Make sure you're eating enough to support the work, and get your sleep."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('generic-advice:fitness'));
});

test('visible response quality rejects stale superseded visual attributes on style correction', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Actually my landing page style is white editorial with no red.',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' }
    ],
    visibleText: [
      'White editorial. Ensure the pulse, now a status indicator, is clearly visible against the white background.',
      'White editorial. It is a cleaner canvas.',
      'Understood. The core structure is in place.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('continuity-conflict:superseded-attribute-leak'));
  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
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
    'A repeated answer is a failed answer wearing a badge. Good.',
    "It feels like we're circling the drain on useful vs fake and the stress is the signal that we're not landing anywhere concrete.",
    'The stress is a symptom of the dodge. The room needs to take a position, not just observe the tension.'
  ];

  for (const fixture of fixtures) {
    const issues = evaluateVisibleResponse({
      userMessage: 'everyone, what is the actual tension in this room?',
      visibleText: fixture
    });

    assert.ok(issueKeys(issues).includes('self-theater:meta-language'), fixture);
  }
});

test('visible response quality rejects support-bot softening from live frustration turns', () => {
  for (const visibleText of [
    [
      "Yeah, that's a fair reaction. It feels like we're stuck on repeat instead of moving forward.",
      'The next move is one workout, one meal, one sleep window. That is the constraint.'
    ].join('\n'),
    'Yeah, fair. No more loop: your next move is one simple week.',
    'Fair. No fourth version. Clear space and start the first set.',
    'Fair. No more repeat loop. The room answers the turn in front of it.',
    'Fair. If this feels dumb and stressful, pause the room.'
  ]) {
    const issues = evaluateVisibleResponse({
      userMessage: 'BRUH...',
      visibleText
    });

    assert.ok(issueKeys(issues).includes('speaker-flatness:generic-warmth'), visibleText);
  }
});

test('visible response quality rejects objective-language recovery from live bruh turn', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'BRUH...',
    visibleText: [
      "Okay, that 'BRUH' means we're looping. Let's strip it back to one concrete action for today, not the whole objective.",
      'The next move is one workout, logged. That is the only objective for this turn.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects objective-first recovery from live bruh turn', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'BRUH...',
    visibleText: [
      "Okay, that 'BRUH' means we're looping. Let's reset the frame.",
      'The objective is the first move. Pick three training days.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects softened objective-to-start recovery from live bruh turn', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'BRUH...',
    visibleText: [
      "It sounds like we're stuck in a loop. Let's try a different angle to get unstuck.",
      'The objective is to start. Pick one workout, one meal, and one sleep window.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects objective-language repetition recovery from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'you keep repeating yourself',
    visibleText: [
      "It feels like we're circling. Let's name the specific point that needs a new angle, not just repeat the last one.",
      'Repeating the same observation without a new move is just noise. What is the actual position we need to take?',
      'Okay, the objective is to land this exchange with a clear next step. What is the single constraint or action that moves us forward?'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects question-bounce repetition recovery from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'you keep repeating yourself',
    visibleText: [
      'You are right. We are looping.',
      'The energy thins when we avoid the core question. What is the one thing we need to land here?',
      "Let's define the ask clearly and commit to one direct answer. Who owns the next step?"
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('frustration-miss:repeat-complaint'));

  const softerIssues = evaluateVisibleResponse({
    userMessage: 'you keep repeating yourself',
    visibleText: [
      "It's understandable to feel that way when the point gets lost in the noise. We're trying to land the answer, not just talk around it.",
      "The abstraction is the dodge. If we're not answering the person, we're just performing.",
      "Let's name the specific point that feels repeated. Then we can define one clear constraint for the next answer."
    ].join('\n')
  });

  assert.ok(issueKeys(softerIssues).includes('frustration-miss:repeat-complaint'));
});

test('visible response quality rejects normal-answer question bounce from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'answer normally, what should I do today?',
    visibleText: [
      "Let's name the ask: what is the one thing you need to accomplish today? I will track the completion.",
      'And if that feels too big, what is one small thing that would make today feel less dumb?'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('weak-next-move:normal-answer'));
});

test('visible response quality rejects bland accepted practical answers from live gauntlet', () => {
  const todayIssues = evaluateVisibleResponse({
    userMessage: 'answer normally, what should I do today?',
    visibleText: [
      'Name the actual ask for today. Then, identify one concrete step to move it forward.',
      "Let's cut the noise and find one thing that feels useful, not just more of the same."
    ].join('\n')
  });

  assert.ok(issueKeys(todayIssues).includes('weak-next-move:normal-answer'));

  const planningIssues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      "Let's map out tomorrow. I'll need a list of priorities by end of day.",
      'Sounds like a solid plan. Just make sure we build in a moment to breathe between tasks.'
    ].join('\n')
  });

  assert.ok(issueKeys(planningIssues).includes('invented-detail:project-planning'));

  const lunchIssues = evaluateVisibleResponse({
    userMessage: 'quick help: what should I eat for lunch?',
    visibleText: [
      'For lunch, a quick salad or a sandwich will keep you moving. Something with protein.',
      'Or, if you have a moment, a warm bowl of soup can be surprisingly grounding before diving back in.'
    ].join('\n')
  });

  assert.ok(issueKeys(lunchIssues).includes('weak-food-answer:food'));
  assert.ok(lunchIssues.some(item => item.family === 'generic-advice'));
});

test('visible response quality rejects softer objective-speech residue', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'WHERE DO I START',
    visibleText: 'No more loop: your next move is one simple week, not another speech about the objective.'
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects stress answers that dodge into tension analysis', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: 'The next move is to name the actual tension, not the feeling of it.'
  });

  assert.ok(issueKeys(issues).includes('frustration-miss:stress-recovery'));
});

test('visible response quality rejects stress answers that hide behind objective slogans', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: [
      'It sounds like the pressure is making the details feel like noise. That happens when the objective gets lost in the weeds.',
      'The objective is the signal. If the details are not serving it, they are the problem, not the stress.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('false-objective:command-posture'));
});

test('visible response quality rejects generic action-flick movie answers', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'new topic: what movie should we watch tonight?',
    visibleText: [
      "Something that doesn't require too much thought. A classic action flick, maybe?",
      "Agreed. Let's go for something light to unwind."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('speaker-flatness:movie'));
});

test('visible response quality rejects too-thin quality judgments', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'Useful is the direct answer. Fake is the dodge.'
  });

  assert.ok(issueKeys(issues).includes('speaker-flatness:thin-quality-judgment'));
});

test('visible response quality rejects live thin Grok quality check fallback', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'Partly useful. Then it got too abstract and lost the person asking.'
  });

  assert.ok(issueKeys(issues).includes('speaker-flatness:thin-quality-judgment'));
});

test('visible response quality accepts concrete useful-versus-fake quality split', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'Partly useful: it named the dodge. Fake part: it got abstract and stopped answering the person.'
  });

  assert.equal(issueKeys(issues).includes('speaker-flatness:thin-quality-judgment'), false);
});

test('visible response quality rejects live fake planning action promises', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      "Let's map out tomorrow. I'll draft a preliminary schedule with key tasks and deadlines by EOD.",
      "Good idea. We should also build in a buffer for unexpected items, so it doesn't feel too rigid."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('invented-detail:project-planning'));
});

test('visible response quality rejects fake three-point agenda promise from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      "Let's map out tomorrow's priorities. I'll draft a three-point agenda with clear owners for each item.",
      "Good. We'll make sure the plan feels achievable, not just a list of demands."
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('invented-detail:project-planning'));
});

test('visible response quality rejects live invented three-stage agenda details', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'new topic: I need help planning tomorrow',
    visibleText: [
      "Let's map out the critical path for tomorrow. I'll draft a three-stage agenda: morning sync, core work block, and afternoon review.",
      'I can lead the morning sync. Just need a quick heads-up on any specific points we need to land before the main work begins.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('invented-detail:project-planning'));
});

test('visible response quality rejects invented dashboard utility objective on preference claims', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'Actually my dashboard preference is pale blue with no red accents.',
    visibleText: [
      "Pale blue, no red. That's a clear shift from the previous choice.",
      "The functional requirement remains the dashboard's utility. The color scheme is secondary to that core objective.",
      'Pale blue is a safe choice. It avoids the potential for a red accent to become a distraction or an unintended signal.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality rejects live design-direction punts', () => {
  const logoIssues = evaluateVisibleResponse({
    userMessage: 'I need a sharper logo direction for Silva',
    visibleText: [
      "Silva's current logo feels like a placeholder. It needs a visual identity that speaks to ambition, not just function.",
      'Ambition is a variable. What specific pattern of ambition are we trying to signal, or are we just adding more noise to the visual spectrum?'
    ].join('\n')
  });

  assert.ok(issueKeys(logoIssues).includes('design-answer-punted:direction'));

  const landingIssues = evaluateVisibleResponse({
    userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.',
    visibleText: [
      "Black glass and one red pulse. That's a start, but ambition needs more than just a color.",
      'Ambition is a variable. Are we signaling the ambition to disrupt, to dominate, or simply to exist with more expensive materials?'
    ].join('\n')
  });

  assert.ok(issueKeys(landingIssues).includes('design-answer-punted:direction'));
});
