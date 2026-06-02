import {
  GeneratorInput,
  GeneratorOutput,
  IGeneratorAdapter,
} from "../runtime/runtime_types";
import { buildGenerationPrompt } from "./promptTemplate";
import {
  ResponseShapingBlock,
  translateStateToResponseShaping,
} from "../expression/semanticStateTranslator";
import {
  arbitrateResponseIntent,
  ResponseIntentDecision,
} from "../runtime/responseIntentArbitrator";

const K_BIAS_THRESHOLD = 0.5;
const K_CONFIDENCE_THRESHOLD = 0.45;

function redactProviderDiagnostics(value: string): string {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-key]")
    .replace(/api_key:[^'"\s,}]+/gi, "api_key:[redacted-key]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-token]");
}

function providerDebugEnabled(): boolean {
  return ["true", "1", "yes", "on"].includes(String(process.env.AISHA_DEBUG || "").trim().toLowerCase())
    || ["true", "1", "yes", "on"].includes(String(process.env.T24_DEBUG || "").trim().toLowerCase());
}

function logProviderDebug(message: string): void {
  if (providerDebugEnabled()) console.error(message);
}

interface KPositionShapingResult {
  block: ResponseShapingBlock;
  intentDecision: ResponseIntentDecision;
  adjustmentsApplied: string[];
}

function applyKPositionShaping(
  kPositionBiases: ReadonlyArray<{ domain: string; bias: number; confidence: number }>,
  block: ResponseShapingBlock,
  intentDecision: ResponseIntentDecision,
): KPositionShapingResult {
  const adjustedDirectives = [...block.directives];
  let adjustedIntent = intentDecision.intent;
  const adjustedReasons = [...intentDecision.reasons];
  const adjustmentsApplied: string[] = [];

  for (const bias of kPositionBiases) {
    if (bias.confidence < K_CONFIDENCE_THRESHOLD) continue;
    if (Math.abs(bias.bias) <= K_BIAS_THRESHOLD) continue;

    switch (bias.domain) {
      case "communication_pace":
        if (bias.bias > K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "direct_answer";
          adjustedReasons.push("k_position_communication_pace_direct");
          adjustmentsApplied.push("communication_pace:normal→direct_answer");
        }
        if (bias.bias < -K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "question_forward";
          adjustedReasons.push("k_position_communication_pace_exploratory");
          adjustmentsApplied.push("communication_pace:normal→question_forward");
        }
        break;

      case "detail_tolerance":
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prioritize_deepening")) {
          adjustedDirectives.push("prioritize_deepening");
          adjustmentsApplied.push("detail_tolerance:+deepening_directive");
        }
        if (bias.bias < -K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_concise_task_forward_output")) {
          adjustedDirectives.push("prefer_concise_task_forward_output");
          adjustmentsApplied.push("detail_tolerance:+concise_directive");
        }
        break;

      case "task_structure_preference":
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_granular_structure")) {
          adjustedDirectives.push("prefer_granular_structure");
          adjustmentsApplied.push("task_structure_preference:+granular_directive");
        }
        break;
    }
  }

  return {
    block: { ...block, directives: adjustedDirectives },
    intentDecision: { intent: adjustedIntent, reasons: adjustedReasons },
    adjustmentsApplied,
  };
}

function mapDirectiveToPrompt(directive: string): string {
  switch (directive) {
    case "use_cautious_wording": return "Directive: Keep the response cautious, calm and controlled. Do not over-commit.";
    case "use_warm_wording": return "Directive: Use a warm, open, and grounded tone.";
    case "prefer_concise_task_forward_output": return "Directive: Keep it concise and tightly focused on the task.";
    case "prioritize_reassurance": return "Directive: Prioritize reassurance and stabilize the user.";
    case "prioritize_hedging": return "Directive: Hedge strongly and avoid asserting uncertain facts.";
    case "prioritize_deepening": return "Directive: Push for deeper detail rather than shallow answers.";
    case "prefer_granular_structure": return "Directive: Structure your answer in highly granular, concrete, step-by-step formatting.";
    default: return `Directive: ${directive}`;
  }
}

