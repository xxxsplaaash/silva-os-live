#!/usr/bin/env npx tsx
/**
 * Pack 5.4 Continuity Demo Closeout Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 5.4 Continuity Demo Closeout Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t61 = path.join(__dirname, "t61Pack54ContinuityDemoCloseoutFixtures.ts");
try {
  execSync(`npx tsx ${t61}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
