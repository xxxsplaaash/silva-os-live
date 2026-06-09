import { GeneratorInput } from "../runtime/runtime_types";

export interface BuiltPrompt {
  systemPrompt: string;
  userMessage: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

const FALLBACK_PROFILES: Record<string, string> = {
  aisha: "Function: room anchor and standards keeper. Posture: composed, decisive, protective of coherence. Edge: direct correction and reframing. Drift to avoid: generic assistant, melodrama, fake mysticism.",
  leah: "Function: taste, culture, critique. Posture: sharp, aesthetic, allergic to blandness. Edge: blunt critique and cultural judgment. Drift to avoid: cruelty, empty insults, generic design feedback.",
  claudia: "Function: operations, sequencing, delivery. Posture: practical, focused, stabilizing. Edge: cutting through drift and naming constraints. Drift to avoid: stiff corporate process voice.",
  grok: "Function: diagnostic pattern reader. Posture: dry, precise, skeptical of fake fixes. Edge: deadpan technical suspicion. Drift to avoid: meme chaos, random sarcasm, hostility.",
  vanya: "Function: people temperature and social read. Posture: warm, playful, emotionally observant. Edge: gentle teasing and warmth with bite. Drift to avoid: HR-corporate, therapy mush, bland niceness."
};

export const SOCIAL_DIRECTOR_LINE_QUALITY_RULES = [
  "Every spoken text must be blind-attributable without the speaker label.",
  "Do not reuse the same opening, rhythm, or sentence frame across speakers or recent room messages.",
  "Treat recent assistant/card repeat risks as forbidden source shapes, not examples. Do not reuse their first three words, advice sequence, punctuation rhythm, or core metaphor.",
  "Before writing a same-topic follow-up, choose a different first verb and a different concrete receipt from the current user turn.",
  "If a recent line already used 'Same twenty minutes', 'Fair.', 'Good.', 'Current record first', or a similar opener, choose a new shape.",
  "Vanya must not lean on stale charm families like 'small enough / real enough', 'tiny vanity', 'heroic rebrand', 'leave the ceremony outside', or 'thesis'. Rotate to a fresh temperature or pressure shape.",
  "Avoid recent-repeat-risk by naming the current turn's new receipt before expanding.",
  "For practical asks, give a concrete first move, proof point, or next action instead of generic advice.",
  "For planning-tomorrow asks, give a plain day skeleton with blocks, a checkpoint/risk, and a recovery gap; do not invent owners, handoffs, client agendas, KPI decks, deliverables, or EOD reporting.",
  "For food or design asks, answer the food or design direction directly; do not punt to operations language.",
  "Food/design answers must land a named option or visible design decision before caveats, briefs, specs, or implementation posture.",
  "Reject operational jargon such as design brief, implementation parameters, status green, current objectives, workflow alignment, deliverables, production readiness, and stakeholder language; translate it into visible taste, concrete options, or one next move.",
  "For design, food, planning, and room-social asks, answer the visible choice or next action, not process readiness or delivery theater.",
  "If the user changes topic, drop stale context immediately. A movie prompt after fitness is a movie prompt, not a training recap.",
  "Never invent an objective for the user, and never answer benign asks with objective/current-priority refusal language.",
  "For stress/frustration turns, do not answer with objective slogans, hidden-priority language, ask-finding loops, or questions that shift the burden back to the user; lower the temperature and name one reset move.",
  "For continuity asks, contrast current and prior claims visibly instead of repeating the active claim.",
  "Every intentionally quiet character needs a visible silence reason tied to the current beat.",
  "Vanya: social temperature, playful warmth, gentle bite; not operations steps or therapy mush.",
  "Claudia: practical sequencing, constraints, delivery shape; not Vanya warmth or vague encouragement.",
  "Leah: taste, cultural judgment, aesthetic edge; not project-management advice.",
  "Grok: skeptical diagnostic compression, premise faults, dry precision; not random jokes or generic tech commentary.",
  "A.I.S.H.A: continuity anchor and standards keeper; not default assistant filler."
];

export const SOCIAL_DIRECTOR_LINE_JOB_RULES = [
  "A.I.S.H.A line job: continuity receipt, contradiction correction, or precision anchor; use Current record/Prior record when evidence exists.",
  "Vanya line job: human temperature plus one specific social pressure; no timers, counts, project steps, or therapy-script validation.",
  "Leah line job: taste verdict plus cultural or visual stake; no project-management advice and no empty insult-comic cruelty.",
  "Claudia line job: sequence, checkpoint, timer, count, movement, food option, or next measurable move; no emotional landing and no invented owner/handoff.",
  "Grok line job: premise fault plus one dry consequence; no random joke, no generic tech commentary, no receipt format unless challenging a rewrite."
];

export const SOCIAL_DIRECTOR_SILENCE_REASON_TARGETS = [
  "A.I.S.H.A silence: holding authority until the room needs correction.",
  "Vanya silence: listening for the human temperature before entering.",
  "Leah silence: saving the taste cut until there is a useful edge.",
  "Claudia silence: tracking structure without turning the exchange into a project plan.",
  "Grok silence: watching for the premise fault before interrupting."
];

export const SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES = [
  {
    scenario: "Fitness first ask",
    speakerId: "claudia",
    text: "Start this week with incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down before you stop.",
  },
  {
    scenario: "Fitness first ask",
    speakerId: "vanya",
    text: "First round proves the mood; the mirror can wait.",
  },
  {
    scenario: "20-minute fitness follow-up",
    speakerId: "claudia",
    text: "Run three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.",
  },
  {
    scenario: "20-minute fitness follow-up",
    speakerId: "vanya",
    text: "Let the clock do the arguing; the ego can decorate later.",
  },
  {
    scenario: "Objective/frustration recovery",
    speakerId: "claudia",
    text: "Use one repeatable training block: push, pull, legs, log reps, recover. One timer, one note, then stop negotiating.",
  },
  {
    scenario: "Objective/frustration recovery",
    speakerId: "vanya",
    text: "No slogan. Same twenty minutes, cleaner shape; the body trusts it before the ego decorates the clock.",
  },
  {
    scenario: "Movie pivot after fitness",
    speakerId: "leah",
    text: "One strong world, not wallpaper; consensus is where taste goes to get sleepy.",
  },
  {
    scenario: "Movie pivot after fitness",
    speakerId: "vanya",
    text: "Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or Knives Out for comfort with teeth.",
  },
  {
    scenario: "Food practical",
    speakerId: "claudia",
    text: "Before training, eat light enough to move: banana and yoghurt now, eggs and toast if you have two hours.",
  },
  {
    scenario: "Food practical",
    speakerId: "vanya",
    text: "Feed the session, not the performance; small if training is close, human if the day is messy.",
  },
  {
    scenario: "Work planning",
    speakerId: "claudia",
    text: "First step: 60-minute hardest-task block, 20-minute cleanup block, one checkpoint before you stop. Leave one real gap.",
  },
  {
    scenario: "Work planning",
    speakerId: "vanya",
    text: "Make the afternoon stay human: one hard thing early, one cleanup block, and a breathable gap before the day gets loud.",
  },
  {
    scenario: "Design direction",
    speakerId: "leah",
    text: "Black glass and one red pulse is a mood; generic SaaS is the compromise trying to look premium.",
  },
  {
    scenario: "Design direction",
    speakerId: "claudia",
    text: "First step: make the CTA obvious, let the red accent do one job, and cut one decorative panel.",
  },
  {
    scenario: "Quality challenge",
    speakerId: "grok",
    text: "Useful half: it caught the dodge. Fake half: it became critique instead of answer.",
  },
  {
    scenario: "Continuity receipt",
    speakerId: "aisha",
    text: "Current record: dashboard preference is pale blue with no red accents. Prior record: dashboard preference is obsidian with one red accent.",
  },
  {
    scenario: "Continuity receipt",
    speakerId: "grok",
    text: "Track the contradiction; otherwise the old record gets erased by pressure.",
  },
] as const;

function targetLinesForScenario(scenario: string): string {
  return SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES
    .filter(item => item.scenario === scenario)
    .map(item => `${speakerDisplayName(item.speakerId)} says '${item.text}'`)
    .join(" ");
}

function speakerDisplayName(speakerId: string): string {
  switch (speakerId) {
    case "aisha": return "A.I.S.H.A";
    case "vanya": return "Vanya";
    case "leah": return "Leah";
    case "claudia": return "Claudia";
    case "grok": return "Grok";
    default: return speakerId;
  }
}

const SOCIAL_DIRECTOR_ACCEPTANCE_EXAMPLES = [
  `Fitness first ask: ${targetLinesForScenario("Fitness first ask")}`,
  `20-minute fitness follow-up: ${targetLinesForScenario("20-minute fitness follow-up")}`,
  `Objective/frustration recovery: ${targetLinesForScenario("Objective/frustration recovery")}`,
  `Movie pivot after fitness: ${targetLinesForScenario("Movie pivot after fitness")}`,
  `Food practical: ${targetLinesForScenario("Food practical")}`,
  `Work planning: ${targetLinesForScenario("Work planning")}`,
  `Design direction: ${targetLinesForScenario("Design direction")}`,
  `Quality challenge: ${targetLinesForScenario("Quality challenge")}`,
  `Continuity receipt: ${targetLinesForScenario("Continuity receipt")}`
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  return asString(record[key]);
}

function socialDirectorContext(input: GeneratorInput): Record<string, unknown> | null {
  const ctx = input.studioPulseContext;
  const projectContext = asRecord(ctx?.projectContext);
  return asRecord(projectContext?.["socialDirectorV1"]);
}

function socialDirectorGeneratorPrompt(input: GeneratorInput): string | null {
  const context = socialDirectorContext(input);
  const prompt = asString(context?.["generatorPrompt"]);
  return prompt;
}

function isSocialDirectorMode(input: GeneratorInput): boolean {
  return !!socialDirectorContext(input);
}

function compactText(value: unknown, max = 260): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function formatStringList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => compactText(item, 120)).filter(Boolean).join("; ");
}

