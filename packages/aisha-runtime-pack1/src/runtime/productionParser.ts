import {
  GeneratorOutput,
  IRuntimeParser,
  ParsedOutput,
} from "./runtime_types";

const PARSER_SAFETY_SCAN_LIMIT = 2000;
// PARSER_SAFETY_SCAN_LIMIT is a safety bound against regex catastrophic
// backtracking on malformed model output with repeated characters.
// It is NOT a semantic guarantee about output length and must not be treated
// as a content truncation policy.

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function cloneMetadata(output: GeneratorOutput): Record<string, unknown> | undefined {
  return output.metadata ? { ...output.metadata } : undefined;
}

function buildParsedOutput(
  text: string,
  output: GeneratorOutput,
): ParsedOutput {
  return {
    text: normalizeText(text),
    metadata: cloneMetadata(output),
  };
}

function tryParseResponseTextObject(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.response_text === "string" && record.response_text.trim().length > 0) {
    return record.response_text;
  }

  if (typeof record.text === "string" && record.text.trim().length > 0) {
    return record.text;
  }

  return null;
}

function isSocialDirectorOutputKind(output: GeneratorOutput): boolean {
  return String(output.metadata?.structuredOutputKind || "") === "socialDirectorV1";
}

function isSocialDirectorObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.roomBeat === "string" &&
    typeof record.roomMood === "string" &&
    typeof record.responseMode === "string" &&
    Array.isArray(record.speakers)
  );
}

function tryParseSocialDirectorObject(value: unknown): string | null {
  if (!isSocialDirectorObject(value)) return null;
  return JSON.stringify(value);
}

function safeSlice(text: string): string {
  return text.trim().slice(0, PARSER_SAFETY_SCAN_LIMIT);
}

function tryDirectJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(safeSlice(raw));
    return tryParseResponseTextObject(parsed);
  } catch {
    return null;
  }
}

function tryDirectSocialDirectorJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(safeSlice(raw));
    return tryParseSocialDirectorObject(parsed);
  } catch {
    return null;
  }
}

function tryFencedJson(raw: string): string | null {
  const matches = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);

  for (const match of matches) {
    const inner = match[1]?.trim();
    if (!inner) continue;

    const cleaned = safeSlice(inner).replace(/,\s*([}\]])/g, "$1");

    try {
      const parsed = JSON.parse(cleaned);
      const text = tryParseResponseTextObject(parsed);
      if (text) return text;
    } catch {
      // keep scanning other fenced blocks
    }
  }

  return null;
}

function tryFencedSocialDirectorJson(raw: string): string | null {
  const matches = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);

  for (const match of matches) {
    const inner = match[1]?.trim();
    if (!inner) continue;

    const cleaned = safeSlice(inner).replace(/,\s*([}\]])/g, "$1");

    try {
      const parsed = JSON.parse(cleaned);
      const text = tryParseSocialDirectorObject(parsed);
      if (text) return text;
    } catch {
      // keep scanning other fenced blocks
    }
  }

  return null;
}

function tryOuterJsonSubstring(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1);

  try {
    const parsed = JSON.parse(safeSlice(candidate));
    return tryParseResponseTextObject(parsed);
  } catch {
    return null;
  }
}

function tryOuterSocialDirectorJsonSubstring(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1);

  try {
    const parsed = JSON.parse(safeSlice(candidate));
    return tryParseSocialDirectorObject(parsed);
  } catch {
    return null;
  }
}

function decodeLooseJsonString(text: string): string {
  try {
    return JSON.parse(`"${text}"`);
  } catch {
    return text
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }
}

function tryRegexScrape(raw: string): string | null {
  const sliced = raw.slice(0, PARSER_SAFETY_SCAN_LIMIT);
  const anchor = /"response_text"\s*:\s*"/s.exec(sliced);

  if (!anchor) {
    return null;
  }

  let i = anchor.index + anchor[0].length;
  let out = "";

  while (i < sliced.length) {
    const ch = sliced[i];

    if (ch === "\\") {
      const next = sliced[i + 1];
      if (next == null) {
        break;
      }

      out += `\\${next}`;
      i += 2;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < sliced.length && /\s/.test(sliced[j])) {
        j += 1;
      }

      const next = sliced[j];

      if (next === "," || next === "}" || next === "]" || next == null) {
        return decodeLooseJsonString(out);
      }

      out += '"';
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out.trim().length > 0 ? decodeLooseJsonString(out.trim()) : null;
}

export class ProductionParser implements IRuntimeParser {
  parse(output: GeneratorOutput): ParsedOutput {
    if (isSocialDirectorOutputKind(output)) {
      if (typeof output.text === "string" && output.text.trim().length > 0) {
        const directText = tryDirectSocialDirectorJson(output.text);
        if (directText) return buildParsedOutput(directText, output);
      }

      const objectText = tryParseSocialDirectorObject(output.raw);
      if (objectText) return buildParsedOutput(objectText, output);

      const raw =
        typeof output.raw === "string"
          ? output.raw
          : output.raw != null
            ? JSON.stringify(output.raw)
            : "";

      if (!raw.trim()) {
        throw new Error("parser_failed_closed:empty_output");
      }

      const directJson = tryDirectSocialDirectorJson(raw);
      if (directJson) return buildParsedOutput(directJson, output);

      const fencedJson = tryFencedSocialDirectorJson(raw);
      if (fencedJson) return buildParsedOutput(fencedJson, output);

      const outerJson = tryOuterSocialDirectorJsonSubstring(raw);
      if (outerJson) return buildParsedOutput(outerJson, output);

      throw new Error("parser_failed_closed:social_director_json_parse_failed");
    }

    if (typeof output.text === "string" && output.text.trim().length > 0) {
      return buildParsedOutput(output.text, output);
    }

    const objectText = tryParseResponseTextObject(output.raw);
    if (objectText) {
      return buildParsedOutput(objectText, output);
    }

    const raw =
      typeof output.raw === "string"
        ? output.raw
        : output.raw != null
          ? JSON.stringify(output.raw)
          : "";

    if (!raw.trim()) {
      throw new Error("parser_failed_closed:empty_output");
    }

    const directJson = tryDirectJson(raw);
    if (directJson) {
      return buildParsedOutput(directJson, output);
    }

    const fencedJson = tryFencedJson(raw);
    if (fencedJson) {
      return buildParsedOutput(fencedJson, output);
    }

    const outerJson = tryOuterJsonSubstring(raw);
    if (outerJson) {
      return buildParsedOutput(outerJson, output);
    }

    const scraped = tryRegexScrape(raw);
    if (scraped && scraped.trim().length > 0) {
      return buildParsedOutput(scraped, output);
    }

    throw new Error("parser_failed_closed:all_tiers_exhausted");
  }
}
