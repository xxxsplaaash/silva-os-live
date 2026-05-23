#!/usr/bin/env npx tsx
/**
 * Pack 7.3 Judge Demo Phase Closeout Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 7.3 Judge Demo Phase Closeout Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t69 = path.join(__dirname, "t69Pack73JudgeDemoPhaseCloseoutFixtures.ts");
try {
  execSync(`npx tsx ${t69}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
