const {
  statements,
  nowIso,
  normalizeGallery,
  normalizePlanner,
  normalizePrompt,
  normalizeStudioPulseAsset,
  normalizeStudioPulseWorkflow,
  getStudioPulseAssets,
  getStudioPulseAssetById,
  getStudioPulseWorkflows,
  getStudioPulseWorkflowById
} = require('../../db/sqlite');

function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    for (const key of ['text', 'summary', 'message', 'note', 'content', 'title']) {
      const found = textValue(value[key]);
      if (found) return found;
    }
  }
  return String(value).trim();
}

function compact(value = '', max = 220) {
  const text = textValue(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function attachmentKindFromInput(item = {}) {
  const mime = String(item.mimeType || item.mime_type || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  if (mime.startsWith('image/') || String(item.dataUrl || item.previewUrl || '').startsWith('data:image/')) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('text/') || /\.(txt|md|markdown|json|csv|tsv|caption)$/i.test(name)) return 'text';
  return 'file';
}

function decodeDataUrlText(dataUrl = '') {
  const raw = String(dataUrl || '');
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return '';
  const mime = String(match[1] || '').toLowerCase();
  if (!(mime.startsWith('text/') || /json|csv|xml|javascript|markdown/.test(mime))) return '';
  try {
    return Buffer.from(match[2], 'base64').toString('utf8');
  } catch (err) {
    return '';
  }
}

function workflowClassForIntent(intent = '') {
  const activeIntent = String(intent || '').trim().toLowerCase();
  if (activeIntent === 'analyze-media') return 'analysis';
  if (['plan-post', 'make-image', 'plan-calendar', 'plan-event', 'commit-plan'].includes(activeIntent)) return 'committable';
  return 'room-chat';
}

function isCommittableWorkflowIntent(intent = '') {
  return workflowClassForIntent(intent) === 'committable';
}

function inferWorkflowIntent({ question = '', explicitIntent = '', attachments = [], commitRequested = false } = {}) {
  if (commitRequested) return 'commit-plan';
  const explicit = String(explicitIntent || '').trim().toLowerCase();
  if (explicit) return explicit;
  const q = String(question || '').trim().toLowerCase();
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (/\b(commit|lock it|ship it|do it now|confirm plan|commit this)\b/.test(q)) return 'commit-plan';
  if (hasAttachments && /\b(analy[sz]e|describe|read|review|inspect|extract|look at|look through)\b/.test(q)) return 'analyze-media';
  if (/\b(make|generate|create)\b.*\b(image|visual|poster|cover|post|render)\b|\b(image|visual|poster|cover|post|render)\b.*\b(make|generate|create)\b/.test(q)) return 'make-image';
  if (
    /\b(plan|draft|write|stage|schedule)\b.*\b(post|caption|campaign|content|launch)\b/.test(q)
    || /\b(post|caption|campaign|content)\b.*\b(plan|draft|write|stage|schedule)\b/.test(q)
    || /\b(content calendar|content plan|campaign plan|post plan)\b/.test(q)
    || /\b(draft a caption|write a caption|caption this|caption for)\b/.test(q)
  ) return 'plan-post';
  if (/\b(event|shoot|activation|appearance|booking)\b/.test(q)) return 'plan-event';
  if (/\b(calendar|schedule|scheduled|slot|next thursday|next monday|next tuesday|next wednesday|next friday|next saturday|next sunday)\b/.test(q)) return 'plan-calendar';
  return 'room-chat';
}

function extractChannel(question = '') {
  const q = String(question || '').toLowerCase();
  if (/\binstagram|ig\b/.test(q)) return 'instagram';
  if (/\btiktok\b/.test(q)) return 'tiktok';
  if (/\blinkedin\b/.test(q)) return 'linkedin';
  if (/\btwitter\b|\bx\b/.test(q)) return 'x';
  if (/\bfacebook\b/.test(q)) return 'facebook';
  if (/\bemail|newsletter\b/.test(q)) return 'email';
  if (/\bwebsite|site|landing page\b/.test(q)) return 'website';
  return '';
}

function extractTimingHint(question = '') {
  const q = String(question || '').trim();
  const patterns = [
    /\b(today|tomorrow|tonight|this week|next week|this month|next month)(?:\s+(morning|afternoon|evening|night))?\b/i,
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(morning|afternoon|evening|night))?\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(morning|afternoon|evening|night))?\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i
  ];
  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match) return match[0];
  }
  return '';
}

