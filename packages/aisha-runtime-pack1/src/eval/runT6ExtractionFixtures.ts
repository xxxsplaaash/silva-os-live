import {
  T6_llm_extractor_contract_mocked,
  T6_extraction_gate_blocks_chatter,
  T6_extraction_gate_passes_preference,
} from "./t6ExtractionFixtures";

async function main() {
  console.log("Starting T6 Extraction Test Suite...");
  let passedCount = 0;
  let failedCount = 0;

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    process.stdout.write(`Running [${name}]... `);
    try {
      await testFn();
      console.log("✅ PASS");
      passedCount++;
    } catch (e: any) {
      console.log("❌ FAIL");
      console.error(`   - ${e.message}`);
      failedCount++;
    }
  };

  await runTest("T6_llm_extractor_contract_mocked", T6_llm_extractor_contract_mocked);
  await runTest("T6_extraction_gate_blocks_chatter", T6_extraction_gate_blocks_chatter);
  await runTest("T6_extraction_gate_passes_preference", T6_extraction_gate_passes_preference);

  console.log(`\nFinished T6 Evaluation. Passed: ${passedCount}, Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE RUNNER:", err);
  process.exit(1);
});