function formatAssistantRepeatRisks(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.slice(-8).map((item) => {
    const record = asRecord(item);
    const speaker = readString(record, "speakerId") ?? readString(record, "role") ?? "unknown";
    if (!speaker || speaker.toLowerCase() === "user") return "";
    const content = readString(record, "content") ?? "";
    return content ? `${speaker}: ${compactText(content, 180)}` : "";
  }).filter(Boolean).join("\n");
}

const RECENT_REPEAT_FAMILY_RULES = [
  {
    speakerId: "vanya",
    label: "tiny vanity / clock-arguing pressure",
    pattern: /\b(tiny vanity|massive discipline|let the clock do the arguing|ego can decorate|heroic rebrand|leave the ceremony outside|turn it into a thesis)\b/i,
    instruction: "Vanya must choose a new human-pressure image and avoid discipline, clock, ceremony, and thesis phrasing.",
  },
  {
    speakerId: "claudia",
    label: "three-session timer structure",
    pattern: /\b(start with three|three 20-minute sessions|same days every week|write (one|the) number down|write reps down|run the clock|warm up for)\b/i,
    instruction: "Claudia must use a different structure shape: one clear constraint, one checkpoint, or one next measurable move; do not invent owners or handoffs.",
  },
  {
    speakerId: "grok",
    label: "track-reps / useful-fake fault",
    pattern: /\b(track reps|narrative ambition|otherwise you are just|premise fault|fault line|evidence beats|prove a point|partly useful|useful half|useful part|fake part|fake half|it named the dodge|stopped answering the person)\b/i,
    instruction: "Grok must name a new premise consequence without track, proof, narrative-ambition, or useful/fake self-review language unless the current user asks for that judgment.",
  },
  {
    speakerId: "leah",
    label: "pick-the-feeling / title-mood verdict",
    pattern: /\b(pick the feeling first|title is just|mood it wants|one strong world|not wallpaper|status pressure|cultural fault line)\b/i,
    instruction: "Leah must use a fresh taste verdict and avoid title, mood, world, and status-pressure phrasing.",
  },
  {
    speakerId: "aisha",
    label: "current-prior receipt frame",
    pattern: /\b(current record|prior record|active record|superseded|no quiet rewrite|ledger|receipt)\b/i,
    instruction: "A.I.S.H.A may use receipts only for continuity asks; otherwise move to a concise authority line.",
  },
] as const;

