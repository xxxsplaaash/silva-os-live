const { CHARACTERS } = require('./systemContext');

function structured(title, summary, lead, leadPerspective, supportingLead = '', supportingPerspective = '', actions = [], checks = [], assets = [], ideas = [], meta = {}) {
  return { title, summary, lead, leadPerspective, supportingLead, supportingPerspective, actions, consistencyChecks: checks, suggestedAssets: assets, promptIdeas: ideas, meta };
}

function clarificationResponse(question = '', system = {}) {
  const previous = system.recentQuestions?.[0]?.q || '';
  return structured(
    'Studio response',
    'That question is incomplete, so I need one more detail before I answer cleanly.',
    'studio',
    previous ? `Your last question was “${previous}”. Finish the thought or ask it directly in one line.` : 'Ask the full question in one line so Studio Pulse can answer precisely.',
    '', '',
    ['Rewrite the question in one complete sentence.', 'If this is a follow-up, include the missing subject or comparison.'],
    ['Do not guess from a broken fragment when the request is too incomplete.'],
    [], [], { clarification: true }
  );
}

function getDeterministicStudioResponse(question = '', mode = 'direction', counts = {}, system = {}) {
  const q = String(question || '').toLowerCase().trim();
  const chars = Object.values(system.characters || CHARACTERS);

  if (!q) return null;

  if (/how many characters|how many team members|how many people/.test(q)) {
    return structured('Studio response', `There are ${chars.length} core characters in the system.`, 'studio', chars.map(c => c.name).join(', '));
  }
  if (/vanya.*surname|what is vanya'?s surname/.test(q)) {
    return structured('Studio response', 'Vanya’s surname is Khumalo.', 'vanya', 'Vanya Khumalo is the people-and-culture character.');
  }
  if (/oldest/.test(q)) {
    const oldest = [...chars].sort((a,b)=>(b.age||0)-(a.age||0))[0];
    return structured('Studio response', `${oldest.name} is the oldest character currently defined.`, oldest.id, `${oldest.name} is ${oldest.age} and reads as the most senior-energy profile.`);
  }
  if (/smartest|most analytical|most technical/.test(q)) {
    return structured('Studio response', 'Grok / Gerhard is the smartest in raw technical and systems terms.', 'grok', 'Grok owns automation, systems, and technical architecture.', 'claudia', 'Claudia is the strongest operational thinker, but Grok is the clearest technical brain.');
  }
  if (/serious|most serious|most composed/.test(q)) {
    return structured('Studio response', 'Claudia is the serious one in the team.', 'claudia', 'Claudia owns structure, delivery, and composure under pressure.', 'grok', 'Grok is focused and intense, but Claudia is the steadier serious presence.');
  }
  if (/focused|most focused/.test(q)) {
    return structured('Studio response', 'Grok is the most focused character.', 'grok', 'He is built around locked-in technical attention and system pressure.', 'claudia', 'Claudia is the most disciplined operator, but Grok reads as the most intensely focused.');
  }
  if (/trendiest|most stylish/.test(q)) {
    return structured('Studio response', 'Leah is the trendiest character.', 'leah', 'Leah owns taste, trend analysis, and creative direction.', 'vanya', 'Vanya is cooler socially, but Leah is stronger on trend and style judgment.');
  }
  if (/coolest/.test(q)) {
    return structured('Studio response', 'Vanya is the coolest in the team.', 'vanya', 'Vanya owns social instinct, warmth, magnetism, and relaxed confidence.', 'leah', 'Leah is sharper on trend and taste, but Vanya feels coolest socially.');
  }
  if (/funniest/.test(q)) {
    return structured('Studio response', 'Vanya is the funniest character.', 'vanya', 'Her lane is social warmth and human energy, so humour lands most naturally with her.', 'grok', 'Grok can be dry-funny, but Vanya is the most naturally funny.');
  }
  if (/pizza|likes pizza/.test(q)) {
    return structured('Studio response', 'That is not a canonical system fact yet.', 'studio', 'Studio Pulse can infer roles and strengths, but food preferences should be treated as creative defaults unless you explicitly define them.');
  }
  if (q.includes('home') || q.includes('room') || q.includes('outfit') || q.includes('car') || q.includes('phone') || q.includes('item') || mode === 'assets' || mode === 'consistency') {
    return structured(
      'Studio response',
      'Expand the Home System into a consistency engine and keep item refs selective.',
      'claudia',
      'Track environments, outfits, and important items separately so they can be attached when relevant, not everywhere.',
      'leah',
      'Only surface the assets that actually improve the generation. Do not let phone or car refs become automatic props.',
      ['Upload room-by-room home references.', 'Add outfit sets as optional consistency anchors.', 'Store phone, car, bag, laptop, and other unique items as selective refs.'],
      ['Do not auto-insert item refs into every prompt.', 'Keep environment refs separate from outfit refs.', 'Make Gallery the place where drift is reviewed.'],
      ['Living room', 'Bedroom', 'Workspace', 'Outfit sets', 'Phone', 'Car'],
      ['Use home refs only for domestic or casual scenes.', 'Use item refs only when the prompt explicitly benefits from the object.']
    );
  }
  if (q.includes('prompt') || q.includes('generator') || q.includes('caption') || mode === 'prompt') {
    return structured(
      'Studio response',
      'Tighten prompts, remove noise, and keep the generator selective.',
      'leah',
      'Prompts should feel specific, real, and intentional — not overloaded.',
      'grok',
      'Treat references as optional attachments, not automatic prompt bloat.',
      ['Shorten the generator output where possible.', 'Add a selective consistency recommendation block.', 'Keep captions and prompt kits aligned but separate.'],
      ['Do not over-describe props.', 'Do not over-force house, car, or phone into the prompt.', 'Keep the prompt grounded in scene + identity + mood.'],
      ['Outfit sets', 'Environment refs', 'Signature accessories'],
      ['Add a “Use these refs if relevant” block instead of auto-inserting objects.', 'Suggest references based on scene type.']
    );
  }
  return null;
}

function fallbackStudioResponse(system = {}) {
  return structured(
    'Studio response',
    system.promptCount || system.galleryCount
      ? `The studio is stable. There are ${system.promptCount || 0} prompts and ${system.galleryCount || 0} gallery outputs to build from.`
      : 'The studio is stable and ready for direction.',
    'studio',
    'Keep the product prompt-first and consistency-aware.',
    '', '',
    ['Use Studio Pulse for direction, not chat.', 'Use Home System for environments, outfits, and unique items.', 'Review Gallery after generation and feed the findings back into future prompts.'],
    ['One AI surface for studio guidance.', 'No chat feed.', 'No forced item refs.'],
    ['Home rooms', 'Outfit sets', 'Unique items']
  );
}

module.exports = { getDeterministicStudioResponse, fallbackStudioResponse, clarificationResponse };
