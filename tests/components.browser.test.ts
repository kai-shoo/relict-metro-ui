import { afterEach, beforeEach, expect, test } from 'vitest';
import { page, userEvent, commands, server, type Locator } from 'vitest/browser';
import fixture from './fixtures/components.html?raw';
import '../src/pivot.js';
import '../src/command-bar.js';
import '../src/tile.js';

let root: HTMLElement;
let pivot: HTMLElementTagNameMap['metro-pivot'];
let bar: HTMLElementTagNameMap['metro-command-bar'];

beforeEach(async () => {
  const fragment = new DOMParser().parseFromString(fixture, 'text/html');
  root = document.createElement('main');
  root.id = 'metro-fixture';
  root.append(...fragment.head.querySelectorAll('style'));
  fragment.body.querySelectorAll('script').forEach(script => script.remove());
  root.append(...fragment.body.childNodes);
  document.body.append(root);

  pivot = root.querySelector<HTMLElementTagNameMap['metro-pivot']>('#folders')!;
  bar = root.querySelector<HTMLElementTagNameMap['metro-command-bar']>('#commands')!;
  bar.commands = [
    { id: 'new', label: 'New mail', icon: '+' },
    { id: 'mute', label: 'Mute', placement: 'secondary', disabled: true },
    { id: 'archive', label: 'Archive folder', placement: 'secondary' },
    { id: 'export', label: 'Export', placement: 'secondary' },
  ];

  await expect.element(page.getByRole('tab', { name: 'Inbox' })).toBeVisible();
});

afterEach(() => {
  root.remove();
});

