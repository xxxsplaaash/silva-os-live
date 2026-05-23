import {
  GeneratorOutput,
  IRuntimeParser,
  ParsedOutput,
} from "./runtime_types";

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export class StrictRuntimeParser implements IRuntimeParser {
  parse(output: GeneratorOutput): ParsedOutput {
    const directText =
      typeof output.text === "string" ? normalizeText(output.text) : null;

    if (directText && directText.length > 0) {
      return {
        text: directText,
        metadata: output.metadata ? { ...output.metadata } : undefined,
      };
    }

    if (
      output.raw &&
      typeof output.raw === "object" &&
      !Array.isArray(output.raw) &&
      typeof (output.raw as Record<string, unknown>).text === "string"
    ) {
      const nestedText = normalizeText(
        (output.raw as Record<string, string>).text,
      );

      if (nestedText.length > 0) {
        return {
          text: nestedText,
          metadata: output.metadata ? { ...output.metadata } : undefined,
        };
      }
    }

    throw new Error("parser_failed_closed:missing_text");
  }
}