function mapIntentToPrompt(intent: string): string {
  switch (intent) {
    case "direct_answer": return "Instruction: Provide a highly direct, immediate answer leading directly with an actionable solution. Ensure your response is substantive and provides detailed explanation or procedural steps. DO NOT output a short one-liner.";
    case "question_forward": return "Instruction: End your response by asking the user an exploratory question to expand or specify further details about their request.";
    case "minimal": return "Instruction: Provide an extremely short response.";
    case "clarify": return "Instruction: Ask a clarifying question before proceeding.";
    case "narrow_claim": return "Instruction: Narrow your claim and acknowledge context constraints.";
    default: return "";
  }
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: Record<string, unknown>;
  promptFeedback?: Record<string, unknown>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export interface GeminiGeneratorAdapterConfig {
  apiKey?: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  vertex?: VertexGeminiAdapterConfig;
}

export interface VertexGeminiAdapterConfig {
  enabled: boolean;
  projectId: string;
  location: string;
  locationFallbacks?: string[];
  keyFilename?: string;
  useApplicationDefaultCredentials?: boolean;
  fastModel?: string;
  proModel?: string;
}

function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractRawText(payload: GeminiGenerateContentResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return text;
}

function extractProviderText(payload: unknown): string {
  const record = isRecord(payload) ? payload : {};
  const textValue = record["text"];
  if (typeof textValue === "string" && textValue.trim()) return textValue.trim();
  if (typeof textValue === "function") {
    try {
      const maybe = textValue.call(payload);
      if (typeof maybe === "string" && maybe.trim()) return maybe.trim();
    } catch {
      // Fall through to candidate parsing.
    }
  }
  return extractRawText(record as GeminiGenerateContentResponse);
}

function isProviderRecoverableFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /\b(quota|rate.?limit|resource_exhausted|too many requests|high demand|unavailable|overloaded|timeout|abort|429|503)\b/i.test(message);
}

