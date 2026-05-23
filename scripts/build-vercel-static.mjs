import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'dist', 'vercel');
const apiBase = String(process.env.SILVA_API_BASE_URL || '').trim().replace(/\/+$/, '');

function copyIfExists(relativePath) {
  const from = path.join(repoRoot, relativePath);
  const to = path.join(outDir, relativePath);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter(source) {
      const base = path.basename(source);
      return !(
        base === '.DS_Store' ||
        /\.bak(?:\.|$)/i.test(base) ||
        /\.working\.bak$/i.test(base) ||
        /\.rescue\./i.test(base) ||
        /\.syntaxfix\.bak/i.test(base)
      );
    }
  });
}

function writeRuntimeIndex() {
  const source = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const configScript = [
    '<script>',
    `window.SILVA_API_BASE_URL=${JSON.stringify(apiBase)};`,
    '</script>'
  ].join('');
  const html = source.replace(
    '<title>Silva Studios — AI Division OS v3.9.9</title>',
    ['<title>Silva Studios — AI Division OS v3.9.9</title>', configScript].join('\n')
  );
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

writeRuntimeIndex();
copyIfExists('assets');
copyIfExists('public');
copyIfExists('studio_pulse_v400.js');
copyIfExists('studio_pulse_v395.js');
copyIfExists('probe.html');
copyIfExists('sync_probe.html');

console.log(`Built Vercel static bundle at ${path.relative(repoRoot, outDir)}`);
console.log(apiBase ? `Frontend API base: ${apiBase}` : 'Frontend API base: not set');
