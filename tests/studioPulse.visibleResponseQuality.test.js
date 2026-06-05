const test = require('node:test');
const assert = require('node:assert/strict');

const {
  blindAttributionForLine,
  evaluateBlindAttributionLines,
  evaluateVisibleResponse
} = require('../lib/studio/socialDirector/visibleResponseQuality');

function issueKeys(issues) {
  return issues.map(item => `${item.family}:${item.category}`);
}

test('blind attribution scores alive room lines as distinct characters without labels', () => {
  const fixtures = [
    ['aisha', 'Prior record: black glass with one red pulse. Current record: white editorial with no red.'],
    ['vanya', 'Good. Tiny vanity, massive discipline. We can work with that.'],
    ['vanya', 'Same twenty minutes, cleaner shape: warm up, run the clock, write one number down.'],
    ['vanya', 'There is warmth in the room, but nobody gets to drift past the actual claim.'],
    ['leah', 'Pick the feeling first. The title is just the room admitting what mood it wants.'],
    ['claudia', 'Start with three 20-minute sessions: push, squat, hinge, row. Same days every week.'],
    ['claudia', 'For lunch, eat something boring enough to work: rice and chicken, eggs and toast, a sandwich, or leftovers with water.'],
    ['grok', 'Sharp joint pain means swap the move, not prove a point. Soreness is allowed.'],
    ['grok', 'Track reps. Otherwise you are just sweating with narrative ambition.']
  ];

  for (const [speakerId, text] of fixtures) {
    const attribution = blindAttributionForLine(text);
    assert.equal(attribution.identifiable, true, text);
    assert.equal(attribution.speakerId, speakerId, `${text}: ${JSON.stringify(attribution.scores)}`);
  }
});

test('blind attribution rejects valid-sounding lines that could belong to anyone', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'vanya', text: 'That is a helpful direction. We should move forward with a clear and balanced response.' },
    { speakerId: 'claudia', text: 'This is a good starting point. Focus on the basics and keep improving over time.' }
  ]);

  assert.equal(attribution.ok, false);
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:blind-attribution'));
});

test('blind attribution rejects short generic filler that only works with a visible speaker label', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'vanya', text: 'Fair enough.' },
    { speakerId: 'claudia', text: 'Good point.' },
    { speakerId: 'grok', text: 'Makes sense.' },
    { speakerId: 'leah', text: 'Okay.' }
  ]);

  assert.equal(attribution.ok, false);
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:blind-attribution'));
});

test('blind attribution rejects single weak voice-token filler as label-dependent', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'vanya', text: 'Fair enough.' },
    { speakerId: 'vanya', text: 'Room breathes.' }
  ]);

  assert.equal(attribution.ok, false);
  assert.equal(attribution.results[0].identifiable, false);
  assert.equal(attribution.results[1].identifiable, false);
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:blind-attribution'));
});

test('blind attribution keeps public fallback movie, food, and design lines speaker-identifiable', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'grok', text: 'Protein helps later. Right now the question is whether the food lets you move without feeling heavy.' },
    { speakerId: 'vanya', text: 'Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or The Menu if you want bite.' },
    { speakerId: 'leah', text: 'One strong world, not wallpaper. Pick the one that matches the room temperature.' },
    { speakerId: 'grok', text: 'Three clean options means the premise is solved. Arguing longer is just random taste noise.' },
    { speakerId: 'claudia', text: 'Direction: make the hero quiet, the CTA obvious, and the red accent do one job. If it appears everywhere, it stops meaning anything.' },
    { speakerId: 'vanya', text: 'That keeps it premium instead of generic SaaS. The room should feel intentional before it feels busy.' }
  ]);

  assert.equal(attribution.ok, true);
  assert.deepEqual(attribution.results.map(item => item.speakerId), ['grok', 'vanya', 'leah', 'grok', 'claudia', 'vanya']);
});

test('blind attribution rejects confident borrowed-voice lines without using labels as evidence', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'vanya', text: 'Start with three 20-minute sessions: push, squat, hinge, row. Same days every week.' },
    { speakerId: 'claudia', text: 'Good. Tiny vanity, massive discipline. We can work with that.' }
  ]);

  assert.equal(attribution.ok, false);
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:wrong-attribution'));
});

test('blind attribution rejects live short-session Vanya line that ties with Claudia', () => {
  const attribution = evaluateBlindAttributionLines([
    { speakerId: 'vanya', text: 'Same twenty minutes, cleaner shape: one short training session, no heroic rebrand, leave while the body still trusts it.' },
    { speakerId: 'vanya', text: 'Same twenty minutes, new shape: stop asking for permission and run the clock. Two minutes warm, sixteen minutes work, two minutes notes.' },
    { speakerId: 'vanya', text: 'Fair. Ten minutes: drink water, clear one surface, then choose the smallest next task.' },
    { speakerId: 'claudia', text: 'Current record first; prior record still visible. No quiet rewrite.' }
  ]);

  assert.equal(attribution.ok, false);
  assert.equal(attribution.results[0].identifiable, false);
  assert.notEqual(attribution.results[1].speakerId, 'vanya');
  assert.equal(attribution.results[2].identifiable, false);
  assert.notEqual(attribution.results[3].speakerId, 'claudia');
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:blind-attribution'));
  assert.ok(issueKeys(attribution.issues).includes('speaker-flatness:wrong-attribution'));
});

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