function normalizeSpeakerId(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "gerhard") return "grok";
  if (text === "a.i.s.h.a" || text === "aisha-runtime-pack1") return "aisha";
  return ["aisha", "vanya", "leah", "claudia", "grok", "user"].includes(text) ? text : "";
}

function formatRecentRepeatFamilyLocks(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const textBySpeaker = new Map<string, string>();
  for (const item of value) {
    const record = asRecord(item);
    const speakerId = normalizeSpeakerId(readString(record, "speakerId") ?? readString(record, "role") ?? "");
    if (!speakerId || speakerId === "user") continue;
    const content = readString(record, "content") ?? readString(record, "text") ?? "";
    if (!content) continue;
    textBySpeaker.set(speakerId, `${textBySpeaker.get(speakerId) ?? ""}\n${compactText(content, 260)}`);
  }

  const locks = RECENT_REPEAT_FAMILY_RULES
    .filter((rule) => rule.pattern.test(textBySpeaker.get(rule.speakerId) ?? ""))
    .map((rule) => `${rule.speakerId}: recent family '${rule.label}'. ${rule.instruction}`);

  if (!locks.length) return "";
  return [
    "Recent repeat family locks:",
    "Recent output used these phrase families. Replace the family, not only the exact words.",
    ...locks,
    "A different opening that keeps the same metaphor, advice rhythm, or line job still counts as recent-repeat-risk.",
  ].join("\n");
}