function extractAudience(question = '') {
  const raw = String(question || '').trim();
  const q = raw.toLowerCase();
  const patternMatches = [
    [/\byoung\s+(joburg|johannesburg)\s+creatives\b/i, 'young Joburg creatives'],
    [/\b(joburg|johannesburg)\s+creatives\b/i, 'Joburg creatives'],
    [/\byoung\s+creatives\b/i, 'young creatives'],
    [/\bcontent\s+creators?\b/i, 'content creators'],
    [/\bcreatives?\b/i, 'creatives'],
    [/\bstudents?\b/i, 'students'],
    [/\bfounders?\b/i, 'founders'],
    [/\bclients?\b/i, 'clients'],
    [/\bteam|internal\b/i, 'internal team'],
    [/\bleadership|board\b/i, 'leadership'],
    [/\bfollowers|community\b/i, 'community']
  ];
  for (const [pattern, value] of patternMatches) {
    if (pattern.test(raw)) return value;
  }
  const forMatch = raw.match(/\bfor\s+(.+?)(?=\s+(?:on|by|next|this|with|using|via|around|before|after|during|about|and\s+(?:schedule|plan|make|create|generate))\b|[,.!?]|$)/i);
  if (forMatch) {
    const cleaned = String(forMatch[1] || '')
      .replace(/^(the|an|a)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned && cleaned.split(/\s+/).length <= 6 && !/\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/i.test(cleaned)) {
      return cleaned;
    }
  }
  if (/\baudience\b/.test(q)) return 'audience';
  return '';
}

function extractPriority(question = '') {
  const q = String(question || '').toLowerCase();
  if (/\burgent|asap|today|immediately|now\b/.test(q)) return 'high';
  if (/\bthis week|next\b/.test(q)) return 'medium';
  return 'normal';
}

function deriveWorkflowOwner(intent = '') {
  switch (String(intent || '').trim().toLowerCase()) {
    case 'make-image': return 'leah';
    case 'plan-post': return 'claudia';
    case 'plan-calendar': return 'claudia';
    case 'plan-event': return 'vanya';
    case 'analyze-media': return 'grok';
    default: return 'aisha';
  }
}

function firstImageAttachment(attachments = []) {
  return (Array.isArray(attachments) ? attachments : []).find(item => String(item.kind || '').toLowerCase() === 'image') || null;
}

function firstTextAttachment(attachments = []) {
  return (Array.isArray(attachments) ? attachments : []).find(item => {
    const kind = String(item.kind || '').toLowerCase();
    return kind === 'text' || (kind === 'pdf' && textValue(item.textExtract || '').trim());
  }) || null;
}

