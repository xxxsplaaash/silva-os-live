#!/usr/bin/env npx tsx
/**
 * Pack 5.3 Stakeholder Brief Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 5.3 Stakeholder Brief Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t60 = path.join(__dirname, "t60Pack53StakeholderBriefFixtures.ts");
try {
  execSync(`npx tsx ${t60}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
