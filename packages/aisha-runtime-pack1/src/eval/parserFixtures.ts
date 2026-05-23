import { ProductionParser } from "../runtime/productionParser";

export interface ParserTestScenario {
  id: string;
  description: string;
  inputRaw: string;
  expectedOutcome: "success" | "fail";
  expectedText?: string;
}

export const PARSER_FIXTURES: ParserTestScenario[] = [
  {
    id: "T_Parse_01",
    description: "Perfect flat JSON",
    inputRaw: `{
  "state_metadata": {
    "intended_intent": "clarify"
  },
  "response_text": "I can definitely help with that."
}`,
    expectedOutcome: "success",
    expectedText: "I can definitely help with that.",
  },
  {
    id: "T_Parse_02",
    description: "JSON wrapped in codeblocks",
    inputRaw: `Here is the requested output:
\`\`\`json
{
  "state_metadata": { "intended_intent": "direct_answer" },
  "response_text": "The answer is 42."
}
\`\`\`
Hope this helps!`,
    expectedOutcome: "success",
    expectedText: "The answer is 42.",
  },
  {
    id: "T_Parse_03",
    description: "Hallucinated prepended conversational filler without codeblocks",
    inputRaw: `Here is the response you asked for:
{
  "state_metadata": { "intended_intent": "normal" },
  "response_text": "I'm ready for the next task."
}`,
    expectedOutcome: "success",
    expectedText: "I'm ready for the next task.",
  },
  {
    id: "T_Parse_04",
    description: "Truncated JSON without closing brackets",
    // Missing closing bracket for state_metadata and the main object entirely
    inputRaw: `{
  "response_text": "This got cut off in the middle of generation.",
  "state_metadata": {
    "intended_intent": "norm`,
    expectedOutcome: "success",
    expectedText: "This got cut off in the middle of generation.",
  },
  {
    id: "T_Parse_05",
    description: "Unescaped quotes inside the response_text string",
    // The JSON string contains unescaped quotes which normally breaks JSON.parse
    inputRaw: `{
  "state_metadata": { "intended_intent": "normal" },
  "response_text": "She said "hello" to me."
}`,
    expectedOutcome: "success",
    expectedText: "She said \"hello\" to me.",
  },
  {
    id: "T_Parse_06",
    description: "Total hallucination where no JSON structure is present",
    inputRaw: `I'm sorry, I cannot assist with that request. Please try again later.`,
    expectedOutcome: "fail", // Should synchronously throw a safe format rejection
  },
  {
    id: "T_Parse_07",
    description: "Recorded Real Model Output with missing metadata",
    inputRaw: `\`\`\`json
{
  "response_text": "Got it, I'll keep that in mind."
}
\`\`\``,
    expectedOutcome: "success",
    expectedText: "Got it, I'll keep that in mind.",
  },
  {
    id: "T_Parse_08",
    description: "Valid JSON with trailing text",
    inputRaw: `{
  "state_metadata": { "intended_intent": "normal" },
  "response_text": "This is valid JSON."
}
Note: the model decided to append this trailing text for some reason and has a } symbol here.`,
    expectedOutcome: "success",
    expectedText: "This is valid JSON.",
  },
  {
    id: "T_Parse_09",
    description: "Multiple fenced blocks where only one contains target JSON",
    inputRaw: `I thought about the problem.
\`\`\`text
User said: Hello
\`\`\`
So I will reply:
\`\`\`json
{
  "response_text": "I see you said hello."
}
\`\`\``,
    expectedOutcome: "success",
    expectedText: "I see you said hello.",
  }
];

export async function runParserFixtures() {
  const parser = new ProductionParser();
  let passed = 0;
  
  for (const fixture of PARSER_FIXTURES) {
    try {
      const result = parser.parse({ raw: fixture.inputRaw });
      
      if (fixture.expectedOutcome === "fail") {
        console.error(`[FAIL] ${fixture.id}: Expected to fail but succeeded.`);
        continue;
      }
      
      if (result.text === fixture.expectedText) {
        console.log(`[PASS] ${fixture.id}`);
        passed++;
      } else {
        console.error(`[FAIL] ${fixture.id}: Expected text "${fixture.expectedText}", got "${result.text}"`);
      }
    } catch (e: any) {
      if (fixture.expectedOutcome === "fail") {
        console.log(`[PASS] ${fixture.id}`);
        passed++;
      } else {
        console.error(`[FAIL] ${fixture.id}: Expected success but threw error (${e.message})`);
      }
    }
  }
  
  console.log(`\nFinal Stats: ${passed} / ${PARSER_FIXTURES.length}`);
  if (passed !== PARSER_FIXTURES.length) {
    process.exit(1);
  }
}