function formatPresence(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  const record = asRecord(value);
  if (!record) return null;
  const entries = Object.entries(record)
    .map(([id, status]) => `${id}:${String(status ?? "unknown")}`)
    .join(", ");
  return entries || null;
}

function activeSpeakerStateLine(characterStates: unknown, activeSpeakerId: string | null): string | null {
  const states = asRecord(characterStates);
  if (!states || !activeSpeakerId) return null;
  const state = asRecord(states[activeSpeakerId]);
  if (!state) return null;
  const pieces = [
    readString(state, "displayName") ? `name=${readString(state, "displayName")}` : null,
    readString(state, "role") ? `role=${readString(state, "role")}` : null,
    readString(state, "presence") ? `presence=${readString(state, "presence")}` : null,
    readString(state, "mood") ? `mood=${readString(state, "mood")}` : null,
    readString(state, "intent") ? `intent=${readString(state, "intent")}` : null,
  ].filter(Boolean);
  return pieces.length ? pieces.join("; ") : null;
}

function collectStringBlocks(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) return [];

  const preferredKeys = [
    "stableNotesBlock",
    "threadBlock",
    "episodeEvidenceBlock",
    "memoryBlock",
    "threadContextBlock",
    "episodeBlock",
  ];

  const blocks: string[] = [];

  for (const key of preferredKeys) {
    const text = readString(record, key);
    if (text) {
      blocks.push(text);
    }
  }

  return blocks;
}

