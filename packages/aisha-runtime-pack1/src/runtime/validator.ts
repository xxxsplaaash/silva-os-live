import {
  IRuntimeValidator,
  ParsedOutput,
  ValidationResult,
} from "./runtime_types";

const MAX_OUTPUT_CHARS = 4000;

const FORBIDDEN_MARKERS = [
  "---STABLE_NOTES---",
  "---END_STABLE_NOTES---",
  "---THREAD_CONTEXT---",
  "---END_THREAD_CONTEXT---",
  "---EPISODE_EVIDENCE---",
  "---END_EPISODE_EVIDENCE---",
  "{{",
  "}}",
  "[object Object]",
];

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /\[INSERT RESPONSE\]/i,
  /<placeholder>/i,
  /\blorem ipsum\b/i,
];

function hasDisallowedControlCharacters(text: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
}

function looksLikeJsonLeak(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) return false;

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return true;
  }

  return (
    trimmed.includes('"response_text"') ||
    trimmed.includes('"state_metadata"') ||
    trimmed.includes('"internal_reasoning"')
  );
}

function hasPlaceholderPattern(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

function collectFailureReasons(text: string, options: { allowJsonLeak?: boolean } = {}): string[] {
  const reasons: string[] = [];

  if (!text) reasons.push("empty_output");
  if (text.length > MAX_OUTPUT_CHARS) reasons.push("output_too_long");

  for (const marker of FORBIDDEN_MARKERS) {
    if (options.allowJsonLeak && (marker === "{{" || marker === "}}")) {
      continue;
    }
    if (text.includes(marker)) {
      reasons.push(`leaked_internal_marker:${marker}`);
    }
  }

  if (hasPlaceholderPattern(text)) {
    reasons.push("placeholder_output");
  }

  if (!options.allowJsonLeak && looksLikeJsonLeak(text)) {
    reasons.push("json_leak");
  }

  if (hasDisallowedControlCharacters(text)) {
    reasons.push("control_characters");
  }

  return reasons;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function isSocialDirectorJson(text: string): boolean {
  const parsed = parseJsonObject(text);
  if (!parsed) return false;
  return (
    typeof parsed.roomBeat === "string" &&
    typeof parsed.roomMood === "string" &&
    typeof parsed.responseMode === "string" &&
    Array.isArray(parsed.speakers) &&
    parsed.speakers.length > 0
  );
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export class MinimalRuntimeValidator implements IRuntimeValidator {
  validate(input: {
    parsed: ParsedOutput;
    turn: { rawText: string };
    snapshot: { expressiveEnvelope: Record<string, number> };
    retrieval: {
      activeNotes: Array<unknown>;
      contradictionEvidence: Array<unknown>;
    };
  }): ValidationResult {
    const text = input.parsed.text.trim();
    const structuredOutputKind = String(input.parsed.metadata?.structuredOutputKind || "");
    const socialDirectorMode = structuredOutputKind === "socialDirectorV1";
    const reasons = collectFailureReasons(text, { allowJsonLeak: socialDirectorMode });

    if (socialDirectorMode && !isSocialDirectorJson(text)) {
      reasons.push("invalid_social_director_json");
    }

    return {
      valid: reasons.length === 0,
      reasons: dedupe(reasons),
    };
  }
}