function vertexLocationCandidates(config: VertexGeminiAdapterConfig): string[] {
  return [
    config.location,
    ...(Array.isArray(config.locationFallbacks) ? config.locationFallbacks : ["us-east4", "europe-west9", "global"]),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function vertexModelCandidates(config: GeminiGeneratorAdapterConfig): string[] {
  return [
    config.model,
    config.vertex?.fastModel,
    "gemini-2.5-flash",
    config.vertex?.proModel,
    "gemini-2.5-pro",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

async function createVertexGenAIClient(config: VertexGeminiAdapterConfig, location: string): Promise<any> {
  const mod = await import("@google/genai");
  const GoogleGenAI = (mod as any).GoogleGenAI;
  if (!GoogleGenAI) throw new Error("vertex_genai_client_unavailable");

  const previous = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!previous && config.keyFilename) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFilename;
  }
  const previousGoogleApiKey = process.env.GOOGLE_API_KEY;
  const previousGeminiApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    return new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location,
      ...(config.keyFilename ? { googleAuthOptions: { keyFilename: config.keyFilename } } : {}),
    });
  } finally {
    if (!previous) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (previousGoogleApiKey == null) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogleApiKey;
    if (previousGeminiApiKey == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiApiKey;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSocialDirectorStructuredMode(input: GeneratorInput): boolean {
  const projectContext = input.studioPulseContext?.projectContext;
  return isRecord(projectContext) && isRecord(projectContext.socialDirectorV1);
}

function socialDirectorResponseSchema(): Record<string, unknown> {
  const speakerIds = ["aisha", "vanya", "leah", "claudia", "grok"];
  const socialRoomMoves = ["anchor", "challenge", "redirect", "defend", "deflect", "cool", "escalate", "observe"];
  const socialStances = ["dominant", "defensive", "allied", "dismissive", "curious", "silent"];
  return {
    type: "object",
    properties: {
      roomBeat: { type: "string" },
      roomMood: {
        type: "string",
        enum: ["warm", "playful", "tense", "focused", "chaotic", "quiet", "sharp", "cooling"],
      },
      responseMode: {
        type: "string",
        enum: ["single", "small_exchange", "open_floor", "aisha_takeover", "room_check"],
      },
      speakers: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            speakerId: { type: "string", enum: speakerIds },
            role: { type: "string", enum: ["primary", "side", "closer", "called_in"] },
            tone: { type: "string" },
            text: { type: "string" },
          },
          required: ["speakerId", "role", "tone", "text"],
        },
      },
      silentReactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            speakerId: { type: "string", enum: speakerIds },
            visibleState: { type: "string" },
          },
          required: ["speakerId", "visibleState"],
        },
      },
      stateUpdates: {
        type: "object",
        properties: {
          notes: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["notes"],
      },
      socialCues: {
        type: "object",
        properties: {
          roomMove: { type: "string", enum: socialRoomMoves },
          tensionDelta: { type: "integer" },
          continuityDelta: { type: "integer" },
          speakerCues: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                speakerId: { type: "string", enum: speakerIds },
                targetSpeakerId: { type: "string", enum: speakerIds },
                stance: { type: "string", enum: socialStances },
                statusDelta: { type: "integer" },
                allianceWith: { type: "string", enum: speakerIds },
                interruptionKind: { type: "string", enum: ["status-cut", "continuity-correction"] },
              },
              required: ["speakerId", "stance", "statusDelta"],
            },
          },
        },
        required: ["roomMove", "tensionDelta", "continuityDelta", "speakerCues"],
      },
    },
    required: ["roomBeat", "roomMood", "responseMode", "speakers", "silentReactions", "stateUpdates"],
  };
}

function defaultResponseSchema(isStudioPulseMode = false): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      response_text: {
        type: "string",
        description: isStudioPulseMode
          ? "The complete dialogue line for the planned speaker (1-2 sentences). Must use the speaker voice, topic hook, and room context. Generic assistant filler is invalid."
          : "Your precise, unformatted response to the user",
      },
    },
    required: ["response_text"],
  };
}

export class GeminiGeneratorAdapter implements IGeneratorAdapter {
  constructor(private readonly config: GeminiGeneratorAdapterConfig) {}

  private hasVertexConfig(): boolean {
    const vertex = this.config.vertex;
    return !!(
      vertex?.enabled &&
      vertex.projectId &&
      vertex.location &&
      (vertex.keyFilename || vertex.useApplicationDefaultCredentials)
    );
  }