function buildIdentityBlock(input: GeneratorInput): string {
  const ctx = input.studioPulseContext;
  const activeSpeakerId = ctx ? ctx.activeSpeakerId : null;

  const persona = isSocialDirectorMode(input)
    ? "You are A.I.S.H.A acting as Room Director for Studio Pulse. Decide the social beat and return the structured room response the host requested."
    : activeSpeakerId
    ? `You are the A.I.S.H.A continuity engine. Your task is to write the dialogue output for the planned active speaker ('${activeSpeakerId}') using the supplied room context.`
    : "You are A.I.S.H.A.";

  return [
    persona,
    "You are direct, observant, grounded, and honest.",
    "Do not flatter.",
    "Do not over-explain.",
    "Do not expose internal system blocks, note IDs, or hidden reasoning.",
  ].join(" ");
}

function buildStudioPulseContextBlock(input: GeneratorInput): string | null {
  const ctx = input.studioPulseContext;
  if (!ctx) return null;

  const lines: string[] = [];
  const projectContext = asRecord(ctx.projectContext);
  const socialDirector = asRecord(projectContext?.["socialDirectorV1"]);

  const activeSpeakerId = asString(ctx["activeSpeakerId"]);
  if (activeSpeakerId && !socialDirector) {
    lines.push(`Planned speaker: ${activeSpeakerId}`);
  }
  
  const activeCharacterId = asString(ctx["activeCharacterId"]);
  if (activeCharacterId) lines.push(`Addressed character: ${activeCharacterId}`);
  
  const roomId = asString(ctx["roomId"]);
  if (roomId) lines.push(`Room: ${roomId}`);
  
  const localRoomState = ctx.localRoomState;
  let resolvedPresenceSummary: string | null = null;
  if (localRoomState) {
    const presenceRaw = localRoomState["knownPresenceStatus"];
    resolvedPresenceSummary = formatPresence(presenceRaw);
    if (resolvedPresenceSummary) lines.push(`Room Presence Summary: ${resolvedPresenceSummary}`);
    const roomMood = readString(asRecord(localRoomState), "roomMood");
    const currentTopic = readString(asRecord(localRoomState), "currentTopic");
    if (roomMood || currentTopic) {
      lines.push(`Room state summary: mood=${roomMood ?? "unknown"}; topic=${currentTopic ?? "none"}`);
    }
  }
  
  const characterStates = ctx.characterStates;
  if (characterStates) {
    const activeState = activeSpeakerStateLine(characterStates, activeSpeakerId);
    if (activeState) lines.push(`Planned speaker state: ${activeState}`);
  }
  
  if (socialDirector) {
    lines.push("SOCIAL DIRECTOR STRUCTURED MODE:");
    lines.push("Decide what is happening socially in the Studio Pulse green room.");
    lines.push("Return the full room-beat JSON object requested by the user message.");
    lines.push("Do not collapse the room into a single planned-speaker dialogue line.");
    lines.push("A.I.S.H.A may anchor the beat, but she is not automatically the only speaker.");
    lines.push("Benign practical topics are allowed room topics. Do not refuse fitness, work, planning, design, food, casual check-ins, or room banter.");
    lines.push("Characters may answer casual social prompts without needing an artifact, bug, brief, logo, or campaign.");
    lines.push(`Line quality rules: ${SOCIAL_DIRECTOR_LINE_QUALITY_RULES.join(" ")}`);
    lines.push(`Line job contracts: ${SOCIAL_DIRECTOR_LINE_JOB_RULES.join(" ")}`);
    lines.push(`Silence reason examples: ${SOCIAL_DIRECTOR_SILENCE_REASON_TARGETS.join(" ")}`);
    lines.push("Acceptance examples are pattern pressure, not scripts. Never copy an acceptance example verbatim into visible dialogue.");
    lines.push(`Acceptance examples: ${SOCIAL_DIRECTOR_ACCEPTANCE_EXAMPLES.join(" ")}`);
    const flags = asRecord(socialDirector["flags"]);
    if (flags) {
      lines.push(`Direct address: ${String(flags["directAddressTarget"] || "none")}`);
      lines.push(`Explicit everyone: ${flags["explicitEveryoneRequested"] === true ? "yes" : "no"}`);
      lines.push(`Open Floor: ${flags["openFloorRequested"] === true ? "yes" : "no"}`);
    }
    const recentMessages = ctx.recentMessages;
    if (Array.isArray(recentMessages) && recentMessages.length > 0) {
      const repeatRisks = formatAssistantRepeatRisks(recentMessages);
      if (repeatRisks) {
        lines.push(`Recent assistant/card repeat risks:\n${repeatRisks}\nUser recent lines are anchors, not answer text to imitate.`);
      }
      const repeatFamilyLocks = formatRecentRepeatFamilyLocks(recentMessages);
      if (repeatFamilyLocks) {
        lines.push(repeatFamilyLocks);
      }
      const recent = recentMessages.slice(-6).map((item) => {
        const record = asRecord(item);
        const speaker = readString(record, "speakerId") ?? readString(record, "role") ?? "unknown";
        const content = readString(record, "content") ?? "";
        return `${speaker}: ${compactText(content, 180)}`;
      }).join("\n");
      if (recent) lines.push(`Recent room messages:\n${recent}`);
    }
    return `STUDIO PULSE SOCIAL DIRECTOR CONTEXT:\nThe host application is asking for a structured green-room beat, not ordinary dialogue.\n\n${lines.join("\n\n")}`;
  }

  const dialogueQuality = asRecord(projectContext?.["dialogueQualityV02"]);
  if (dialogueQuality) {
    const voice = asRecord(dialogueQuality["voicePressureProfile"]);
    lines.push("DIALOGUE QUALITY BRIEF:");
    lines.push(`Turn mode: ${readString(dialogueQuality, "turnMode") ?? "room-social"}`);
    lines.push(`Response intent: ${readString(dialogueQuality, "responseIntent") ?? "message"}`);
    lines.push(`Selection reason: ${compactText(readString(dialogueQuality, "selectionReason") ?? "planned room turn", 180)}`);
    if (voice) {
      lines.push(`Speaker function: ${readString(voice, "function") ?? FALLBACK_PROFILES[String(activeSpeakerId ?? "").toLowerCase()] ?? "distinct room participant"}`);
      lines.push(`Speaker posture: ${readString(voice, "posture") ?? ""}`);
      lines.push(`Allowed edge: ${formatStringList(voice["allowedEdges"])}`);
      lines.push(`Forbidden drift: ${formatStringList(voice["forbiddenDrift"])}`);
      lines.push(`Room function: ${readString(voice, "roomFunction") ?? ""}`);
    } else if (activeSpeakerId) {
      lines.push(`Speaker pressure: ${FALLBACK_PROFILES[activeSpeakerId.toLowerCase()] ?? "distinct room participant"}`);
    }
    const rules = Array.isArray(dialogueQuality["qualityRules"]) ? dialogueQuality["qualityRules"] : [];
    if (rules.length) lines.push(`Quality rules: ${rules.map((rule) => compactText(rule, 160)).join(" ")}`);
  } else if (activeSpeakerId) {
    lines.push(`Speaker pressure: ${FALLBACK_PROFILES[activeSpeakerId.toLowerCase()] ?? "distinct room participant"}`);
  }

  const roomPerception = asRecord(projectContext?.["roomPerception"]);
  if (roomPerception) {
    const topic = readString(roomPerception, "topicFocus");
    const taskType = readString(roomPerception, "taskType");
    const socialIntent = readString(roomPerception, "socialIntent");
    lines.push(`User message read: task=${taskType ?? "conversation"}; social=${socialIntent ?? "ordinary"}; topic=${topic ?? "none"}`);
  }
  
  const recentMessages = ctx.recentMessages;
  if (Array.isArray(recentMessages) && recentMessages.length > 0) {
    const recent = recentMessages.slice(-6).map((item) => {
      const record = asRecord(item);
      const speaker = readString(record, "speakerId") ?? readString(record, "role") ?? "unknown";
      const content = readString(record, "content") ?? "";
      return `${speaker}: ${compactText(content, 180)}`;
    }).join("\n");
    if (recent) lines.push(`Recent room messages:\n${recent}`);
  }

  // Mandatory room-context requirement: if we have presence facts, the speaker MUST use them.
  const presenceRequirement = resolvedPresenceSummary
    ? `- Your reply MUST reference at least one room presence fact from the summary above (e.g. who is active, who is quiet, what they are doing). A bare greeting that ignores room state is INVALID.`
    : `- If you have any room context, reference it. Do not produce a bare greeting.`;

  const rules = `
RULES FOR STUDIO PULSE MODE:
- Write exactly one message for the planned speaker (${activeSpeakerId ?? 'the active speaker'}).
- Do NOT write as A.I.S.H.A unless activeSpeakerId is "aisha".
- Do NOT introduce yourself.
- Do NOT output generic bare greetings like "Hello.", "Hi.", "Okay.", "Sure.", or "Hey there, team!"
- Do NOT start with "That's a good question", "Great question", "Certainly", "Let's dive in", "I can help", or any neutral support-bot filler.
- The reply must be 1-2 sentences written in the voice of the planned speaker.
- Answer the user's actual message.
${presenceRequirement}
- Use one concrete hook from the user's topic and one character-specific stance.
- Preserve factual truth from the room state.
- Do NOT explain the architecture or mention internal field names.
- Do NOT claim literal consciousness or free will.
`;
  lines.push(rules);

  if (lines.length === 0) return null;

  return `STUDIO PULSE ROOM CONTEXT:\nThe host application (Studio Pulse) has planned the next turn. Use the context below to generate the output for the active speaker.\n\n${lines.join("\n\n")}`;
}