function deriveWorkflowBrief({ intent = '', question = '', attachments = [], existing = {}, system = {} } = {}) {
  const existingBrief = existing && typeof existing === 'object' ? existing : {};
  const textAttachment = firstTextAttachment(attachments);
  const imageAttachment = firstImageAttachment(attachments);
  const summary = compact(question || textAttachment?.textExtract || imageAttachment?.name || existingBrief.summary || '', 240);
  const timingHint = extractTimingHint(question) || existingBrief.timingHint || '';
  const channel = extractChannel(question) || existingBrief.channel || '';
  const audience = extractAudience(question) || existingBrief.audience || '';
  const priority = extractPriority(question) || existingBrief.priority || 'normal';
  const owner = existingBrief.owner || deriveWorkflowOwner(intent);
  const subject = existingBrief.subject || compact(question || imageAttachment?.name || textAttachment?.name || '', 120);
  const visualDirection = existingBrief.visualDirection || compact(question || imageAttachment?.name || '', 160);
  const outputPurpose = existingBrief.outputPurpose || (
    /post|instagram|campaign|caption|cover|poster/i.test(question) ? 'social post support' : 'studio visual development'
  );
  const contentType = existingBrief.contentType || (
    /caption|carousel|thread|video|reel|post/i.test(question) ? compact((question.match(/\b(caption|carousel|thread|video|reel|post)\b/i) || [])[0] || 'post', 40) : ''
  );
  const objective = existingBrief.objective || compact(question || textAttachment?.textExtract || '', 180);
  const deliverable = existingBrief.deliverable || (
    String(intent) === 'plan-event' ? 'event plan' : String(intent) === 'plan-calendar' ? 'calendar slot' : String(intent) === 'make-image' ? 'image output' : 'post plan'
  );
  const promptText = existingBrief.promptText
    || (String(intent) === 'make-image'
      ? compact(`Create a ${outputPurpose} image for ${subject || 'the current brief'}. Visual direction: ${visualDirection || 'use the references and keep it on-brand'}.`, 340)
      : compact(`Plan a ${contentType || 'post'} for ${channel || 'the appropriate channel'} with this angle: ${summary || question}.`, 340));
  return {
    summary,
    title: existingBrief.title || compact(summary || `${intent} draft`, 80),
    channel,
    audience,
    timingHint,
    priority,
    owner,
    subject,
    visualDirection,
    outputPurpose,
    contentType,
    objective,
    deliverable,
    promptText,
    refs: attachments.map(item => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      source: item.source
    })),
    context: {
      pulseHomes: Object.keys(system.pulseHomes || {}).length,
      assetRefs: Object.keys(system.assetRefs || {}).length,
      plannerPosts: Array.isArray(system.plannerPosts) ? system.plannerPosts.length : 0,
      gallery: Array.isArray(system.galleryItems) ? system.galleryItems.length : 0,
      prompts: Array.isArray(system.promptItems) ? system.promptItems.length : 0,
      reviewEvents: Array.isArray(system.reviewItems) ? system.reviewItems.length : 0
    }
  };
}

function workflowSteps(intent = '', brief = {}) {
  const owner = brief.owner || deriveWorkflowOwner(intent);
  switch (String(intent || '').trim().toLowerCase()) {
    case 'analyze-media':
      return ['Read the upload cleanly', 'Surface the useful signal', 'Turn the read into next-step direction'];
    case 'make-image':
      return ['Lock the image brief', 'Use refs where relevant', 'Generate through Gemini image', 'Save output to Gallery'];
    case 'plan-post':
      return ['Turn the brief into a post angle', 'Assign the right owner', 'Stage timing and channel', 'Save the plan into Planner'];
    case 'plan-calendar':
      return ['Choose the slot', 'Define the content type', `Assign ${owner}`, 'Save the calendar move into Planner'];
    case 'plan-event':
      return ['Define the event objective', 'Lock the deliverable', `Assign ${owner}`, 'Save the event plan into Planner'];
    default:
      return ['Clarify the brief', 'Decide the next move'];
  }
}

function workflowOutputs(intent = '', brief = {}) {
  switch (String(intent || '').trim().toLowerCase()) {
    case 'make-image':
      return [{ type: 'gallery', label: brief.title || 'Generated image' }, { type: 'prompt', label: 'Image prompt draft' }];
    case 'plan-post':
      return [{ type: 'planner', label: brief.title || 'Post plan' }, { type: 'prompt', label: 'Prompt or caption draft' }];
    case 'plan-calendar':
      return [{ type: 'planner', label: brief.title || 'Calendar slot' }];
    case 'plan-event':
      return [{ type: 'planner', label: brief.title || 'Event plan' }];
    case 'analyze-media':
      return [{ type: 'analysis', label: brief.title || 'Media read' }];
    default:
      return [];
  }
}

