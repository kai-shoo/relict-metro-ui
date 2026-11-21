import { strict as assert } from 'node:assert';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { basePath } from '../website/site.config.mjs';

const root = resolve(fileURLToPath(new URL('../website/dist/', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) throw new Error('Outside the project site');
    let path = resolve(root, `.${decodeURIComponent(url.pathname.slice(basePath.length)) || '/'}`);
    if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error('Invalid path');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(resolve(root, '404.html')));
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + basePath;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.METRO_CHROMIUM_PATH || undefined });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  const failedAssets = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400
      && /\.(?:js|css|wasm|pf_fragment|pf_index)(?:\?|$)/.test(response.url())) failedAssets.push(response.url());
  });
  await page.goto(base + '/');
  await page.waitForFunction(() => document.querySelector('#hello-button')?.shadowRoot?.querySelector('button'));
  assert(await page.locator(`.sidebar a[href="${basePath}/getting-started/"]`).isVisible(), 'Desktop navigation must be visible');
  await page.locator('#hello-button').getByRole('button').click();
  assert.equal(await page.locator('#hello-output').textContent(), 'Hello! Clicks: 1');

  await page.evaluate(() => { window.__docsSession = 'preserved'; });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.locator('.hero-install').getByRole('button').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'npm install relict-metro-ui');

  // Tile links live in Shadow DOM and must still use the Astro router.
  await page.locator('.count-tile').getByRole('link').click();
  await page.waitForURL('**/components/');
  assert.equal(await page.evaluate(() => window.__docsSession), 'preserved', 'Tile caused a full reload');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('[data-component]').count(), 119);
  await page.locator('#component-filter input').fill('button');
  assert.equal(await page.locator('[data-component]:visible').count(), 8);
  await page.locator('#component-filter input').fill('not-a-component');
  assert(await page.locator('#component-empty').isVisible());

  await page.locator(`.sidebar a[href="${basePath}/getting-started/"]`).click();
  await page.waitForURL('**/getting-started/');
  await page.locator('.demo metro-pivot').getByRole('tab', { name: 'archive' }).click();
  await page.waitForFunction(() => document.querySelector('.demo metro-pivot')?.value === 'archive');
  assert.equal(await page.evaluate(() => window.__docsSession), 'preserved');
  await page.goBack();
  await page.waitForURL('**/components/');
  await page.locator('#component-filter input').fill('pivot');
  assert.equal(await page.locator('[data-component]:visible').count(), 3);
  await page.goBack();
  await page.waitForURL(base + '/');
  await page.locator('#hello-button').getByRole('button').click();
  assert.equal(await page.locator('#hello-output').textContent(), 'Hello! Clicks: 1', 'Listener duplicated on return');

  await page.keyboard.press('Control+k');
  await page.locator('#docs-search input').fill('FormData');
  await page.locator('#search-results a').first().waitFor();
  assert.match(await page.locator('#search-results').textContent(), /FormData/i, 'Full-text search must search article text');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#search-dialog').open);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.locator('#docs-search input').fill('installation');
  await page.locator(`#search-results a[href="${basePath}/getting-started/"]`).waitFor();
  await page.locator(`#search-results a[href="${basePath}/getting-started/"]`).click();
  await page.waitForURL('**/getting-started/');
  assert.equal(await page.evaluate(() => window.__docsSession), 'preserved');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Theme must survive reload');

  const referenceDirectories = await readdir(resolve(root, 'reference'), { withFileTypes: true });
  const routes = ['/', '/getting-started/', '/components/', '/examples/', '/reference/',
    ...referenceDirectories.filter((entry) => entry.isDirectory()).map((entry) => `/reference/${entry.name}/`)];
  const internalLinks = new Set();
  const anchors = new Map();
  const fragments = [];
  for (const route of routes) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, `Direct navigation failed: ${route}`);
    assert.equal(await page.locator('main h1').count(), 1, `Expected one h1: ${route}`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', `Wrong language: ${route}`);
    assert.doesNotMatch(await page.locator('main').innerText(), /[А-Яа-яЁё]/, `Untranslated content: ${route}`);
    anchors.set(basePath + route, new Set(await page.locator('[id]').evaluateAll((nodes) => nodes.map((node) => node.id))));
    assert.equal(await page.locator('main').evaluate((main) => main.scrollWidth <= main.clientWidth + 2), true, `Overflow: ${route}`);
    for (const href of await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.href))) {
      if (href.startsWith(origin)) {
        assert(new URL(href).pathname.startsWith(`${basePath}/`), `Link escaped the base path: ${href}`);
        internalLinks.add(new URL(href).pathname);
        if (new URL(href).hash && new URL(href).pathname.startsWith(`${basePath}/reference/`)) fragments.push(new URL(href));
      }
    }
  }
  for (const path of internalLinks) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `Broken internal link: ${path}`);
  }
  for (const url of fragments) {
    assert(anchors.get(url.pathname)?.has(decodeURIComponent(url.hash.slice(1))), `Broken translated anchor: ${url.pathname}${url.hash}`);
  }

  await page.goto(base + '/examples/catalog/?tag=metro-button');
  await page.locator('#tag:not([disabled])').waitFor();
  assert.equal(await page.locator('#tag-name').textContent(), 'button');
  assert.match(await page.locator('#module').textContent(), /relict-metro-ui\/button/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/, 'Untranslated catalog UI');
  await page.goto(base + '/examples/controls/');
  await page.getByRole('button', { name: 'Save', exact: true }).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/, 'Untranslated app UI');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('#result').waitFor({ state: 'visible' });
  assert.equal((await page.goto(base + '/missing-page/')).status(), 404);
  assert.match(await page.locator('h1').textContent(), /nothing here/);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/components/', '/getting-started/', '/reference/api/']) {
    await page.goto(base + route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Mobile overflow: ${route}`);
  }
  await page.locator('.mobile-navigation summary').click();
  assert(await page.locator(`.sidebar a[href="${basePath}/components/"]`).isVisible());
  await page.locator(`.sidebar a[href="${basePath}/components/"]`).click();
  await page.waitForURL('**/components/');
  await page.locator('#component-filter input').fill('tile');
  assert.equal(await page.locator('[data-component]:visible').count(), 4);

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await staticPage.goto(base + '/reference/api/');
  assert(await staticPage.getByRole('heading', { name: 'Component API reference', exact: true }).isVisible(), 'Docs must render without JavaScript');
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  assert.deepEqual(failedAssets, [], 'Missing assets under the GitHub Pages base path');
  console.log(`Documentation checks passed: ${routes.length} routes, ${internalLinks.size} internal paths, SPA history, Shadow DOM links, theme, search, clipboard, components and mobile layout.`);
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
