#!/usr/bin/env npx tsx
/**
 * Pack 7.2 Static Judge Demo Visual Assets Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 7.2 Static Judge Demo Visual Assets Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t68 = path.join(__dirname, "t68Pack72StaticJudgeDemoVisualAssetsFixtures.ts");
try {
  execSync(`npx tsx ${t68}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