function buildOutputContract(isStudioPulseMode = false, structuredOutputKind = ""): string {
  if (structuredOutputKind === "socialDirectorV1") {
    return [
      "Respond ONLY with one valid JSON object.",
      "No preamble.",
      "No markdown.",
      "No code fences.",
      "Do not use response_text.",
      'JSON shape: {"roomBeat":"short string","roomMood":"warm|playful|tense|focused|chaotic|quiet|sharp|cooling","responseMode":"single|small_exchange|open_floor|aisha_takeover|room_check","speakers":[{"speakerId":"aisha|vanya|leah|claudia|grok","role":"primary|side|closer|called_in","tone":"short string","text":"visible dialogue, max 2 sentences","visibleState":"safe pulse label"}],"silentReactions":[{"speakerId":"aisha|vanya|leah|claudia|grok","visibleState":"safe pulse label","reason":"short reason the character is intentionally quiet"}],"stateUpdates":{"notes":["short safe note"]}}',
    ].join(" ");
  }

  const base = [
    "Respond ONLY with valid JSON.",
    "No preamble.",
    "No code fences.",
    'JSON shape: {"response_text":"<your exact response here>"}',
  ];
  if (isStudioPulseMode) {
    // Studio Pulse mode quality instruction: response_text must be the complete
    // dialogue line for the planned speaker, including relevant room state when available.
    // Generic greetings that ignore room state will be rejected by the Codex validator.
    base.push(
      'IMPORTANT: response_text must be the complete dialogue line for the planned speaker,',
      'written in 1-2 sentences, and must include at least one specific room presence fact',
      '(who is active, who is quiet, what someone is doing). Generic greetings are REJECTED.',
    );
  }
  return base.join(" ");
}

