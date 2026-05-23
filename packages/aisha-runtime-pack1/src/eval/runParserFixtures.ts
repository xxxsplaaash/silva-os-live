import * as parserModule from "./parserFixtures";

async function main() {
  const runParserFixtures =
    (parserModule as any).runParserFixtures ??
    (parserModule as any).default?.runParserFixtures;

  if (typeof runParserFixtures !== "function") {
    throw new Error("runParserFixtures export not found");
  }

  await runParserFixtures();
}

main().catch((err) => {
  console.error("FATAL ERROR IN PARSER FIXTURE RUNNER:", err);
  process.exit(1);
});
