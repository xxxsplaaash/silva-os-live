#!/usr/bin/env npx tsx
/**
 * Pack 8.1 External Judge Demo Handoff Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 8.1 External Judge Demo Handoff Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t71 = path.join(__dirname, "t71Pack81ExternalJudgeDemoHandoffFixtures.ts");
try {
  execSync(`npx tsx ${t71}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