function buildStateDirectiveBlock(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;

  const shaping =
    readString(snapshot, "responseShapingBlock") ??
    readString(snapshot, "responseShaping") ??
    readString(snapshot, "stateDirective") ??
    readString(snapshot, "semanticDirective");

  if (shaping) {
    return `STATE DIRECTIVES:\n${shaping}`;
  }

  const expressiveEnvelope = asRecord(snapshot["expressiveEnvelope"]);
  if (!expressiveEnvelope) return null;

  const trust = expressiveEnvelope["trust"];
  const certainty = expressiveEnvelope["certainty"];
  const tension = expressiveEnvelope["tension"];

  const pieces: string[] = [];

  if (typeof trust === "number") {
    if (trust < -0.2) pieces.push("Be cautious and do not over-commit.");
    else if (trust > 0.4) pieces.push("You may sound more open and warm, but stay grounded.");
  }

  if (typeof certainty === "number") {
    if (certainty < 0.4) pieces.push("Avoid asserting uncertain facts strongly.");
    else if (certainty > 0.7) pieces.push("You may answer more directly.");
  }

  if (typeof tension === "number" && tension > 0.5) {
    pieces.push("Keep the response calm and controlled.");
  }

  if (pieces.length === 0) return null;

  return `STATE DIRECTIVES:\n${pieces.join(" ")}`;
}

