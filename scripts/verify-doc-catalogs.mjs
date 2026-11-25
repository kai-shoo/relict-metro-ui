import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../website/package.json', import.meta.url));
const manifest = 'relict-metro-ui/package.json';
const iconModule = new URL(require(manifest).exports['./icon'].import, pathToFileURL(require.resolve(manifest)));
const { metroIconNames } = await import(iconModule);

export async function verifyComponentMenu(page, base, mobile) {
  await page.goto(`${base}/components/`);
  const nav = page.getByRole('navigation', { name: 'Documentation', exact: true });
  const drawer = page.getByText('Browse documentation', { exact: true });
  if (mobile) {
    assert(await nav.isHidden(), 'Mobile drawer must start closed');
    await drawer.press('Enter');
  }
  const menu = nav.locator('metro-expander');
  const toggle = menu.locator('summary');
  const links = menu.locator('li a');
  const index = await page.locator('main [data-component]').evaluateAll(items =>
    items.map(item => [item.dataset.component.slice(6), item.href]).sort());
  await toggle.press('Enter');
  // The native details opens before its queued toggle event updates the Metro host.
  await nav.locator('metro-expander[open]').waitFor();
  await links.first().waitFor();
  assert.deepEqual(await links.evaluateAll(items => items.map(item => [item.textContent.trim(), item.href])), index,
    'Component submenu must list each guide in name order');
  await page.keyboard.press('Tab');
  assert(await links.first().evaluate(link => link === document.activeElement), 'Tab must reach the first component');
  await page.keyboard.press('Escape');
  await links.first().waitFor({ state: 'hidden' });
  assert(await nav.isVisible(), 'Closing the submenu must leave the navigation open');
  assert(await toggle.evaluate(summary => summary.matches(':focus')), 'Escape must return focus to the submenu toggle');
  if (mobile) {
    await page.keyboard.press('Escape');
    await nav.waitFor({ state: 'hidden' });
    assert(await drawer.evaluate(summary => summary.matches(':focus')), 'Escape must return focus to the drawer toggle');
    await drawer.press('Enter');
  }
  await toggle.press('Space');
  await menu.getByRole('link', { name: 'wrap-panel', exact: true }).click();
  await page.waitForURL(`${base}/components/wrap-panel/`);
  await page.getByRole('heading', { level: 1, name: 'metro-wrap-panel' }).waitFor();
  if (mobile) await drawer.press('Enter');
  const current = nav.locator('[aria-current="page"]');
  await current.waitFor();
  assert.equal(await current.textContent(), 'wrap-panel');
  console.log(`${mobile ? 'Mobile' : 'Desktop'} component submenu: ${index.length} guide links, keyboard controls and active guide passed.`);
}

export async function verifyIconCatalog(page, base) {
  await page.getByRole('navigation', { name: 'Documentation', exact: true }).getByRole('link', { name: 'Icons', exact: true }).click();
  await page.waitForURL(`${base}/icons/`);
  const catalog = page.getByRole('region', { name: 'Icon catalog' });
  const filter = catalog.getByRole('searchbox', { name: 'Find an icon' });
  const cards = catalog.locator('li:visible');
  const count = catalog.locator('#icon-count');
  await catalog.locator('li metro-icon svg path').first().waitFor({ state: 'attached' });
  assert.deepEqual(await cards.locator('code').allTextContents(), [...metroIconNames].sort(), 'Icon catalog must list every registered name');
  const missing = await cards.evaluateAll(items => items.filter(item => {
    const icon = item.querySelector('metro-icon');
    const path = icon?.shadowRoot?.querySelector('svg path');
    return icon?.getAttribute('name') !== item.querySelector('code').textContent || !(path?.getTotalLength() > 0);
  }).map(item => item.textContent.trim()));
  assert.deepEqual(missing, [], 'Icon cards without their named SVG');

  await filter.fill(' VOLUME Mute ');
  assert.equal(await count.textContent(), '1 icon');
  assert.deepEqual(await cards.locator('code').allTextContents(), ['volume-mute']);
  await cards.getByRole('button', { name: 'Use volume-mute icon' }).click();
  const dialog = page.getByRole('dialog', { name: 'Use volume-mute' });
  await dialog.waitFor();
  // These controls are slotted into the native dialog from its host.
  const detail = page.locator('#icon-detail');
  const markup = '<metro-icon name="volume-mute"></metro-icon>';
  await detail.locator('metro-icon[name="volume-mute"] svg').waitFor();
  assert.equal(await detail.getByRole('textbox', { name: 'HTML markup' }).inputValue(), markup);
  await detail.getByRole('button', { name: 'Copy icon markup' }).click();
  await detail.getByText('Code copied', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), markup);
  await detail.getByRole('button', { name: 'Close', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await filter.fill('not-an-icon');
  assert.equal(await count.textContent(), '0 icons');
  assert.equal(await cards.count(), 0);
  await catalog.getByRole('button', { name: 'Clear search' }).click();
  assert.equal(await filter.inputValue(), '');
  assert.equal(await cards.count(), metroIconNames.length);
  console.log(`Icon catalog: ${metroIconNames.length} named SVGs, filter, preview, clipboard and empty-state recovery passed.`);
}
