import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const distDir = path.join(packageRoot, "dist");
const tmpDir = path.join(packageRoot, ".tmp-build");
const declarationTsconfig = path.join(tmpDir, "tsconfig.declarations.json");
const entryPoint = path.join(packageRoot, "src", "index.ts");
const tscBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");

fs.rmSync(distDir, { recursive: true, force: true });
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const external = ["@google/generative-ai", "pg"];

await build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: path.join(distDir, "index.js"),
  external,
  sourcemap: false,
});

await build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: path.join(distDir, "index.cjs"),
  external,
  sourcemap: false,
});

fs.writeFileSync(
  declarationTsconfig,
  JSON.stringify(
    {
      extends: "../tsconfig.json",
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: "../dist",
      },
      include: ["../src/index.ts"],
      exclude: ["../src/eval/**/*", "../node_modules", "../dist"],
    },
    null,
    2,
  ),
);

try {
  execFileSync(tscBin, ["-p", declarationTsconfig], {
    cwd: packageRoot,
    stdio: "inherit",
  });
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

fs.copyFileSync(path.join(distDir, "index.d.ts"), path.join(distDir, "index.d.cts"));
