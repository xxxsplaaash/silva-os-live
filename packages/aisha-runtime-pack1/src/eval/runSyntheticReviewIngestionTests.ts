import * as assert from "node:assert";
import { renderReviewPacket, renderAnswerKey, summarizePreferences, ReviewRating, BlindedPacket } from "./t25BlindABReview";
import { ingestRatings, renderDecisionReport, CompletedRating, DimensionRatings } from "./t26ReviewIngestion";
import { generateBlankReviewTemplate, validateReviewerTemplate } from "./t27HumanReviewRun";

const K_MECHANISM_TOKENS = [
  "communication_pace",
  "detail_tolerance",
  "task_structure_preference",
  "K_position",
  "kPositionBias",
  "kPositionAblation",
  "adjustmentsApplied",
  "biasInputCount",
];

function buildSyntheticPacket(): BlindedPacket {
  return {
    pairs: [
      { scenarioId: "S1", context: "Testing context 1", userMessage: "Msg 1", textA: "A1 text", textB: "B1 text" },
      { scenarioId: "S2", context: "Testing context 2", userMessage: "Msg 2", textA: "A2 text", textB: "B2 text" },
      { scenarioId: "S3", context: "Testing context 3", userMessage: "Msg 3", textA: "A3 text", textB: "B3 text" },
      { scenarioId: "S4", context: "Testing context 4", userMessage: "Msg 4", textA: "A4 text", textB: "B4 text" },
      { scenarioId: "S_NEG", context: "[CONTROL: Evaluator Calibration] Negative case", userMessage: "Msg Neg", textA: "A5 text", textB: "B5 text" }
    ],
    answerKey: [
      { scenarioId: "S1", baseline: "A", shaped: "B", shapingFired: true, adjustmentsApplied: ["adj1"] },
      { scenarioId: "S2", baseline: "B", shaped: "A", shapingFired: true, adjustmentsApplied: ["adj2"] },
      { scenarioId: "S3", baseline: "A", shaped: "B", shapingFired: true, adjustmentsApplied: ["adj3"] },
      { scenarioId: "S4", baseline: "B", shaped: "A", shapingFired: true, adjustmentsApplied: ["adj4"] },
      { scenarioId: "S_NEG", baseline: "A", shaped: "B", shapingFired: false, adjustmentsApplied: [] }
    ]
  };
}

function buildSyntheticRatings(packet: BlindedPacket): CompletedRating[] {
  const ratings: CompletedRating[] = [];
  for (const pair of packet.pairs) {
    const key = packet.answerKey.find((k) => k.scenarioId === pair.scenarioId)!;
    const isNegativeCase = pair.scenarioId === "S_NEG";

    const shapedScores: DimensionRatings = {
      directness: isNegativeCase ? 3 : 4,
      usefulness: 4,
      loopBreaking: isNegativeCase ? 3 : 5,
      voiceIntegrity: 4,
      overAggression: 1,
      weirdnessMismatch: 1,
    };

    const baselineScores: DimensionRatings = {
      directness: 3,
      usefulness: 4,
      loopBreaking: 2,
      voiceIntegrity: 4,
      overAggression: 1,
      weirdnessMismatch: 1,
    };

    const sideA = key.shaped === "A" ? shapedScores : baselineScores;
    const sideB = key.shaped === "B" ? shapedScores : baselineScores;

    const overallPreference = isNegativeCase ? "Tie" : key.shaped;

    ratings.push({
      scenarioId: pair.scenarioId,
      sideA,
      sideB,
      overallPreference,
      note: isNegativeCase ? "Note" : undefined,
    });
  }
  return ratings;
}

async function main() {
  console.log("Starting Synthetic Review Ingestion Tests...\n");

  let totalPass = 0;
  let totalFail = 0;

  function check(label: string, fn: () => void) {
    process.stdout.write(`Running [${label}]... `);
    try {
      fn();
      console.log("✅ PASS");
      totalPass++;
    } catch (err: any) {
      console.log("❌ FAIL\n   " + err.message);
      totalFail++;
    }
  }

  const packet = buildSyntheticPacket();
  const answerKey = packet.answerKey;
  const goodRatings = buildSyntheticRatings(packet);

  // ── Testing T25 Components ──
  check("T25_SYNTH_summarize_preferences_tallies_correctly", () => {
    const syntheticRatings: ReviewRating[] = packet.pairs.map((p) => ({
      scenarioId: p.scenarioId,
      overallPreference: "A",
    }));

    const summary = summarizePreferences(syntheticRatings, answerKey);
    assert.strictEqual(summary.total, packet.pairs.length);

    const aIsShaped = answerKey.filter((k) => k.shaped === "A").length;
    const aIsBaseline = answerKey.filter((k) => k.baseline === "A").length;

    assert.strictEqual(summary.shapedPreferred, aIsShaped);
    assert.strictEqual(summary.baselinePreferred, aIsBaseline);
    assert.strictEqual(summary.ties, 0);
  });

  // ── Testing T26 Components ──
  check("T26_SYNTH_ingestion_produces_correct_scenario_count", () => {
    const summary = ingestRatings(goodRatings, answerKey);
    assert.strictEqual(summary.totalScenarios, packet.pairs.length);
  });

  check("T26_SYNTH_shaped_wins_counted_correctly", () => {
    const summary = ingestRatings(goodRatings, answerKey);
    assert.strictEqual(summary.shapedWins, 4);
    assert.strictEqual(summary.baselineWins, 0);
    assert.strictEqual(summary.ties, 1);
  });

  check("T26_SYNTH_dimension_averages_are_computed", () => {
    const summary = ingestRatings(goodRatings, answerKey);
    // Directness: shaped=4 on 4 positive, 3 on 1 negative → avg = (4*4+3)/5 = 3.8
    assert.strictEqual(summary.dimensions.directness.shapedAvg, 3.8);
    // Baseline directness: 3 on all → avg = 3.0
    assert.strictEqual(summary.dimensions.directness.baselineAvg, 3.0);
    assert.strictEqual(Math.abs(summary.dimensions.directness.delta - 0.8) < 0.0001, true);
  });

  check("T26_SYNTH_report_has_zero_mechanism_leakage", () => {
    const summary = ingestRatings(goodRatings, answerKey);
    const report = renderDecisionReport(summary);
    for (const token of K_MECHANISM_TOKENS) {
      assert.strictEqual(
        report.includes(token),
        false,
        `Decision report leaks mechanism token: "${token}"`
      );
    }
  });

  // ── Testing T27 Components ──
  check("T27_SYNTH_blank_template_is_valid", () => {
    const blankTemplate = generateBlankReviewTemplate(packet);
    assert.ok(
        validateReviewerTemplate(blankTemplate),
        "Blank template must validate"
    );
  });

  check("T27_SYNTH_multi_reviewer_combines_correctly", () => {
    const blankTemplate = generateBlankReviewTemplate(packet);
    const reviewer1 = JSON.parse(JSON.stringify(blankTemplate)) as CompletedRating[];
    const reviewer2 = JSON.parse(JSON.stringify(blankTemplate)) as CompletedRating[];
    
    // Quick fill
    for (let i = 0; i < reviewer1.length; i++) {
        reviewer1[i].overallPreference = "A";
        reviewer2[i].overallPreference = "A";
    }

    const multiReviewerPayload = [...reviewer1, ...reviewer2];
    const summary = ingestRatings(multiReviewerPayload, answerKey);
    assert.strictEqual(summary.totalScenarios, packet.pairs.length * 2);
  });

  console.log(`\nFinished Synthetic Tests. Passed: ${totalPass}, Failed: ${totalFail}`);
  if (totalFail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
