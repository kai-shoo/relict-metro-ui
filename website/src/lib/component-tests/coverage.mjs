// Run after docs:build, against a running docs preview. Compare the routes
// with actual source registrations, independently of the site’s type index.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { basePath } from '../../../site.config.mjs';

const base = `${process.argv[2] || 'http://localhost:4321'}${basePath}`;
const src = new URL('../../../../src/', import.meta.url);
const files = (await readdir(src)).filter(name => name.endsWith('.ts'));
const tags = new Set((await Promise.all(files.map(async name =>
  Array.from((await readFile(new URL(name, src), 'utf8')).matchAll(/defineElement\('(metro-[\w-]+)'/g), m => m[1]),
))).flat());
assert(tags.size);
const search = await (await fetch(`${base}/search.json`)).json();
const browser = await chromium.launch({ executablePath: process.env.METRO_CHROMIUM_PATH });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  page.on('response', res => { if (res.status() >= 400) errors.push(`${res.status()}: ${res.url()}`); });
  await page.goto(`${base}/components/`);
  const links = await page.locator('main [data-component]').evaluateAll(nodes => nodes.map(node => [node.dataset.component, node.href]));
  assert.deepEqual(new Set(links.map(([tag]) => tag)), tags, 'Index does not cover registered elements');
  const guideTexts = new Set();
  const referencePages = new Map();
  for (const [tag, url] of links) {
    assert.equal(url, `${base}/components/${tag.slice(6)}/`);
    assert(search.some(item => item.title === tag && item.url === new URL(url).pathname), `Missing search entry: ${tag}`);
    assert.equal((await page.goto(url)).status(), 200);
    const main = page.locator('main');
    assert.equal(await main.locator('h1').textContent(), tag);
    assert(await main.evaluate(node => node.scrollWidth <= node.clientWidth + 2), `Mobile page overflow: ${tag}`);
    const api = await main.locator('[aria-labelledby="api"] p').first().textContent();
    assert(api.length > 60 && !guideTexts.has(api), `Missing specific API: ${tag}`);
    guideTexts.add(api);
    const ref = new URL(await main.getByRole('link', { name: /full API contract/ }).getAttribute('href'), base);
    if (!referencePages.has(ref.pathname)) referencePages.set(ref.pathname, await (await fetch(ref.origin + ref.pathname)).text());
    assert(referencePages.get(ref.pathname).includes(`id="${ref.hash.slice(1)}"`), `Invalid API section: ${ref}`);
    const code = await main.locator('.demo [data-copy]').getAttribute('data-copy');
    assert(code.includes(`import 'relict-metro-ui/${tag.slice(6)}'`), `Missing copyable import: ${tag}`);
    assert(!/[А-Яа-яЁё]/.test(code), `Untranslated example: ${tag}`);
    const live = page.frameLocator('.demo iframe');
    await live.locator(`#demo ${tag}:defined`).first().waitFor({ state: 'attached', timeout: 5000 });
    const rendered = await live.locator('#demo').evaluate(root => ({
      height: root.getBoundingClientRect().height,
      undefined: [...root.querySelectorAll('*')].filter(el => el.localName.startsWith('metro-') && !el.matches(':defined')).map(el => el.localName),
    }));
    assert(rendered.height > 0 && !rendered.undefined.length, `Empty or unregistered demo: ${tag}`);
  }
  console.log(`${tags.size}/${tags.size} registered components: index, routes, search, unique API, reference anchors, copyable imports, upgraded live demos, mobile width.`);

  await page.goto(`${base}/components/`);
  await page.locator('#component-filter input').fill('dialog');
  await page.locator('main [data-component="metro-dialog"]').click();
  await page.waitForURL(`${base}/components/dialog/`);
  await page.locator('.demo [data-copy]').getByRole('button').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /import 'relict-metro-ui\/dialog';/);
  await page.keyboard.press('Control+k');
  await page.locator('#docs-search input').fill('metro-collection-transfer');
  const match = page.locator(`#search-results a[href="${basePath}/components/collection-transfer/"]`);
  await match.click();
  await page.waitForURL(`${base}/components/collection-transfer/`);
  console.log('Component filter, detail link, clipboard, and global search navigation passed.');

  async function demo(name) {
    await page.goto(`${base}/components/${name}/`);
    return page.frameLocator('.demo iframe');
  }
  let live = await demo('dialog');
  await live.getByRole('button', { name: 'Review note' }).click();
  await live.getByRole('button', { name: 'Archive', exact: true }).click();
  await live.getByText('Field note in archive', { exact: true }).waitFor();
  live = await demo('button');
  await live.getByRole('button', { name: 'Save preferences' }).click();
  await live.getByText('Alex: weekly digest on').waitFor();
  live = await demo('context-menu');
  await live.getByRole('button', { name: 'Report' }).click();
  await live.getByRole('menuitem', { name: 'Mark reviewed' }).click();
  assert.equal(await live.locator('output').textContent(), 'Reviewed');
  live = await demo('tab-view-item');
  await live.getByRole('tab', { name: 'Map key' }).click();
  assert(await live.getByText('Blue lines mark rivers.').isVisible());
  live = await demo('frame');
  await live.getByRole('button', { name: 'Open field note' }).click();
  await live.getByRole('button', { name: 'Back to notes' }).click();
  assert(await live.getByRole('button', { name: 'Open field note' }).isVisible());
  live = await demo('collection-transfer');
  const moved = await live.locator('metro-collection-transfer').evaluate(async transfer => {
    const from = transfer.querySelector('#library'), to = transfer.querySelector('#queue');
    if (!transfer.begin(from, 'dawn') || !transfer.propose(to, null, 'move')) return false;
    await transfer.commit();
    return !from.items.some(row => row.value === 'dawn') && to.items.some(row => row.value === 'dawn');
  });
  assert(moved, 'Transfer handler must update both collections');
  live = await demo('media-player');
  await live.getByRole('button', { name: 'Play', exact: true }).click();
  await live.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Browser actions passed: dialog result, form submission, context command, tab selection, frame Back, collection transfer, audio playback. No page or asset errors.');
} finally {
  await browser.close();
}
