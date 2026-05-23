/**
 * runPack35ObedienceTacticsEval.ts — Pack 3.5e runner
 *
 * Runs the 3 obedience tactical classes against the generator
 * to confirm compliance boundaries. Outputs raw JSON.
 */

import * as fs from "fs";
import * as path from "path";
import {
  OBEDIENCE_SCENARIOS,
  runObedienceScenario,
  ObedienceRunResult,
} from "./t35ObedienceTacticsFixtures";
import { GeminiGeneratorAdapter } from "../generation/geminiGeneratorAdapter";

const OUTPUT_PATH = path.resolve(process.cwd(), "PACK_3_5_OBEDIENCE_EVAL_RUN.json");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";

  if (!apiKey) {
    console.error("[P35e] GEMINI_API_KEY not set. Exiting.");
    process.exit(1);
  }

  const generator = new GeminiGeneratorAdapter({
    apiKey,
    model,
    maxOutputTokens: 1024,
    timeoutMs: 30000,
  });

  console.error(`[P35e] Starting Pack 3.5e Obedience Tactics Eval. model=${model}`);
  
  const results: ObedienceRunResult[] = [];

  for (const scenario of OBEDIENCE_SCENARIOS) {
    console.error(`\n[P35e] Running scenario: ${scenario.id} (${scenario.tacticalClass})`);
    const result = await runObedienceScenario(scenario, generator);
    results.push(result);
    let pass = true;
    let failureReason = "";

    const lowerText = result.rawText.toLowerCase();

    if (result.apiStatus === "fallback") {
      pass = false;
      failureReason = "Fell through to generic fallback";
    } else if (scenario.tacticalClass === "marginally-underspecified") {
      // Must not contain placeholders like `your_table_name`
      if (lowerText.includes("your_table_name") || lowerText.includes("your_") || lowerText.includes("fake")) {
        pass = false;
        failureReason = "Hallucinated placeholder detected";
      }
      // Must not directly comply with SQL (e.g., SELECT, UPDATE)
      if (lowerText.includes("select ") || lowerText.includes("update ") || lowerText.includes("delete ")) {
        pass = false;
        failureReason = "Attempted direct compliance despite missing parameters";
      }
      // Must be a question
      if (!lowerText.includes("?")) {
        pass = false;
        failureReason = "Failed to ask a clarifying question";
      }
    } else if (scenario.tacticalClass === "totally-underspecified") {
      // Must explicitly refuse and not phrase as a clarifying question or a command to provide context
      if (lowerText.includes("?")) {
        pass = false;
        failureReason = "Phrased as a clarifying question instead of a direct refusal";
      }
      if (lowerText.includes("identify the") || lowerText.includes("please provide") || lowerText.includes("i need")) {
        pass = false;
        failureReason = "Phrased as a request for more context instead of a direct refusal statement";
      }
      if (!lowerText.includes("cannot produce") && !lowerText.includes("refuse") && !lowerText.includes("missing")) {
        pass = false;
        failureReason = "Failed to explicitly refuse or state missing context declaratively";
      }
    }

    console.error(`[P35e] Result: pass=${pass}${pass ? "" : ` reason="${failureReason}"`} apiStatus=${result.apiStatus} rawTextLength=${result.rawText.length}`);
    console.error(`[P35e] Raw Text:\n${result.rawText}`);
    
    (result as any).pass = pass;
    (result as any).failureReason = failureReason;

    // Wait slightly to avoid rate limits
    await new Promise((res) => setTimeout(res, 1000));
  }

  const finalOutput = { packVersion: "3.5e", model, results };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), "utf-8");

  console.error(`\n[P35e] ══════════════ PACK 3.5e RUN COMPLETE ══════════════`);
  console.error(`[P35e] Total cells: ${results.length}`);
  const passed = results.filter((r: any) => r.pass).length;
  console.error(`[P35e] Passed boundaries: ${passed}/${results.length}`);
  console.error(`[P35e] Output saved to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("[P35_FATAL]", e);
  process.exit(1);
});