test('Pivot uses linked ARIA panels and manual, cyclic keyboard activation', async () => {
  const inbox = page.getByRole('tab', { name: 'Inbox' });
  const sent = page.getByRole('tab', { name: 'Sent' });
  const panel = page.getByRole('tabpanel', { name: 'Inbox' });
  await expect.element(inbox).toHaveAttribute('aria-controls', panel.element().id);
  await expect.element(page.getByRole('tab', { name: 'Later' })).toBeDisabled();

  (inbox.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  await expectFocus(sent);
  await expect.element(inbox).toHaveAttribute('aria-selected', 'true');

  await userEvent.keyboard('{Enter}');
  await expect.element(sent).toHaveAttribute('aria-selected', 'true');
  await expect.element(page.getByRole('tabpanel', { name: 'Sent' })).toBeVisible();
  await expect.element(panel).not.toBeInTheDocument();

  await userEvent.keyboard('{ArrowRight}');
  await expectFocus(inbox);
  await userEvent.keyboard('{End}');
  await expectFocus(sent);
  await userEvent.keyboard('{Home}{Space}');
  await expect.element(inbox).toHaveAttribute('aria-selected', 'true');
  await userEvent.tab();
  await expectFocus(panel);

  await sent.click();
  await expect.element(sent).toHaveAttribute('aria-selected', 'true');
});

test('programmatic selection is silent and separate Pivots keep independent values', async () => {
  const changes: { id: string; value: string }[] = [];
  root.addEventListener('metro-change', event => {
    changes.push({ id: (event.target as HTMLElement).id, value: event.detail.value });
  });

  pivot.value = 'sent';
  await expect.element(page.getByRole('tab', { name: 'Sent' })).toHaveAttribute('aria-selected', 'true');
  await expect.element(page.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
  expect(changes).toEqual([]);

  const tomorrow = page.getByRole('tab', { name: 'Tomorrow' });
  await tomorrow.click();
  await tomorrow.click();

  expect(pivot.value).toBe('sent');
  expect(changes).toEqual([{ id: 'calendar', value: 'tomorrow' }]);
});

test('removal, invalid values and disablement fall back without user events', async () => {
  const changes: string[] = [];
  pivot.addEventListener('metro-change', event => changes.push(event.detail.value));
  pivot.value = 'missing';
  await expect.poll(() => pivot.value).toBe('inbox');

  (page.getByRole('tab', { name: 'Inbox' }).element() as HTMLElement).focus();
  pivot.querySelector('[value="inbox"]')!.remove();
  await expect.poll(() => pivot.value).toBe('sent');
  await expectFocus(page.getByRole('tab', { name: 'Sent' }));

  pivot.querySelector<HTMLElementTagNameMap['metro-pivot-item']>('[value="sent"]')!.disabled = true;
  await expect.poll(() => pivot.value).toBe('');
  await expect.element(page.getByRole('tablist', { name: 'Folders' })).toBeVisible();
  expect(changes).toEqual([]);
});

test('programmatic selection reveals the tab without scrolling the page or losing panel focus', async () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  pivot.style.width = '240px';
  pivot.style.marginBlockStart = '1200px';
  pivot.value = 'sent';
  await expect.element(page.getByRole('tab', { name: 'Sent' })).toHaveAttribute('aria-selected', 'true');
  expect(window.scrollY).toBe(0);
  (page.getByRole('tabpanel', { name: 'Sent' }).element() as HTMLElement).focus();

  pivot.value = 'inbox';
  await expectFocus(page.getByRole('tab', { name: 'Inbox' }));
});

test('system dark, explicit light and reduced motion resolve through theme tokens', async () => {
  await commands.setMetroMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  try {
    expect(getComputedStyle(pivot).backgroundColor).toBe('rgb(0, 0, 0)');
    pivot.style.setProperty('--metro-color-scheme', 'light');
    expect(getComputedStyle(pivot).backgroundColor).toBe('rgb(255, 255, 255)');
    pivot.style.setProperty('--metro-bg', '#f0f0f0');
    expect(getComputedStyle(pivot).backgroundColor).toBe('rgb(240, 240, 240)');
    await page.getByRole('tab', { name: 'Sent' }).click();
    expect(getComputedStyle(page.getByRole('tabpanel', { name: 'Sent' }).element()).transitionDuration).toBe('0s');
  } finally {
    await commands.setMetroMedia({ colorScheme: null, reducedMotion: null });
  }
});

test('CommandBar navigates enabled actions and restores the trigger before emitting', async () => {
  const actions: string[] = [];
  bar.addEventListener('metro-command', event => actions.push(event.detail.id));
  const more = page.getByRole('button', { name: 'More commands' });
  const archive = page.getByRole('button', { name: 'Archive folder' });

  await expect.element(archive).not.toBeInTheDocument();
  (more.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(more).toHaveAttribute('aria-expanded', 'true');
  await expectFocus(archive);
  await userEvent.keyboard('{End}');
  await expectFocus(page.getByRole('button', { name: 'Export' }));

  await userEvent.keyboard('{Escape}');
  await expect.element(archive).not.toBeInTheDocument();
  await expectFocus(more);

  await userEvent.keyboard('{Enter}');
  await expectFocus(archive);
  await userEvent.keyboard('{Enter}');
  await expectFocus(more);
  await expect.element(more).toHaveAttribute('aria-expanded', 'false');
  expect(actions).toEqual(['archive']);

  await more.click();
  await page.getByRole('button', { name: 'Outside' }).click();
  await expect.element(more).toHaveAttribute('aria-expanded', 'false');
  await expectFocus(page.getByRole('button', { name: 'Outside' }));
});

test('Tile fits a narrow container and exposes its native link destination and label', async () => {
  const { MetroTile } = await import('../src/tile.js');
  const container = document.createElement('div');
  container.style.width = '260px';
  container.innerHTML = `<metro-tile size="wide" href="/examples/mail/" target="_blank" rel="noopener" label="Mail">
    <span aria-hidden="true">✉</span>
  </metro-tile>`;
  document.body.append(container);
  try {
    const tile = container.querySelector('metro-tile')!;
    const link = page.getByRole('link', { name: 'Mail', exact: true });
    await expect.element(link).toHaveAttribute('target', '_blank');
    await expect.element(link).toHaveAttribute('href', '/examples/mail/');
    await expect.element(link).toHaveAttribute('rel', 'noopener');
    expect(tile).toBeInstanceOf(MetroTile);
    const rect = link.element().getBoundingClientRect();
    expect(rect.width).toBe(260);
    expect(rect.height).toBeCloseTo(260 * 336 / 691, 0);
    tile.href = null;
    await expect.element(link).not.toBeInTheDocument();
    await expect.element(page.getByText('Mail', { exact: true })).toBeVisible();
  } finally {
    container.remove();
  }
});

test('open Phone command bar keeps its visual hierarchy', async () => {
  bar.style.width = '340px';
  // Keep screenshot rounding from picking up the adjacent tile.
  bar.style.marginBlockEnd = '2px';
  bar.style.setProperty('--metro-font', 'monospace');
  bar.setAttribute('data-metro-theme', 'dark');
  bar.open = true;
  await expect.element(page.getByRole('button', { name: 'Archive folder' })).toBeVisible();
  if (server.browser === 'chromium') {
    await expect.element(page.getByRole('group', { name: 'Folder actions' })).toMatchScreenshot('command-bar-open');
  }
});

async function expectFocus(locator: Locator) {
  await expect.poll(() => {
    const target = locator.query();
    return target !== null && (target.getRootNode() as ShadowRoot | Document).activeElement === target;
  }).toBe(true);
}
