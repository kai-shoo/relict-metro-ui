import { strict as assert } from 'node:assert';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { basePath } from '../website/site.config.mjs';
import { verifyComponentCoverage } from '../website/src/lib/component-tests/coverage.mjs';
import { verifyComponentMenu, verifyIconCatalog } from './verify-doc-catalogs.mjs';

const website = new URL('../website/', import.meta.url);
const root = fileURLToPath(new URL('dist/', website));
const { dev, preview } = await import(createRequire(website).resolve('astro'));
const options = { root: fileURLToPath(website), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' };

async function verifyExamples(browser, mode, origin) {
  const base = origin + basePath;
  const page = await browser.newPage();
  page.setDefaultTimeout(7000);
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.route(/^https?:/, (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    failures.push(`External dependency: ${route.request().url()}`);
    return route.abort();
  });

  async function open(app) {
    await page.goto(`${base}/examples/`);
    const link = page.locator(`.examples-grid a[href^="${basePath}/examples/${app}/"]`);
    const href = await link.getAttribute('href');
    await Promise.all([page.waitForURL(origin + href), link.click()]);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert(await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
      links.some((link) => link.href.startsWith(`${location.origin}${location.pathname}`) && link.sheet?.cssRules.length)),
    `${mode}: ${app} did not load its stylesheet`);
    assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/, `Untranslated ${app} UI`);
  }

  try {
    await open('mail');
    await page.locator('[data-message-id="radio-check"]:visible').click();
    assert.equal(await page.locator('#message-title').innerText(), 'Radio check at 08:30');

    await open('start');
    assert.match(await page.locator('#today').getAttribute('datetime'), /^\d{4}-\d{2}-\d{2}$/);
    await page.getByRole('link', { name: 'Flagged mail' }).click();
    await page.waitForFunction(() => document.querySelector('#mail-pivot')?.value === 'flagged');

    await open('controls');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Settings saved', { exact: true }).waitFor();

    await open('workspace');
    await page.getByRole('button', { name: 'City garden' }).click();
    assert.equal(await page.locator('#project-title').innerText(), 'City garden');

    await open('media');
    await page.getByRole('button', { name: 'Create a recording notification' }).click();
    await page.waitForFunction(() => document.querySelector('#notifications').notifications[0]?.title === 'At dawn');

    await open('collections');
    await page.getByRole('checkbox', { name: 'Select Field notes' }).check();
    assert(await page.locator('metro-cross-slide').filter({ hasText: 'Field notes' }).evaluate((row) => row.selected));
    await page.getByRole('link', { name: 'Selection across groups' }).click();
    await page.getByRole('button', { name: 'Select Field notes' }).press('Space');
    await page.getByRole('button', { name: 'Selection (1)' }).click();
    await page.getByRole('button', { name: 'Add to queue' }).click();
    await page.locator('#queue-positions li').filter({ hasText: 'Field notes' }).waitFor({ state: 'attached' });

    await open('catalog');
    await page.reload();
    assert.equal(new URL(page.url()).searchParams.get('tag'), 'metro-repeat-button');
    await page.locator('#tag').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    assert.equal(await page.locator('#demo output').innerText(), '1');
    await page.goto(`${base}/examples/catalog/?tag=metro-button`);
    await page.locator('#code').filter({ hasText: '<metro-button' }).waitFor();
    assert.equal(await page.locator('#tag-name').innerText(), 'button');
    assert.match(await page.locator('#module').innerText(), /relict-metro-ui\/button/);
    await page.getByRole('link', { name: 'Open the complete example' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).waitFor();

    assert.deepEqual(failures, [], `${mode}: example errors or external dependencies`);
    console.log(`${mode}: all six apps and the catalog rendered from clicked links; deep links, styles, data and interactions passed.`);
  } finally {
    await page.close();
  }
}

let browser;
let server;
try {
  browser = await chromium.launch({ executablePath: process.env.METRO_CHROMIUM_PATH || undefined });
  const development = await dev(options);
  try {
    await verifyExamples(browser, 'Astro dev', `http://127.0.0.1:${development.address.port}`);
  } finally {
    await development.stop();
  }
  server = await preview(options);
  const origin = `http://127.0.0.1:${server.port}`;
  const base = origin + basePath;
  await verifyExamples(browser, 'Static preview', origin);
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
  await verifyComponentMenu(page, base, false);
  await verifyIconCatalog(page, base);

  const routes = ['/', '/getting-started/', '/components/', '/icons/', '/examples/', '/reference/',
    ...referenceDirectories.filter((entry) => entry.isDirectory()).map((entry) => `/reference/${entry.name}/`)];
  const internalLinks = new Set();
  const anchors = new Map();
  const fragments = [];
  for (const route of routes) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, `Direct navigation failed: ${route}`);
    assert.equal(await page.locator('main h1').count(), 1, `Expected one h1: ${route}`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', `Wrong language: ${route}`);
    const englishText = await page.locator('main').evaluate((main) => {
      const copy = main.cloneNode(true);
      // The typography comparison contains intentional Russian samples.
      copy.querySelectorAll('span[lang="ru"]').forEach((sample) => sample.remove());
      return copy.textContent;
    });
    assert.doesNotMatch(englishText, /[А-Яа-яЁё]/, `Untranslated content: ${route}`);
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

  assert.equal((await page.goto(base + '/missing-page/')).status(), 404);
  assert.match(await page.locator('h1').textContent(), /nothing here/);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/components/', '/icons/', '/getting-started/', '/reference/api/']) {
    await page.goto(base + route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Mobile overflow: ${route}`);
  }
  await page.locator('.mobile-navigation summary').click();
  assert(await page.locator(`.sidebar a[href="${basePath}/components/"]`).isVisible());
  await page.locator(`.sidebar a[href="${basePath}/components/"]`).click();
  await page.waitForURL('**/components/');
  await page.locator('#component-filter input').fill('tile');
  assert.equal(await page.locator('[data-component]:visible').count(), 4);
  await verifyComponentMenu(page, base, true);

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await staticPage.goto(base + '/reference/api/');
  assert(await staticPage.getByRole('heading', { name: 'Component API reference', exact: true }).isVisible(), 'Docs must render without JavaScript');
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  assert.deepEqual(failedAssets, [], 'Missing assets under the GitHub Pages base path');
  console.log(`Documentation checks passed: ${routes.length} routes, ${internalLinks.size} internal paths, SPA history, Shadow DOM links, theme, search, clipboard, components and mobile layout.`);
  await verifyComponentCoverage(browser, base);
} finally {
  await browser?.close();
  await server?.stop();
}
