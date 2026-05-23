#!/usr/bin/env npx tsx
/**
 * Pack 6.1 Continuity Demo UI Planning Validation Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 6.1 Continuity Demo UI Planning Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t63 = path.join(__dirname, "t63Pack61ContinuityDemoUIPlanningFixtures.ts");
try {
  execSync(`npx tsx ${t63}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