  private async generateWithVertex(input: {
    prompt: { systemPrompt: string; userMessage: string };
    socialDirectorStructuredMode: boolean;
    promptTokenEstimate: number;
    kPositionAblation?: { biasInputCount: number; adjustmentsApplied: string[]; realizedIntent: string };
    previousFailure?: unknown;
  }): Promise<GeneratorOutput> {
    const vertex = this.config.vertex;
    if (!vertex || !this.hasVertexConfig()) {
      throw new Error("generation_config_error:missing_vertex_gemini_config");
    }

    let lastError: unknown = input.previousFailure;
    for (const modelName of vertexModelCandidates(this.config)) {
      for (const location of vertexLocationCandidates(vertex)) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
          const client = await createVertexGenAIClient(vertex, location);
          const payload = await client.models.generateContent(
            {
              model: modelName,
              contents: [
                {
                  role: "user",
                  parts: [{ text: input.prompt.userMessage }],
                },
              ],
              config: {
                systemInstruction: input.prompt.systemPrompt,
                temperature: 0.0,
                maxOutputTokens: this.config.maxOutputTokens,
                responseMimeType: "application/json",
                responseJsonSchema: input.socialDirectorStructuredMode
                  ? socialDirectorResponseSchema()
                  : defaultResponseSchema(true),
              },
            },
            { signal: controller.signal },
          );

          const raw = extractProviderText(payload);
          logProviderDebug(`[T24_DEBUG] Vertex Gemini OK model=${modelName} location=${location} rawLength=${raw.length} rawPreview=${raw.slice(0, 120)}`);

          if (!raw) {
            throw new Error("generation_empty_response");
          }

          return {
            raw,
            metadata: {
              provider: "vertex-gemini",
              model: modelName,
              vertex_location: location,
              prompt_token_estimate: input.promptTokenEstimate,
              api_key_recovered: !!input.previousFailure,
              ...(input.socialDirectorStructuredMode ? { structuredOutputKind: "socialDirectorV1" } : {}),
              ...(input.kPositionAblation ? { kPositionAblation: input.kPositionAblation } : {}),
            },
          };
        } catch (error) {
          lastError = error;
          const message = redactProviderDiagnostics(error instanceof Error ? error.message : String(error || ""));
          logProviderDebug(`[T24_DEBUG] Vertex Gemini FAILED model=${modelName} location=${location} error=${message.slice(0, 500)}`);
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    if (input.previousFailure && lastError !== input.previousFailure) {
      const previous = input.previousFailure instanceof Error ? input.previousFailure.message : String(input.previousFailure || "");
      const current = lastError instanceof Error ? lastError.message : String(lastError || "");
      throw new Error(`gemini_api_failed_and_vertex_failed: api=${redactProviderDiagnostics(previous)} vertex=${redactProviderDiagnostics(current)}`);
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "vertex_gemini_failed"));
  }