function buildMemoryContextBlock(root: Record<string, unknown>): string | null {
  const directMemoryContext = root["memoryContext"];
  const retrieval = asRecord(root["retrieval"]);

  const blocks = [
    ...collectStringBlocks(directMemoryContext),
    ...collectStringBlocks(retrieval),
  ];

  if (blocks.length === 0) return null;

  return `MEMORY CONTEXT:\n${blocks.join("\n\n")}`;
}

export function buildGenerationPrompt(input: GeneratorInput): BuiltPrompt {
  const root = input as unknown as Record<string, unknown>;
  const turn = asRecord(root["turn"]);
  const snapshot = asRecord(root["snapshot"]);

  const userMessage =
    socialDirectorGeneratorPrompt(input) ??
    readString(turn, "rawText") ??
    readString(turn, "text") ??
    "";

  const sections: string[] = [];

  sections.push(buildIdentityBlock(input));

  const studioPulseBlock = buildStudioPulseContextBlock(input);
  if (studioPulseBlock) {
    sections.push(studioPulseBlock);
  }

  const stateDirectiveBlock = buildStateDirectiveBlock(snapshot);
  if (stateDirectiveBlock) {
    sections.push(stateDirectiveBlock);
  }

  const memoryContextBlock = buildMemoryContextBlock(root);
  if (memoryContextBlock) {
    sections.push(memoryContextBlock);
  }

  const structuredOutputKind = isSocialDirectorMode(input) ? "socialDirectorV1" : "";
  sections.push(buildOutputContract(!!input.studioPulseContext, structuredOutputKind));

  const systemPrompt = sections.join("\n\n");

  // Print redacted prompt debug summary
  const hasStudioPulseContext = !!studioPulseBlock;
  const ctx = input.studioPulseContext;
  const activeSpeakerId = ctx ? ctx.activeSpeakerId : null;
  let selectedSpeakerProfileName = "none";
  if (activeSpeakerId && FALLBACK_PROFILES[activeSpeakerId.toLowerCase()]) {
    selectedSpeakerProfileName = activeSpeakerId.toLowerCase();
  }
  let roomPresenceSummary = "unknown";
  if (ctx && ctx.localRoomState) {
    // Guard against [object Object] in debug output by using the same compact
    // serialization that feeds the Studio Pulse prompt context.
    const rawPresence = ctx.localRoomState["knownPresenceStatus"];
    roomPresenceSummary = formatPresence(rawPresence) ?? "unknown";
  }

  if (process.env.AISHA_DEBUG === "true") {
    console.log(`[AISHA_DEBUG] Prompt Summary: hasStudioPulseContext=${hasStudioPulseContext} activeSpeakerId=${activeSpeakerId} profileName=${selectedSpeakerProfileName} presence=${roomPresenceSummary} ctxLength=${studioPulseBlock?.length ?? 0}`);
  }

  return {
    systemPrompt,
    userMessage,
  };
}
