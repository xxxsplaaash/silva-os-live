#!/usr/bin/env npx tsx
/**
 * Pack 7.0 Next Arc Planning Validation Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 7.0 Next Arc Planning Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t66 = path.join(__dirname, "t66Pack70NextArcPlanningFixtures.ts");
try {
  execSync(`npx tsx ${t66}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
