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

function injectApiBase(source) {
  const configScript = [
    '<script>',
    `window.SILVA_API_BASE_URL=${JSON.stringify(apiBase)};`,
    '</script>'
  ].join('');
  return source.replace(/<\/title>/i, `</title>\n${configScript}`);
}

function writeRuntimeHtml(relativePath) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  fs.writeFileSync(path.join(outDir, relativePath), injectApiBase(source));
}

function writeVercelConfig() {
  const headers = [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://silvastudios.co.za https://www.silvastudios.co.za"
        }
      ]
    }
  ];
  const config = {
    cleanUrls: true,
    trailingSlash: false,
    headers,
    rewrites: [
      { source: '/pulse-showcase', destination: '/pulse-showcase.html' },
      { source: '/pulse-showcase/', destination: '/pulse-showcase.html' },
      { source: '/((?!api/|assets/|public/|probe|sync_probe|studio_pulse_v395|studio_pulse_v400).*)', destination: '/index.html' }
    ]
  };
  fs.writeFileSync(path.join(outDir, 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

writeRuntimeHtml('index.html');
writeRuntimeHtml('pulse-showcase.html');
writeVercelConfig();
copyIfExists('assets');
copyIfExists('public');
copyIfExists('studio_pulse_v400.js');
copyIfExists('studio_pulse_v395.js');
copyIfExists('probe.html');
copyIfExists('sync_probe.html');

console.log(`Built Vercel static bundle at ${path.relative(repoRoot, outDir)}`);
console.log(apiBase ? `Frontend API base: ${apiBase}` : 'Frontend API base: not set');
