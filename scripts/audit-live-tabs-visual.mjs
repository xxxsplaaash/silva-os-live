#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_TABS = [
  'home', 'generator', 'library', 'captions', 'planner', 'homes',
  'aisha', 'leah', 'claudia', 'grok', 'vanya', 'crosschar',
  'jhb', 'broll', 'events', 'gallery', 'assets', 'saved',
  'settings', 'providers', 'workflow', 'ideas', 'campaigns',
  'team', 'analytics', 'dev'
];

const DEFAULT_VIEWPORTS = [
  [1440, 900],
  [1024, 768],
  [768, 900],
  [430, 932],
  [390, 844],
  [375, 812],
  [320, 740]
];

function argValue(name){
  const prefix = `--${name}=`;
  const hit = process.argv.find(item => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function parseViewports(){
  const raw = argValue('viewports');
  if (!raw) return DEFAULT_VIEWPORTS;
  return raw.split(',').map(item => {
    const [w, h] = item.toLowerCase().split('x').map(Number);
    if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error(`Invalid viewport: ${item}`);
    return [w, h];
  });
}

function parseTabs(){
  const raw = argValue('tabs');
  return raw ? raw.split(',').map(item => item.trim()).filter(Boolean) : DEFAULT_TABS;
}

function stamp(){
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function loadChromium(){
  try {
    const mod = await import('@playwright/test');
    return mod.chromium;
  } catch {
    const mod = await import('playwright');
    return mod.chromium;
  }
}

function issue(severity, category, message, details = {}){
  return { severity, category, message, details };
}

function summarizeIssues(metrics){
  const issues = [];
  if (!metrics.activePage) issues.push(issue('CRITICAL', 'routing', 'No active page was detected after navigation.'));
  if (metrics.documentOverflowX) issues.push(issue('CRITICAL', 'layout', `Document has horizontal overflow: ${metrics.documentScrollWidth}px > ${metrics.viewportWidth}px.`));
  if (metrics.consoleErrors.length) issues.push(issue('HIGH', 'console', `${metrics.consoleErrors.length} console error(s) captured.`, { consoleErrors: metrics.consoleErrors.slice(0, 6) }));
  if (metrics.mobile && metrics.shortControls.length) issues.push(issue('HIGH', 'tap-targets', `${metrics.shortControls.length} visible control(s) are below the 44px mobile tap target.`, { examples: metrics.shortControls.slice(0, 8) }));
  if (metrics.hiddenOverflow.length) issues.push(issue('HIGH', 'scrollability', `${metrics.hiddenOverflow.length} visible container(s) hide overflowing content instead of scrolling/wrapping.`, { examples: metrics.hiddenOverflow.slice(0, 8) }));
  if (metrics.overflowOffenders.length) issues.push(issue('MEDIUM', 'containment', `${metrics.overflowOffenders.length} visible element(s) extend outside the viewport.`, { examples: metrics.overflowOffenders.slice(0, 8) }));
  return issues;
}

async function main(){
  const chromium = await loadChromium();
  const tabs = parseTabs();
  const viewports = parseViewports();
  const baseUrl = argValue('url') || 'http://127.0.0.1:3225/';
  const allowGenerate = process.argv.includes('--allow-generate');
  const failOnCritical = process.argv.includes('--fail-on-critical');
  const outDir = path.resolve(repoRoot, 'test-results', 'live-tab-audit', stamp());
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const [width, height] of viewports) {
    const viewportName = `${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 768, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));
    if (!allowGenerate) {
      await page.route('**/api/image-generation/generate', route => route.abort('blockedbyclient'));
    }
    await page.goto(`${baseUrl}?audit=live-tabs-${Date.now()}#generator`, { waitUntil: 'commit', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);

    for (const tabId of tabs) {
      const consoleStart = consoleErrors.length;
      await page.evaluate(id => {
        const item = document.querySelector(`.nav-item[data-page="${id}"]`);
        if (item && typeof item.click === 'function') item.click();
        else if (typeof window.nav === 'function') window.nav(id);
        else location.hash = id;
      }, tabId).catch(() => {});
      await page.waitForTimeout(500);
      const screenshot = path.join(outDir, `${viewportName}-${tabId}.png`);
      await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});

      const metrics = await page.evaluate(({ tabId, consoleErrors, mobile, drawerMode }) => {
        const active = document.querySelector('.page.active') || document.getElementById(`page-${tabId}`);
        const viewportWidth = innerWidth;
        const viewportHeight = innerHeight;
        const all = [...document.querySelectorAll('body *')];
        const isExpectedClosedDrawer = el => {
          if (el.id === 'sidebar' || el.closest?.('#sidebar')) {
            const body = document.body;
            return drawerMode && !body.classList.contains('silva-mobile-nav-open') && !body.classList.contains('pg52-mobile-nav-open');
          }
          return false;
        };
        const visible = el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        };
        const insideHorizontalScroller = el => {
          let cur = el.parentElement;
          while (cur && cur !== document.body) {
            const cs = getComputedStyle(cur);
            if (cur.scrollWidth > cur.clientWidth + 4 && ['auto','scroll','overlay'].includes(cs.overflowX)) return true;
            cur = cur.parentElement;
          }
          return false;
        };
        const compact = el => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            cls: String(el.className || '').slice(0, 96),
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 96),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height)
          };
        };
        const overflowOffenders = [];
        const hiddenOverflow = [];
        const shortControls = [];
        const scrollables = [];
        for (const el of all) {
          if (!visible(el) || isExpectedClosedDrawer(el)) continue;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if ((r.right > viewportWidth + 2 || r.left < -2) && overflowOffenders.length < 20 && !insideHorizontalScroller(el)) overflowOffenders.push(compact(el));
          const hidesX = el.scrollWidth > el.clientWidth + 8 && cs.overflowX === 'hidden';
          const hidesY = el.scrollHeight > el.clientHeight + 8 && cs.overflowY === 'hidden';
          const expectedSidebarClip = el.id === 'sidebar' && hidesX && !hidesY;
          if ((hidesX || hidesY) && !expectedSidebarClip && r.width > 20 && r.height > 20 && hiddenOverflow.length < 20) {
            hiddenOverflow.push({ ...compact(el), hidesX, hidesY, clientW: el.clientWidth, scrollW: el.scrollWidth, clientH: el.clientHeight, scrollH: el.scrollHeight });
          }
          const canScrollX = el.scrollWidth > el.clientWidth + 4;
          const canScrollY = el.scrollHeight > el.clientHeight + 4;
          if ((canScrollX || canScrollY) && (['auto','scroll','overlay'].includes(cs.overflowX) || ['auto','scroll','overlay'].includes(cs.overflowY)) && scrollables.length < 24) {
            scrollables.push({ ...compact(el), canScrollX, canScrollY, overflowX: cs.overflowX, overflowY: cs.overflowY });
          }
          if (mobile && ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(el.tagName) && r.height > 0 && r.height < 44 && shortControls.length < 20) {
            shortControls.push(compact(el));
          }
        }
        return {
          tabId,
          mobile,
          activePage: active?.id || '',
          title: active?.querySelector('.page-title')?.textContent?.trim() || active?.id || '',
          viewportWidth,
          viewportHeight,
          documentScrollWidth: document.documentElement.scrollWidth,
          documentOverflowX: document.documentElement.scrollWidth > viewportWidth + 2,
          overflowOffenders,
          hiddenOverflow,
          shortControls,
          scrollables,
          consoleErrors
        };
      }, { tabId, consoleErrors: consoleErrors.slice(consoleStart), mobile: width < 768, drawerMode: width < 1200 });
      metrics.viewport = viewportName;
      metrics.screenshot = path.relative(repoRoot, screenshot);
      metrics.issues = summarizeIssues(metrics);
      results.push(metrics);
    }
    await page.close();
  }

  await browser.close();
  const jsonPath = path.join(outDir, 'audit.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  const criticalCount = results.reduce((sum, row) => sum + row.issues.filter(i => i.severity === 'CRITICAL').length, 0);
  const highCount = results.reduce((sum, row) => sum + row.issues.filter(i => i.severity === 'HIGH').length, 0);
  const mediumCount = results.reduce((sum, row) => sum + row.issues.filter(i => i.severity === 'MEDIUM').length, 0);
  console.log(`Live tab visual audit complete`);
  console.log(`- Results: ${path.relative(repoRoot, jsonPath)}`);
  console.log(`- Screenshots: ${path.relative(repoRoot, outDir)}`);
  console.log(`- Rows: ${results.length}`);
  console.log(`- Issues: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium`);
  if (failOnCritical && criticalCount) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
