#!/usr/bin/env npx tsx
/**
 * Pack 5.2 Operator Report Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 5.2 Operator Report Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t59 = path.join(__dirname, "t59Pack52OperatorReportFixtures.ts");
try {
  execSync(`npx tsx ${t59}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