function workflowMissingFields(intent = '', brief = {}, attachments = []) {
  const needed = [];
  const activeIntent = String(intent || '').trim().toLowerCase();
  if (activeIntent === 'plan-post') {
    if (!brief.channel) needed.push('channel');
    if (!brief.audience) needed.push('audience');
    if (!brief.timingHint) needed.push('timing');
    if (!brief.summary) needed.push('angle');
  }
  if (activeIntent === 'make-image') {
    if (!brief.subject && !attachments.length) needed.push('subject');
    if (!brief.visualDirection) needed.push('visual direction');
    if (!brief.outputPurpose) needed.push('output purpose');
  }
  if (activeIntent === 'plan-calendar') {
    if (!brief.timingHint) needed.push('date or slot');
    if (!brief.contentType) needed.push('content type');
  }
  if (activeIntent === 'plan-event') {
    if (!brief.objective) needed.push('objective');
    if (!brief.deliverable) needed.push('deliverable');
    if (!brief.timingHint) needed.push('timing');
  }
  return needed;
}

function buildCommitCard(workflowDraft = null) {
  if (!workflowDraft || typeof workflowDraft !== 'object') return null;
  if (!isCommittableWorkflowIntent(workflowDraft.intent)) return null;
  const missingFields = Array.isArray(workflowDraft.missingFields) ? workflowDraft.missingFields : [];
  const ready = missingFields.length === 0;
  const label = String(workflowDraft.title || workflowDraft.derivedBrief?.title || workflowDraft.intent || 'Workflow').trim();
  const actions = Array.isArray(workflowDraft.proposedOutputs)
    ? workflowDraft.proposedOutputs.map(item => `Create ${item.type}: ${item.label}`)
    : [];
  return {
    workflowId: String(workflowDraft.id || ''),
    ownerSpeakerId: 'aisha',
    summary: ready
      ? `I can stage ${label} cleanly now.`
      : `This is close, but I still need ${missingFields.join(', ')} before I commit it cleanly.`,
    missingFields,
    ready,
    actions
  };
}

function upsertAttachmentDrafts({ threadId = '', items = [] } = {}) {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return [];
  const drafts = [];
  for (const item of Array.isArray(items) ? items : []) {
    const kind = attachmentKindFromInput(item);
    const normalized = normalizeStudioPulseAsset({
      ...item,
      threadId: safeThreadId,
      kind,
      source: item.source || 'upload',
      previewUrl: item.previewUrl || (kind === 'image' ? item.dataUrl : ''),
      textExtract: item.textExtract || item.textContent || decodeDataUrlText(item.dataUrl || '')
    });
    statements.upsertStudioPulseAsset.run(normalized);
    const stored = getStudioPulseAssetById(normalized.id);
    if (stored) drafts.push(stored);
  }
  return drafts;
}

function stageWorkflowDraft({ threadId = '', intent = '', question = '', attachments = [], system = {}, workflowDraftId = '', createdBy = 'aisha' } = {}) {
  const safeThreadId = String(threadId || '').trim();
  const activeIntent = String(intent || '').trim().toLowerCase();
  if (!safeThreadId || !activeIntent || activeIntent === 'room-chat') return null;
  const workflowClass = workflowClassForIntent(activeIntent);
  if (workflowClass === 'room-chat') return null;
  const existing = workflowDraftId
    ? getStudioPulseWorkflowById(workflowDraftId)
    : getStudioPulseWorkflows(safeThreadId).find(item => String(item.status || '') !== 'committed' && String(item.intent || '') === activeIntent);
  const mergedAttachments = (Array.isArray(attachments) ? attachments : []).map(item => {
    if (item && item.id) return getStudioPulseAssetById(item.id) || item;
    return item;
  }).filter(Boolean);
  const derivedBrief = deriveWorkflowBrief({
    intent: activeIntent,
    question,
    attachments: mergedAttachments,
    existing: existing?.derivedBrief || {},
    system
  });
  const missingFields = workflowMissingFields(activeIntent, derivedBrief, mergedAttachments);
  const ready = missingFields.length === 0 && workflowClass === 'committable';
  const status = workflowClass === 'analysis'
    ? 'analysis_active'
    : ready
      ? 'ready_to_commit'
      : (missingFields.length ? 'needs_input' : 'draft');
  const payload = {
    ...(existing || {}),
    threadId: safeThreadId,
    intent: activeIntent,
    workflowClass,
    status,
    createdBy: existing?.createdBy || createdBy || 'aisha',
    title: derivedBrief.title,
    inputs: {
      question,
      attachmentIds: mergedAttachments.map(item => item.id).filter(Boolean),
      attachmentNames: mergedAttachments.map(item => item.name).filter(Boolean)
    },
    derivedBrief,
    steps: workflowSteps(activeIntent, derivedBrief),
    proposedOutputs: workflowOutputs(activeIntent, derivedBrief),
    missingFields,
    commitCard: null
  };
  const normalized = normalizeStudioPulseWorkflow(payload);
  statements.upsertStudioPulseWorkflow.run(normalized);
  const stored = getStudioPulseWorkflowById(normalized.id);
  const commitCard = buildCommitCard(stored);
  const finalWorkflow = {
    ...stored,
    workflowClass,
    commitCard
  };
  statements.upsertStudioPulseWorkflow.run(normalizeStudioPulseWorkflow(finalWorkflow));
  for (const asset of mergedAttachments) {
    if (!asset?.id) continue;
    statements.upsertStudioPulseAsset.run(normalizeStudioPulseAsset({
      ...(getStudioPulseAssetById(asset.id) || asset),
      workflowId: finalWorkflow.id
    }));
  }
  return getStudioPulseWorkflowById(normalized.id);
}

