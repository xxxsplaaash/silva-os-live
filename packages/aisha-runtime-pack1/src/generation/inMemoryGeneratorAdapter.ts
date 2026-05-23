import {
  GeneratorInput,
  GeneratorOutput,
  IGeneratorAdapter,
} from "../runtime/runtime_types";
import {
  ResponseShapingBlock,
  translateStateToResponseShaping,
} from "../expression/semanticStateTranslator";
import {
  arbitrateResponseIntent,
  ResponseIntentDecision,
} from "../runtime/responseIntentArbitrator";
import { applyExpressionGuardrails } from "../expression/expressionGuardrails";

// ─── Pack 2.7: K_position invisible shaping ───────────────────────────────────
//
// Shaping constants. Only these domains produce shaping adjustments.
// Bias threshold: adjustments only fire when |bias| > BIAS_THRESHOLD and
// confidence >= CONFIDENCE_THRESHOLD. Both must be met.
//
// HARD RULES:
//   1. These adjustments NEVER emit user-visible text.
//   2. These adjustments NEVER modify stableNotesBlock or any note.
//   3. These adjustments only affect ResponseShapingBlock.directives and
//      ResponseIntentDecision.intent (bounded to 3 specific cases).
//   4. When kPositionBiases is absent/undefined, this function is not called.

const K_BIAS_THRESHOLD = 0.5;        // |bias| must exceed this to apply shaping
const K_CONFIDENCE_THRESHOLD = 0.45; // confidence must meet MIN_CONFIDENCE_TO_SHAPE

interface KPositionShapingResult {
  block: ResponseShapingBlock;
  intentDecision: ResponseIntentDecision;
  /** Ablation log: what adjustments were applied. Empty if none. */
  adjustmentsApplied: string[];
}

function applyKPositionShaping(
  kPositionBiases: ReadonlyArray<{ domain: string; bias: number; confidence: number }>,
  block: ResponseShapingBlock,
  intentDecision: ResponseIntentDecision,
): KPositionShapingResult {
  // Defensive copy — never mutate the originals
  const adjustedDirectives = [...block.directives];
  let adjustedIntent = intentDecision.intent;
  const adjustedReasons = [...intentDecision.reasons];
  const adjustmentsApplied: string[] = [];

  for (const bias of kPositionBiases) {
    if (bias.confidence < K_CONFIDENCE_THRESHOLD) continue;
    if (Math.abs(bias.bias) <= K_BIAS_THRESHOLD) continue;

    switch (bias.domain) {
      case "communication_pace":
        // Positive bias (fast/direct) + intent would be "normal" → push toward "direct_answer"
        if (bias.bias > K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "direct_answer";
          adjustedReasons.push("k_position_communication_pace_direct");
          adjustmentsApplied.push("communication_pace:normal→direct_answer");
        }
        // Negative bias (slow/exploratory) + intent would be "normal" → push toward "question_forward"
        if (bias.bias < -K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "question_forward";
          adjustedReasons.push("k_position_communication_pace_exploratory");
          adjustmentsApplied.push("communication_pace:normal→question_forward");
        }
        break;

      case "detail_tolerance":
        // Positive bias (depth) → add deepening directive
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prioritize_deepening")) {
          adjustedDirectives.push("prioritize_deepening");
          adjustmentsApplied.push("detail_tolerance:+deepening_directive");
        }
        // Negative bias (brevity) → reinforce concise directive
        if (bias.bias < -K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_concise_task_forward_output")) {
          adjustedDirectives.push("prefer_concise_task_forward_output");
          adjustmentsApplied.push("detail_tolerance:+concise_directive");
        }
        break;

      case "task_structure_preference":
        // Positive bias (granular) → add structural directive
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_granular_structure")) {
          adjustedDirectives.push("prefer_granular_structure");
          adjustmentsApplied.push("task_structure_preference:+granular_directive");
        }
        break;

      // All other domains: no shaping action in this pack
      default:
        break;
    }
  }

  return {
    block: { ...block, directives: adjustedDirectives },
    intentDecision: { intent: adjustedIntent, reasons: adjustedReasons },
    adjustmentsApplied,
  };
}
// ─── End Pack 2.7 K_position shaping ─────────────────────────────────────────


function extractStableNoteLines(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith("---") &&
        line !== "(none)",
    );
}