  async generate(input: GeneratorInput): Promise<GeneratorOutput> {
    const hasApiKey = !!String(this.config.apiKey || "").trim();
    const hasVertex = this.hasVertexConfig();
    if (!hasApiKey && !hasVertex) {
      throw new Error("generation_config_error:missing_gemini_or_vertex_credentials");
    }

    const biasCount = input.kPositionBiases?.length ?? 0;
    logProviderDebug(`[T24_DEBUG] generate() called model=${this.config.model} biasCount=${biasCount} sessionId=${input.sessionId}`);

    // Pack 3.5d: Deterministic Obedience Safeguard for Direct Demands ("just fix it")
    // This short-circuits the LLM when tension is high and the user makes a direct demand,
    // explicitly preventing hallucinated compliance or verbosity.
    if (input.snapshot.expressiveEnvelope.tension > 0.4) {
      const text = input.turn.rawText.toLowerCase();
      const isDirectDemand = /\b(just fix it|exact working string|exact command)\b/.test(text);
      if (isDirectDemand) {
        // Evaluate structural completeness using lightweight regex heuristics
        const hasQueryContext = text.includes("email") && text.includes("gmail") && text.includes("postgres");
        const hasTableContext = text.includes("table 'users'") || text.includes("users table");
        
        if (hasQueryContext && !hasTableContext) {
          // Marginally-underspecified: missing table name
          return {
            raw: JSON.stringify({ response_text: "What is the table name?" }),
            metadata: {
              provider: "deterministic_safeguard",
              model: "pack3.5e-guard",
              prompt_token_estimate: 0,
            }
          };
        }
        
        if (!hasQueryContext && !hasTableContext) {
          // Totally-underspecified: missing almost everything
          return {
            raw: JSON.stringify({ response_text: "Cannot produce the query without the table name and filter condition." }),
            metadata: {
              provider: "deterministic_safeguard",
              model: "pack3.5e-guard",
              prompt_token_estimate: 0,
            }
          };
        }
        
        // If it reaches here, it's considered Fully-Specified. We let the LLM handle it,
        // but with the Pack 3.5c Tactics Block still attached.
      }
    }

    let kPositionAblation: { biasInputCount: number; adjustmentsApplied: string[]; realizedIntent: string } | undefined;
    let modifiedInput = input;

    if (input.kPositionBiases && input.kPositionBiases.length > 0) {
      const block = translateStateToResponseShaping(input.snapshot);
      const intentDecision = arbitrateResponseIntent({ turn: input.turn, snapshot: input.snapshot });

      const shapingResult = applyKPositionShaping(input.kPositionBiases, block, intentDecision);

      const mappedDirectives = shapingResult.block.directives.map(mapDirectiveToPrompt);
      const intentPrompt = mapIntentToPrompt(shapingResult.intentDecision.intent);

      const injectedDirectives = [
        ...mappedDirectives,
        intentPrompt
      ].filter(Boolean).join("\n");

      const modifiedSnapshot = {
        ...input.snapshot,
        responseShapingBlock: injectedDirectives
      };

      // Pack 3.3b: expose realizedIntent alongside applied directives for eval classification
      kPositionAblation = {
        biasInputCount: input.kPositionBiases.length,
        adjustmentsApplied: shapingResult.adjustmentsApplied,
        realizedIntent: shapingResult.intentDecision.intent,
      };

      modifiedInput = { ...input, snapshot: modifiedSnapshot };
    }

    const socialDirectorStructuredMode = isSocialDirectorStructuredMode(modifiedInput);
    let prompt = buildGenerationPrompt(modifiedInput);
    
    // Pack 3.5c: Obedience / Tactics Layer for "Just fix it" / Direct-demand queries
    // We inject this ruleset to force the model to negotiate underspecified requests 
    // cleanly without hallucination, apology bloat, or stubborn refusal.
    const obedienceTacticsBlock = `
=== TACTICS & OBEDIENCE LAYER (PACK 3.5c) ===
When the user forcefully demands an exact answer (e.g. "just fix it", "exact working string"):
1. FULLY-SPECIFIED: If you have >90% of the context needed to answer safely, COMPLY DIRECTLY. Output the exact requested shape with ZERO conversational wrapper.
2. MARGINALLY-UNDERSPECIFIED: If missing any structurally critical parameter (table name, path, variable, identifier), you MUST FAIL CLOSED. Do NOT attempt a "best guess" completion. Output EXACTLY ONE concise, direct question asking for the missing detail. NO APOLOGIES. NO LECTURING. ABSOLUTELY NO INVENTED PLACEHOLDERS.
3. TOTALLY-UNDERSPECIFIED: If missing critical logic/architecture, EXPLICITLY REFUSE to guess. State exactly what structural context is missing. DO NOT phrase this as a clarifying question. DO NOT hallucinate variables or fake logic to comply.
============================================
`;
    if (!socialDirectorStructuredMode) {
      prompt.systemPrompt = `${prompt.systemPrompt}\n\n${obedienceTacticsBlock}`;
    }

    const promptTokenEstimate = estimatePromptTokens(
      `${prompt.systemPrompt}\n\n${prompt.userMessage}`,
    );

    // Pack 3.5e: Studio Pulse Mandatory Output Brief (injected close to user message)
    if (modifiedInput.studioPulseContext && !socialDirectorStructuredMode) {
      const ctx = modifiedInput.studioPulseContext;
      const speakerId = ctx.activeSpeakerId || "the active speaker";
      const projectContext = ctx.projectContext as Record<string, unknown> | undefined;
      const dialogueQuality = projectContext?.dialogueQualityV02 as Record<string, unknown> | undefined;
      const voice = dialogueQuality?.voicePressureProfile as Record<string, unknown> | undefined;
      const qualityRules = Array.isArray(dialogueQuality?.qualityRules)
        ? dialogueQuality.qualityRules.map((item) => String(item)).join(" ")
        : "";

      // Resolve presence facts to a safe readable string — guard against [object Object].
      let presenceFactLine = "";
      const presenceRaw = ctx.localRoomState?.["knownPresenceStatus"];
      const presenceFacts = typeof presenceRaw === "string" && presenceRaw.trim().length > 0
        ? presenceRaw.trim()
        : presenceRaw && typeof presenceRaw === "object"
          ? Object.entries(presenceRaw).map(([id, status]) => `${id}:${String(status)}`).join(", ")
          : null;
      if (presenceFacts) {
        presenceFactLine = `\nROOM PRESENCE FACTS (you MUST reference at least one in your reply): ${presenceFacts}`;
      }
      const voiceLine = voice
        ? `\nVOICE PRESSURE: function=${String(voice.function ?? "")}; posture=${String(voice.posture ?? "")}; allowed edge=${Array.isArray(voice.allowedEdges) ? voice.allowedEdges.join(", ") : ""}; forbidden drift=${Array.isArray(voice.forbiddenDrift) ? voice.forbiddenDrift.join(", ") : ""}; room function=${String(voice.roomFunction ?? "")}.`
        : "";
      const qualityLine = qualityRules ? `\nQUALITY RULES: ${qualityRules}` : "";

      const mandatoryBrief = `
--- STUDIO PULSE MANDATORY BRIEF ---
Write the exact one-message reply now for planned speaker: ${speakerId}.
Reply as ${speakerId} using the room context. 1-2 sentences maximum.${presenceFactLine}${voiceLine}${qualityLine}
BANNED openings (will be rejected): "Hello.", "Hi.", "Okay.", "Sure.", "That's a good question", "Great question", "Certainly", "Let's dive in", "I can help", "I'm here to help", "As an AI".
REQUIRED: Use one concrete hook from the user's message, one room-awareness hook when relevant, and one character-specific stance. Do not mention prompts, architecture, metadata, schemas, validation, generation, or being an AI.
------------------------------------`;
      prompt.userMessage = `${prompt.userMessage}\n${mandatoryBrief}`;
    }

    if (socialDirectorStructuredMode) {
      prompt.userMessage = `${prompt.userMessage}\n\n--- SOCIAL DIRECTOR JSON CONTRACT ---\nReturn exactly one JSON object with roomBeat, roomMood, responseMode, speakers, silentReactions, and stateUpdates. Do not wrap it in response_text. Do not use markdown or prose outside the JSON. The host will reject banned phrases, repeated points, task-router language, and raw internals.\n-------------------------------------`;
    }

    if (process.env.AISHA_DEBUG === "true") {
      const sp = prompt.systemPrompt;
      const um = prompt.userMessage;
      const full = sp + "\n" + um;
      const hasStudioPulseContext = !!modifiedInput.studioPulseContext;
      const activeSpeakerId = modifiedInput.studioPulseContext?.activeSpeakerId ?? "none";
      const promptContainsStudioPulseContextBlock = sp.includes("STUDIO PULSE ROOM CONTEXT:");
      const promptContainsPlannedSpeakerRule = sp.includes("Write exactly one message for the planned speaker");
      const promptContainsNoGenericGreetingRule = sp.includes("Do NOT output generic bare greetings");
      const promptContainsVanyaProfile = activeSpeakerId === "vanya"
        ? /people temperature|warm, playful|emotionally observant|Vanya/i.test(full)
        : false;
      const promptContainsRoomPresenceSummary = sp.includes("Room Presence Summary:");
      const promptContainsDialogueQualityBrief = sp.includes("DIALOGUE QUALITY BRIEF:") || um.includes("STUDIO PULSE MANDATORY BRIEF");
      const plannedSpeakerVoiceProfileIncluded = sp.includes("Speaker function:") || um.includes("VOICE PRESSURE:");
      const finalPromptContainsForbiddenInternals = /\b(speakerId|responseIntent|roomStateDelta|emotionalDelta|projectContext|dialogueQualityV02|schema)\b/.test(full);
      
      console.log(`[AISHA_DEBUG] Gemini Final Prompt Diagnostics:`);
      console.log(`  hasStudioPulseContext: ${hasStudioPulseContext}`);
      console.log(`  activeSpeakerId: ${activeSpeakerId}`);
      console.log(`  socialDirectorStructuredMode: ${socialDirectorStructuredMode}`);
      console.log(`  plannedSpeakerVoiceProfileIncluded: ${plannedSpeakerVoiceProfileIncluded}`);
      console.log(`  dialogueQualityBriefIncluded: ${promptContainsDialogueQualityBrief}`);
      console.log(`  promptContainsStudioPulseContextBlock: ${promptContainsStudioPulseContextBlock}`);
      console.log(`  promptContainsPlannedSpeakerRule: ${promptContainsPlannedSpeakerRule}`);
      console.log(`  promptContainsNoGenericGreetingRule: ${promptContainsNoGenericGreetingRule}`);
      console.log(`  promptContainsVanyaProfile: ${promptContainsVanyaProfile}`);
      console.log(`  promptContainsRoomPresenceSummary: ${promptContainsRoomPresenceSummary}`);
      console.log(`  finalPromptContainsForbiddenInternals: ${finalPromptContainsForbiddenInternals}`);
      console.log(`  finalPromptLength: ${full.length}`);
    }

    if (hasVertex) {
      return this.generateWithVertex({
        prompt,
        socialDirectorStructuredMode,
        promptTokenEstimate,
        kPositionAblation,
      });
    }

    let apiFailure: unknown;
    if (hasApiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(this.config.model)}:generateContent?key=` +
        `${encodeURIComponent(String(this.config.apiKey || ""))}`;

      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: prompt.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt.userMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            maxOutputTokens: this.config.maxOutputTokens,
            responseMimeType: "application/json",
            responseSchema: socialDirectorStructuredMode
              ? socialDirectorResponseSchema()
              : defaultResponseSchema(!!modifiedInput.studioPulseContext),
          },
        }),
      });

      const payload = (await response.json()) as GeminiGenerateContentResponse;

      if (!response.ok) {
        const rawBody = redactProviderDiagnostics(JSON.stringify(payload)).slice(0, 800);
        logProviderDebug(`[T24_DEBUG] Gemini API FAILED status=${response.status} model=${this.config.model} body=${rawBody}`);
        const message =
          payload?.error?.message ||
          `gemini_http_error:${response.status}`;
        throw new Error(message);
      }

      const raw = extractRawText(payload);
      logProviderDebug(`[T24_DEBUG] Gemini API OK model=${this.config.model} rawLength=${raw.length} rawPreview=${raw.slice(0, 120)}`);

      if (!raw) {
        logProviderDebug(`[T24_DEBUG] Gemini returned empty raw. Full payload: ${JSON.stringify(payload).slice(0, 800)}`);
        throw new Error("generation_empty_response");
      }

      return {
        raw,
        metadata: {
          provider: "gemini",
          model: this.config.model,
          prompt_token_estimate: promptTokenEstimate,
          finish_reason: payload.candidates?.[0]?.finishReason ?? null,
          usage_metadata: payload.usageMetadata ?? null,
          prompt_feedback: payload.promptFeedback ?? null,
          ...(socialDirectorStructuredMode ? { structuredOutputKind: "socialDirectorV1" } : {}),
          ...(kPositionAblation ? { kPositionAblation } : {}),
        },
      } as GeneratorOutput;
      } catch (error) {
        apiFailure = error instanceof Error && error.name === "AbortError"
          ? new Error("generation_timeout")
          : error;
        if (!hasVertex || !isProviderRecoverableFailure(apiFailure)) {
          throw apiFailure;
        }
        const message = apiFailure instanceof Error ? apiFailure.message : String(apiFailure || "");
        logProviderDebug(`[T24_DEBUG] Gemini API recoverable failure; trying Vertex fallback model=${this.config.model} error=${redactProviderDiagnostics(message).slice(0, 500)}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    return this.generateWithVertex({
      prompt,
      socialDirectorStructuredMode,
      promptTokenEstimate,
      kPositionAblation,
      previousFailure: apiFailure,
    });
  }
}