async function commitWorkflowDraft({ workflowDraft = null, localBaseUrl = '', providerConfig = null } = {}) {
  if (!workflowDraft || typeof workflowDraft !== 'object') {
    throw new Error('Workflow draft not found.');
  }
  if (!isCommittableWorkflowIntent(workflowDraft.intent)) {
    throw new Error('This workflow is analysis-only. Convert it into a plan or make flow before committing.');
  }
  const intent = String(workflowDraft.intent || '').trim().toLowerCase();
  const brief = workflowDraft.derivedBrief && typeof workflowDraft.derivedBrief === 'object' ? workflowDraft.derivedBrief : {};
  const attachments = getStudioPulseAssets(String(workflowDraft.threadId || ''))
    .filter(item => !workflowDraft.id || String(item.workflowId || '') === String(workflowDraft.id));
  const commitCard = buildCommitCard(workflowDraft);
  if (!commitCard?.ready) {
    const normalizedNeedsInput = normalizeStudioPulseWorkflow({
      ...workflowDraft,
      status: 'needs_input',
      commitCard
    });
    statements.upsertStudioPulseWorkflow.run(normalizedNeedsInput);
    return {
      workflow: getStudioPulseWorkflowById(normalizedNeedsInput.id),
      commitCard,
      artifacts: {},
      summary: commitCard.summary
    };
  }

  const artifacts = {};

  if (intent === 'plan-post' || intent === 'plan-calendar' || intent === 'plan-event') {
    const plannerPayload = {
      title: brief.title || compact(workflowDraft.inputs?.question || workflowDraft.intent, 80),
      char: brief.owner || deriveWorkflowOwner(intent),
      campaignId: workflowDraft.campaignId || '',
      promptId: '',
      scheduledFor: brief.timingHint || null,
      status: intent === 'plan-calendar' ? 'scheduled' : 'planned',
      workflowId: workflowDraft.id,
      workflowIntent: intent,
      channel: brief.channel || '',
      audience: brief.audience || '',
      priority: brief.priority || 'normal',
      summary: brief.summary || '',
      deliverable: brief.deliverable || '',
      notes: `Created via Studio Pulse commit.`
    };
    const plannerRow = normalizePlanner(plannerPayload);
    statements.upsertPlanner.run(plannerRow);
    artifacts.planner = rowWithPlanner(plannerRow.id);

    if (brief.promptText) {
      const promptRow = normalizePrompt({
        title: `${brief.title || 'Studio Pulse draft'} prompt`,
        char: brief.owner || deriveWorkflowOwner(intent),
        campaignId: workflowDraft.campaignId || '',
        prompt: brief.promptText,
        saved: true,
        tested: false,
        workflowId: workflowDraft.id,
        linkedPlannerIds: artifacts.planner ? [artifacts.planner.id] : []
      });
      statements.upsertPrompt.run(promptRow);
      artifacts.prompt = rowWithPrompt(promptRow.id);
    }
  }

  if (intent === 'make-image') {
    const promptRow = normalizePrompt({
      title: `${brief.title || 'Studio Pulse image'} prompt`,
      char: brief.owner || deriveWorkflowOwner(intent),
      campaignId: workflowDraft.campaignId || '',
      prompt: brief.promptText || workflowDraft.inputs?.question || '',
      saved: true,
      tested: true,
      workflowId: workflowDraft.id
    });
    statements.upsertPrompt.run(promptRow);
    artifacts.prompt = rowWithPrompt(promptRow.id);

    const refs = attachments
      .filter(item => String(item.kind || '').toLowerCase() === 'image')
      .map(item => String(item.dataUrl || item.previewUrl || '').trim())
      .filter(Boolean)
      .slice(0, 4);
    const response = await fetch(`${localBaseUrl.replace(/\/$/, '')}/api/gemini/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: brief.promptText || workflowDraft.inputs?.question || '',
        character: brief.owner || deriveWorkflowOwner(intent),
        campaign: workflowDraft.campaignId || '',
        refs,
        providerConfig: providerConfig && typeof providerConfig === 'object' ? providerConfig : {}
      })
    });
    const payload = await response.json();
    if (!payload?.ok || !payload?.imageData) {
      const failed = normalizeStudioPulseWorkflow({
        ...workflowDraft,
        status: 'commit_failed',
        lastCommitError: payload?.error || 'Image generation failed.'
      });
      statements.upsertStudioPulseWorkflow.run(failed);
      throw new Error(payload?.error || 'Image generation failed.');
    }
    const galleryRow = normalizeGallery({
      title: brief.title || 'Studio Pulse image',
      char: brief.owner || deriveWorkflowOwner(intent),
      campaignId: workflowDraft.campaignId || '',
      promptId: artifacts.prompt?.id || '',
      imgSrc: payload.imageData,
      provider: payload.provider || 'gemini',
      model: payload.model || '',
      drift: 0,
      workflowId: workflowDraft.id,
      sourceAttachmentIds: attachments.map(item => item.id).filter(Boolean)
    });
    statements.upsertGallery.run(galleryRow);
    artifacts.gallery = rowWithGallery(galleryRow.id);
  }

  const committed = normalizeStudioPulseWorkflow({
    ...workflowDraft,
    status: 'committed',
    committedAt: nowIso(),
    committedArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, value?.id || null])),
    commitCard
  });
  statements.upsertStudioPulseWorkflow.run(committed);
  return {
    workflow: getStudioPulseWorkflowById(committed.id),
    commitCard,
    artifacts,
    summary: `Aisha staged ${brief.title || workflowDraft.intent} cleanly through the live system.`
  };
}

function rowWithPrompt(id) {
  return id ? statements.getPromptById.get(id) && { ...statements.getPromptById.get(id), ...(JSON.parse(statements.getPromptById.get(id).payload_json || '{}')) } : null;
}

function rowWithGallery(id) {
  return id ? statements.getGalleryById.get(id) && { ...statements.getGalleryById.get(id), ...(JSON.parse(statements.getGalleryById.get(id).payload_json || '{}')) } : null;
}

function rowWithPlanner(id) {
  return id ? statements.getPlannerById.get(id) && { ...statements.getPlannerById.get(id), ...(JSON.parse(statements.getPlannerById.get(id).payload_json || '{}')) } : null;
}

function removeAttachmentDraft(id = '') {
  const existing = getStudioPulseAssetById(id);
  if (!existing) return false;
  statements.deleteStudioPulseAsset.run(String(id));
  return true;
}

module.exports = {
  inferWorkflowIntent,
  workflowClassForIntent,
  isCommittableWorkflowIntent,
  upsertAttachmentDrafts,
  stageWorkflowDraft,
  buildCommitCard,
  commitWorkflowDraft,
  removeAttachmentDraft,
  listThreadAttachments: getStudioPulseAssets,
  listThreadWorkflows: getStudioPulseWorkflows,
  getWorkflowById: getStudioPulseWorkflowById
};
