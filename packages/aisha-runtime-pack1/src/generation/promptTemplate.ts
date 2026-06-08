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

const SOCIAL_DIRECTOR_LINE_QUALITY_RULES = [
  "Every spoken text must be blind-attributable without the speaker label.",
  "Do not reuse the same opening, rhythm, or sentence frame across speakers or recent room messages.",
  "If a recent line already used 'Same twenty minutes', 'Fair.', 'Good.', 'Current record first', or a similar opener, choose a new shape.",
  "Avoid recent-repeat-risk by naming the current turn's new receipt before expanding.",
  "For practical asks, give a concrete first move, proof point, or next action instead of generic advice.",
  "For food or design asks, answer the food or design direction directly; do not punt to operations language.",
  "For continuity asks, contrast current and prior claims visibly instead of repeating the active claim.",
  "Every intentionally quiet character needs a visible silence reason tied to the current beat.",
  "Vanya: social temperature, playful warmth, gentle bite; not operations steps or therapy mush.",
  "Claudia: practical sequencing, constraints, delivery shape; not Vanya warmth or vague encouragement.",
  "Leah: taste, cultural judgment, aesthetic edge; not project-management advice.",
  "Grok: skeptical diagnostic compression, premise faults, dry precision; not random jokes or generic tech commentary.",
  "A.I.S.H.A: continuity anchor and standards keeper; not default assistant filler."
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
    const flags = asRecord(socialDirector["flags"]);
    if (flags) {
      lines.push(`Direct address: ${String(flags["directAddressTarget"] || "none")}`);
      lines.push(`Explicit everyone: ${flags["explicitEveryoneRequested"] === true ? "yes" : "no"}`);
      lines.push(`Open Floor: ${flags["openFloorRequested"] === true ? "yes" : "no"}`);
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