function sanitizeInline(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildNormalLead(block: ResponseShapingBlock): string | null {
  if (block.priority === "hedge") {
    return "I may be wrong, but";
  }

  if (block.priority === "reassure") {
    return "You're okay.";
  }

  if (block.warmth === "warm") {
    return "Glad to help.";
  }

  if (block.caution === "high") {
    return "Let's be careful.";
  }

  return null;
}

function buildIntentLead(
  decision: ResponseIntentDecision,
  block: ResponseShapingBlock,
): string[] {
  const parts: string[] = [];

  if (
    block.caution === "high" &&
    (decision.intent === "clarify" || decision.intent === "narrow_claim")
  ) {
    parts.push("Let's be careful.");
  }

  switch (decision.intent) {
    case "direct_answer":
      parts.push("Here's the direct answer.");
      return parts;

    case "clarify":
      parts.push("Can you clarify what changed most?");
      return parts;

    case "narrow_claim":
      parts.push("Based on what you've said so far,");
      return parts;

    case "question_forward":
      parts.push("Tell me a bit more about that.");
      return parts;

    case "minimal":
      return parts;

    case "normal":
    default: {
      const normalLead = buildNormalLead(block);
      if (normalLead) parts.push(normalLead);
      return parts;
    }
  }
}

function buildCore(
  decision: ResponseIntentDecision,
  block: ResponseShapingBlock,
  rawText: string,
): string | null {
  const cleaned = sanitizeInline(rawText);

  if (decision.intent === "clarify" || decision.intent === "question_forward") {
    return null;
  }

  if (block.brevity === "concise" || decision.intent === "minimal") {
    return `Next step: ${cleaned}.`;
  }

  return `Stub response to: ${cleaned}.`;
}

/**
 * Deterministic fixture-path generator.
 *
 * Special fixture-only failure triggers:
 * - [[fixture:parser_fail]]
 * - [[fixture:validator_fail]]
 */
export class InMemoryGeneratorAdapter implements IGeneratorAdapter {
  async generate(input: GeneratorInput): Promise<GeneratorOutput> {
    const rawText = input.turn.rawText;

    if (rawText.includes("[[fixture:parser_fail]]")) {
      return {
        raw: {},
        metadata: {
          generator: "in_memory_fixture_adapter",
          failureMode: "parser_fail",
        },
      };
    }

    if (rawText.includes("[[fixture:validator_fail]]")) {
      return {
        raw: {
          text: "TODO",
        },
        metadata: {
          generator: "in_memory_fixture_adapter",
          failureMode: "validator_fail",
        },
      };
    }

    let block = translateStateToResponseShaping(input.snapshot);
    let intentDecision = arbitrateResponseIntent({
      turn: input.turn,
      snapshot: input.snapshot,
    });

    // ── Pack 2.7: Apply K_position invisible shaping ──────────────────────────
    // Only fires when kPositionBiases is present and non-empty.
    // Hot path passes kPositionBiases as undefined — this branch never executes
    // on the live hot path without explicit opt-in from the async shaping layer.
    // No user-visible text is ever produced here.
    let kPositionAblation: { adjustmentsApplied: string[]; biasInputCount: number } | undefined;

    if (input.kPositionBiases && input.kPositionBiases.length > 0) {
      const shapingResult = applyKPositionShaping(
        input.kPositionBiases,
        block,
        intentDecision,
      );
      block = shapingResult.block;
      intentDecision = shapingResult.intentDecision;
      kPositionAblation = {
        adjustmentsApplied: shapingResult.adjustmentsApplied,
        biasInputCount: input.kPositionBiases.length,
      };
    }
    // ── End Pack 2.7 shaping ──────────────────────────────────────────────────

    const stableNoteLines = extractStableNoteLines(
      input.memoryContext.stableNotesBlock,
    );

    const noteHint =
      stableNoteLines.length > 0
        ? `Memory loaded: ${sanitizeInline(stableNoteLines[0])}.`
        : null;

    const bodyParts: string[] = [];

    bodyParts.push(...buildIntentLead(intentDecision, block));

    const core = buildCore(intentDecision, block, input.turn.rawText);
    if (core) bodyParts.push(core);

    if (intentDecision.intent === "question_forward") {
      bodyParts.push("What part matters most?");
    }

    const guardedBody = applyExpressionGuardrails({
      bodyText: bodyParts.join(" "),
      shaping: block,
      intentDecision,
    });

    const parts: string[] = [guardedBody];

    if (noteHint) parts.push(noteHint);

    const text = parts.join(" ");

    return {
      raw: { text },
      metadata: {
        generator: "in_memory_fixture_adapter",
        stableNotesCount: stableNoteLines.length,
        responseShaping: block,
        responseIntent: intentDecision,
        // Pack 2.7 ablation report — present only when K_position shaping was active
        ...(kPositionAblation ? { kPositionAblation } : {}),
      },
    };
  }
}
