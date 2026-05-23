#!/usr/bin/env npx tsx
/**
 * Pack 6.2 Static UI Prototype Validation Runner
 */

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 6.2 Static UI Prototype Runner");
console.log("═══════════════════════════════════════════════════════════════\n");

const t64 = path.join(__dirname, "t64Pack62StaticUIPrototypeFixtures.ts");
try {
  execSync(`npx tsx ${t64}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
