#!/usr/bin/env npx tsx
/**
 * Pack 8.0 Next Arc Planning Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 8.0 Next Arc Planning Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t70 = path.join(__dirname, "t70Pack80NextArcPlanningFixtures.ts");
try {
  execSync(`npx tsx ${t70}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
