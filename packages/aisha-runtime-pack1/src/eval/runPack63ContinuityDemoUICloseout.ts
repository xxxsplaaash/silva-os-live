#!/usr/bin/env npx tsx
/**
 * Pack 6.3 Continuity Demo UI Closeout Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 6.3 Continuity Demo UI Closeout Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t65 = path.join(__dirname, "t65Pack63ContinuityDemoUICloseoutFixtures.ts");
try {
  execSync(`npx tsx ${t65}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