test('visible response quality rejects episode-candidate roll-call from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'how is everyone?',
    visibleText: [
      'Operational. The current focus is on the episode candidate.',
      "Present and tracking the room's energy. It feels ready for the next phase.",
      'As sharp as ever. Waiting to see if anything interesting emerges.',
      'Structured and ready for the next operational step. What is the immediate priority?',
      "Observing. The premise of 'how is everyone' is broad, but the data suggests functional."
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

test('visible response quality rejects ignored referenced fitness follow-up', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'turn that into a 20 minute version',
    visibleText: [
      'Hey. The room is here; nobody has to earn a voice before speaking.',
      'Thank God. I was getting bored of pretending silence means absence.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('topic-ignored:referenced-fitness'));
});

test('visible response quality rejects repeated short-session answer lines', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'ok but I only have 20 minutes',
    recentTurns: [
      { speakerId: 'vanya', role: 'primary', text: 'Tiny vanity, clean discipline. Twenty minutes of training, small enough to finish and real enough that you feel it tomorrow.' },
      { speakerId: 'claudia', role: 'side', text: 'Do three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.' }
    ],
    visibleText: [
      'Tiny vanity, clean discipline. Twenty minutes of training, small enough to finish and real enough that you feel it tomorrow.',
      'Do three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('repetition:recent-line'));
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

test('visible response quality rejects sustainable-routine objective drift from live gauntlet', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'WHAT IS THE OBJECTIVE?',
    visibleText: [
      'The objective is to establish a sustainable routine. Start with three sessions this week, focusing on the listed movements and tracking your progress.',
      "It's about building a habit that fits your life, not forcing a change. The goal is showing up and moving, then building from there."
    ].join('\n')
  });

  assert.ok(issues.some(item => item.family === 'generic-advice'));

  const timerIssues = evaluateVisibleResponse({
    userMessage: 'WHAT IS THE OBJECTIVE?',
    visibleText: [
      'The objective is to complete the workout within your 20-minute window. Focus on the four moves provided and run the timer.',
      'Stop negotiating with the clock. The objective is movement, not a perfect plan.'
    ].join('\n')
  });

  assert.ok(issueKeys(timerIssues).includes('false-objective:command-posture'));
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

  const liveLoopClearIssues = evaluateVisibleResponse({
    userMessage: 'you keep repeating yourself',
    visibleText: [
      "The loop is clear. Let's reset.",
      'Repeating is just another way to dodge. The energy thins when we refuse to land the point.',
      "The user is stressed. Let's pick one topic and give a single, actionable step for it."
    ].join('\n')
  });

  assert.ok(issueKeys(liveLoopClearIssues).includes('frustration-miss:repeat-complaint'));
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

  const acceptedNormalMiss = evaluateVisibleResponse({
    userMessage: 'answer normally, what should I do today?',
    visibleText: [
      'Pick one thing. Today, focus on getting one hour of focused work done on a single project.',
      "It's okay to feel that way. Let's just get one thing done, then we can see where we are."
    ].join('\n')
  });

  assert.ok(issueKeys(acceptedNormalMiss).includes('weak-next-move:normal-answer'));
  assert.ok(issueKeys(acceptedNormalMiss).includes('speaker-flatness:generic-warmth'));

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

  const signalIssues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: [
      "It's understandable to feel that way when the goal is clarity, not just noise. Let's keep the signal clean.",
      'The feeling is a symptom of the ask. The room needs a position, not a process explanation.'
    ].join('\n')
  });

  assert.ok(issueKeys(signalIssues).includes('frustration-miss:stress-recovery'));

  const burdenShiftIssues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: [
      "It feels dumb because we're circling the same point without landing it. Let's name the actual problem, not the dodge around it.",
      'The problem is the gap between wanting to be direct and performing it. One clean constraint: state the core claim, then the next move.'
    ].join('\n')
  });

  assert.ok(issueKeys(burdenShiftIssues).includes('frustration-miss:stress-recovery'));

  const thinRecoveryIssues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: 'Fair. This got too abstract.'
  });

  assert.ok(issueKeys(thinRecoveryIssues).includes('frustration-miss:stress-recovery'));

  const liveRoomTheatreIssues = evaluateVisibleResponse({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: [
      'Fair. No more room-theatre: do one small useful thing for ten minutes, then stop and check the result.',
      'Today that means one block, one visible output, no essay about the process.'
    ].join('\n')
  });

  assert.ok(issueKeys(liveRoomTheatreIssues).includes('self-theater:meta-language'));
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

  const liveDodgeIssues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'It was useful. The dodge is the problem, not the directness.'
  });

  assert.ok(issueKeys(liveDodgeIssues).includes('speaker-flatness:thin-quality-judgment'));

  const binaryDodgeIssues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'The question implies a binary of useful or fake. The real tension is whether the statement landed as intended, or if the room needed a different kind of signal entirely.'
  });

  assert.ok(issueKeys(binaryDodgeIssues).includes('speaker-flatness:thin-quality-judgment'));

  const tasteDodgeIssues = evaluateVisibleResponse({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'It was direct. Whether that translates to useful is a matter of taste, not mechanics.'
  });

  assert.ok(issueKeys(tasteDodgeIssues).includes('speaker-flatness:thin-quality-judgment'));
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

test('visible response quality rejects room-product narration inside visible character dialogue', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'how is everyone?',
    visibleText: [
      'The public room is live; continuity, status, and contradictions surface as the exchange lands.',
      'The room will carry the continuity while the characters respond dynamically.'
    ].join('\n')
  });

  assert.ok(issueKeys(issues).includes('self-theater:meta-language'));
});

test('visible response quality accepts alive practical room dialogue without generic advice voice', () => {
  const issues = evaluateVisibleResponse({
    userMessage: 'I wanna grow my muscles.',
    visibleText: [
      'Good. Tiny vanity, massive discipline. We can work with that.',
      'Start with three 20-minute sessions: push, squat, hinge, row. Same days every week.',
      'Track reps. Otherwise you are just sweating with narrative ambition.'
    ].join('\n')
  });

  assert.deepEqual(issueKeys(issues), []);
});
