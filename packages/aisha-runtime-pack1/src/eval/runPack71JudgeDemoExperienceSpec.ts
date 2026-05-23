#!/usr/bin/env npx tsx
/**
 * Pack 7.1 Judge Demo Experience Spec Validation Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 7.1 Judge Demo Experience Spec Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t67 = path.join(__dirname, "t67Pack71JudgeDemoExperienceSpecFixtures.ts");
try {
  execSync(`npx tsx ${t67}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
