import { afterEach, expect, it } from 'vitest';
import { page, userEvent, type Locator } from 'vitest/browser';
import '../src/command-bar.js';
import '../src/command-bar-flyout.js';
import '../src/menu-flyout.js';
import '../src/popup.js';
import '../src/teaching-tip.js';
import type { MetroCommandDetail } from '../src/command-bar.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.appBarOverlays = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

async function expectFocus(locator: Locator): Promise<void> {
  await expect.poll(() => {
    const target = locator.query();
    return target !== null && (target.getRootNode() as ShadowRoot | Document).activeElement === target;
  }).toBe(true);
}

afterEach(() => document.querySelectorAll('[data-app-bar-overlays]').forEach(host => host.remove()));

it('reflows declarative AppBar commands by priority with one toggle owner and restores the moving focus', async () => {
  const host = fixture(`
    <metro-command-bar label="Documents" style="width: 350px">
      <metro-app-bar-separator></metro-app-bar-separator>
      <metro-app-bar-button command-id="sort" label="Sort" priority="20"></metro-app-bar-button>
      <metro-app-bar-toggle-button command-id="filter" label="Filter" icon-name="search"></metro-app-bar-toggle-button>
      <metro-app-bar-button command-id="help" label="Help" placement="secondary"></metro-app-bar-button>
      <metro-app-bar-separator placement="secondary"></metro-app-bar-separator>
      <metro-app-bar-button command-id="export" label="Export" placement="secondary" disabled></metro-app-bar-button>
    </metro-command-bar>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  const filterModel = bar.querySelector('metro-app-bar-toggle-button')!;
  bar.commands = [{ id: 'new', label: 'New', priority: 10 }];
  const events: MetroCommandDetail[] = [];
  bar.addEventListener('metro-command', event => events.push(event.detail));
  const filter = page.getByRole('button', { name: 'Filter' });
  const more = page.getByRole('button', { name: 'More commands' });

  await expect.element(page.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  await filter.click();
  await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
  expect(filterModel.checked).toBe(true);

  bar.style.width = '185px';
  await expect.element(filter).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Sort' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'New' })).toBeVisible();
  await expectFocus(more);
  await userEvent.keyboard('{Enter}');
  await expectFocus(filter);
  await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
  await userEvent.keyboard('{Enter}');
  await expectFocus(more);
  expect(filterModel.checked).toBe(false);
  expect(events).toEqual([{ id: 'filter', checked: true }, { id: 'filter', checked: false }]);

  await userEvent.keyboard('{Enter}');
  await expectFocus(filter);
  bar.style.width = '350px';
  await expect.poll(() => filter.element().parentElement?.getAttribute('part')).toBe('primary');
  await expectFocus(filter);
  await expect.element(filter).toHaveAttribute('aria-pressed', 'false');

  const help = page.getByRole('button', { name: 'Help' });
  (help.element() as HTMLButtonElement).focus();
  bar.context = 'other-selected-record';
  await expect.element(help).not.toBeInTheDocument();
  await expectFocus(more);
});

it('keeps array toggle state controlled by the app and leaves standalone buttons usable', async () => {
  const host = fixture(`
    <metro-command-bar fixed-overflow label="Controls" style="width: 120px"></metro-command-bar>
    <metro-app-bar-button command-id="share" label="Share" icon-name="share"></metro-app-bar-button>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  bar.commands = [{ id: 'follow', label: 'Follow', checked: false }];
  const actions: MetroCommandDetail[] = [];
  host.addEventListener('metro-command', event => actions.push(event.detail));

  const follow = page.getByRole('button', { name: 'Follow' });
  await follow.click();
  await expect.element(follow).toHaveAttribute('aria-pressed', 'false');
  bar.commands = [{ id: 'follow', label: 'Follow', checked: true }];
  await expect.element(follow).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Share' }).click();
  expect(actions).toEqual([{ id: 'follow', checked: true }, { id: 'share' }]);
});

it('fits standalone command labels at double text size with matching icon geometry and keyboard commands', async () => {
  const label = 'Synchronisationseinstellungen'.repeat(3);
  const host = fixture(`
    <button type="button">Before commands</button>
    <div dir="rtl" style="width:320px">
      <metro-app-bar-button command-id="sync" label="${label}" icon-name="sync"></metro-app-bar-button>
      <metro-app-bar-toggle-button command-id="pin" label="Keep" icon-name="pin"></metro-app-bar-toggle-button>
      <metro-app-bar-button command-id="archive" label="Archive" disabled icon-name="folder"></metro-app-bar-button>
      <metro-command-bar label="File actions" fixed-overflow>
        <metro-app-bar-button command-id="save" label="Save" icon-name="save"></metro-app-bar-button>
      </metro-command-bar>
    </div>
  `);
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    const command = page.getByRole('button', { name: label });
    const toggle = page.getByRole('button', { name: 'Keep' });
    const save = page.getByRole('button', { name: 'Save' });
    await expect.element(command).toBeVisible();
    await expect.element(save).toBeVisible();
    const bounds = host.querySelector('div')!.getBoundingClientRect();
    const action = command.element();
    expect(action.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
    expect(action.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
    expect(action.scrollWidth).toBeLessThanOrEqual(action.clientWidth);
    const icon = action.querySelector('[part="icon"]')!.getBoundingClientRect();
    const primaryIcon = save.element().querySelector('[part="icon"]')!.getBoundingClientRect();
    expect(icon.width).toBe(96);
    expect(icon.height).toBe(icon.width);
    expect(icon.width).toBe(primaryIcon.width);
    expect(Math.abs((icon.left + icon.right) / 2 - (bounds.left + bounds.right) / 2)).toBeLessThan(1);
    const standaloneLabel = action.querySelector('[part="label"]')!;
    const primaryLabel = save.element().querySelector('.label')!;
    expect(getComputedStyle(standaloneLabel).fontWeight).toBe('600');
    expect(getComputedStyle(standaloneLabel).fontSize).toBe(getComputedStyle(primaryLabel).fontSize);
    expect(getComputedStyle(primaryLabel).fontWeight).toBe('600');

    const commands: MetroCommandDetail[] = [];
    host.addEventListener('metro-command', event => commands.push(event.detail));
    host.querySelector('button')!.focus();
    await userEvent.tab();
    await expectFocus(command);
    await userEvent.keyboard('{Enter}{Tab}');
    await expectFocus(toggle);
    await userEvent.keyboard(' ');
    await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.tab();
    await expectFocus(save);
    expect(commands).toEqual([{ id: 'sync' }, { id: 'pin', checked: true }]);
  } finally {
    document.documentElement.style.fontSize = size;
  }
});

it('keeps all four fixed primary command glyphs inside their circles on a narrow enlarged bar', async () => {
  const host = fixture('<metro-command-bar fixed-overflow label="Mail" style="width:320px"></metro-command-bar>');
  const bar = host.querySelector('metro-command-bar')!;
  bar.commands = [
    { id: 'new', label: 'Compose', iconName: 'mail' },
    { id: 'find', label: 'Search', iconName: 'search' },
    { id: 'sync', label: 'Synchronize', iconName: 'sync' },
    { id: 'delete', label: 'Delete', iconName: 'delete' },
  ];
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    await page.getByRole('button', { name: 'More commands' }).click();
    const icons = [...bar.shadowRoot!.querySelectorAll('.primary [part="icon"]')];
    expect(icons).toHaveLength(4);
    for (const ring of icons) {
      const button = ring.closest('button')!.getBoundingClientRect();
      const bounds = ring.getBoundingClientRect();
      const glyph = ring.querySelector('metro-icon')!.getBoundingClientRect();
      expect(bounds.left).toBeGreaterThanOrEqual(button.left);
      expect(bounds.right).toBeLessThanOrEqual(button.right);
      expect(bounds.width).toBeCloseTo(bounds.height, 0);
      expect(glyph.left).toBeGreaterThan(bounds.left);
      expect(glyph.right).toBeLessThan(bounds.right);
      expect(glyph.top).toBeGreaterThan(bounds.top);
      expect(glyph.bottom).toBeLessThan(bounds.bottom);
    }
  } finally {
    document.documentElement.style.fontSize = size;
  }
});

it('renders the pin symbol and fits the catalog captions on one line in a phone layout', async () => {
  const host = fixture(`
    <metro-command-bar label="Документ" style="width:278px">
      <metro-app-bar-button command-id="save" label="Сохранить" icon-name="save"></metro-app-bar-button>
      <metro-app-bar-separator></metro-app-bar-separator>
      <metro-app-bar-toggle-button command-id="pin" label="Закрепить" icon-name="pin"></metro-app-bar-toggle-button>
    </metro-command-bar>
  `);
  await page.getByRole('button', { name: 'More commands' }).click();
  const bar = host.querySelector('metro-command-bar')!;
  const captions = [...bar.shadowRoot!.querySelectorAll<HTMLElement>('.primary .label')];
  expect(captions).toHaveLength(2);
  for (const caption of captions) {
    const range = document.createRange();
    range.selectNodeContents(caption);
    expect(range.getClientRects()).toHaveLength(1);
  }
  const pin = page.getByRole('button', { name: 'Закрепить' }).element();
  const drawing = pin.querySelector('metro-icon')!.shadowRoot!.querySelector('path');
  expect(drawing?.getBoundingClientRect().width).toBeGreaterThan(0);
});

it('draws a single centered separator when the command bar turns into a rail', async () => {
  const host = fixture(`
    <metro-command-bar label="Document commands" fixed-overflow dir="rtl">
      <metro-app-bar-button command-id="save" label="Save" icon-name="save"></metro-app-bar-button>
      <metro-app-bar-separator></metro-app-bar-separator>
      <metro-app-bar-button command-id="pin" label="Pin" icon-name="pin"></metro-app-bar-button>
    </metro-command-bar>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  const separator = page.getByRole('separator');
  await expect.element(separator).toHaveAttribute('aria-orientation', 'vertical');
  const line = separator.element();
  expect(getComputedStyle(line).borderInlineStartWidth).toBe('1px');
  expect(getComputedStyle(line).borderBlockStartWidth).toBe('0px');
  expect(line.getBoundingClientRect().width).toBeLessThan(line.getBoundingClientRect().height);

  bar.orientation = 'vertical';
  await expect.element(separator).toHaveAttribute('aria-orientation', 'horizontal');
  expect(getComputedStyle(line).borderInlineStartWidth).toBe('0px');
  expect(getComputedStyle(line).borderBlockStartWidth).toBe('1px');
  const railLine = line.getBoundingClientRect();
  const save = page.getByRole('button', { name: 'Save' }).element().getBoundingClientRect();
  const pin = page.getByRole('button', { name: 'Pin' }).element().getBoundingClientRect();
  expect(railLine.width).toBeGreaterThan(railLine.height);
  expect(save.bottom).toBeLessThanOrEqual(railLine.top);
  expect(railLine.bottom).toBeLessThanOrEqual(pin.top);
  expect(railLine.left + railLine.width / 2).toBeCloseTo(save.left + save.width / 2, 0);
});

it('returns focused overflow to its source when all commands are cleared', async () => {
  const host = fixture(`
    <button type="button">Selected documents</button>
    <metro-command-bar label="Document commands"></metro-command-bar>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  bar.returnFocus = host.querySelector('button');
  bar.context = 'marked';
  bar.commands = [{ id: 'remove', label: 'Remove', placement: 'secondary' }];

  const more = page.getByRole('button', { name: 'More commands' });
  await more.click();
  await expectFocus(page.getByRole('button', { name: 'Remove' }));
  bar.commands = [];

  await expect.element(more).not.toBeInTheDocument();
  expect(bar.open).toBe(false);
  await expectFocus(page.getByRole('button', { name: 'Selected documents' }));
});

it('reveals the focused overflow command after it moves to the end of an open command bar', async () => {
  const host = fixture('<metro-command-bar label="Document commands" style="width:241px"></metro-command-bar>');
  const bar = host.querySelector('metro-command-bar')!;
  const originalSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  const commands = Array.from({ length: 12 }, (_, index) => ({
    id: `command-${index}`, label: `Extra command ${index + 1}`, placement: 'secondary' as const,
  }));
  bar.commands = commands;
  const events: MetroCommandDetail[] = [];
  bar.addEventListener('metro-command', event => events.push(event.detail));
  const toggle = page.getByRole('button', { name: 'More commands' });
  try {
    await toggle.click();
    await expectFocus(page.getByRole('button', { name: 'Extra command 1', exact: true }));
    const overflow = bar.shadowRoot!.querySelector<HTMLElement>('[part="overflow"]')!;
    const pageScroll = window.scrollY;
    bar.commands = [...commands.slice(1), { ...commands[0], label: 'Renamed command 1' }];
    const renamed = page.getByRole('button', { name: 'Renamed command 1' });
    await expectFocus(renamed);
    const button = renamed.element();
    const bounds = button.getBoundingClientRect();
    const top = overflow.getBoundingClientRect().top + overflow.clientTop;
    expect(bounds.top).toBeGreaterThanOrEqual(top - 1);
    expect(bounds.bottom).toBeLessThanOrEqual(top + overflow.clientHeight + 1);
    const text = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
    const range = document.createRange();
    for (const word of text.textContent!.matchAll(/\S+/g)) {
      range.setStart(text, word.index);
      range.setEnd(text, word.index + word[0].length);
      expect(range.getClientRects()).toHaveLength(1);
    }
    expect(window.scrollY).toBe(pageScroll);
    await userEvent.keyboard('{Enter}');
    await expectFocus(toggle);
    expect(events).toEqual([{ id: 'command-0' }]);
  } finally {
    document.documentElement.style.fontSize = originalSize;
  }
});

it('runs primary and overflow commands in an anchored CommandBarFlyout and restores the source', async () => {
  const host = fixture(`
    <button type="button">Record actions</button>
    <metro-command-bar-flyout label="Selected record"></metro-command-bar-flyout>
  `);
  const anchor = host.querySelector('button')!;
  const flyout = host.querySelector('metro-command-bar-flyout')!;
  flyout.commands = [{ id: 'open', label: 'Open' }, { id: 'export', label: 'Export', placement: 'secondary' }];
  const actions: [string, Element | null][] = [];
  flyout.addEventListener('metro-command', event => actions.push([event.detail.id, document.activeElement]));
  anchor.addEventListener('click', () => flyout.show(anchor));

  await page.getByRole('button', { name: 'Record actions' }).click();
  const surface = page.getByRole('dialog', { name: 'Selected record' });
  await expect.element(surface).toBeVisible();
  const open = page.getByRole('button', { name: 'Open', exact: true });
  await expectFocus(open);
  await userEvent.keyboard('{Enter}');
  await expect.element(surface).not.toBeInTheDocument();

  await page.getByRole('button', { name: 'Record actions' }).click();
  await page.getByRole('button', { name: 'More commands' }).click();
  await expectFocus(page.getByRole('button', { name: 'Export' }));
  await userEvent.keyboard('{Enter}');
  await expect.element(surface).not.toBeInTheDocument();
  expect(actions).toEqual([['open', anchor], ['export', anchor]]);

  await page.getByRole('button', { name: 'Record actions' }).click();
  await expect.element(surface).toBeVisible();
  flyout.context = 'next-record';
  await expect.element(surface).not.toBeInTheDocument();
  expect(document.activeElement).toBe(anchor);
});

it('presents the same controlled toggle command as a menu checkbox', async () => {
  const host = fixture(`<metro-menu-flyout label="View options" trigger-label="Options"></metro-menu-flyout>`);
  const menu = host.querySelector('metro-menu-flyout')!;
  const commands = [{ id: 'filter', label: 'Filter', checked: false }];
  menu.commands = commands;
  const details: MetroCommandDetail[] = [];
  menu.addEventListener('metro-command', event => details.push(event.detail));

  await page.getByRole('button', { name: 'Options' }).click();
  const item = page.getByRole('menuitemcheckbox', { name: 'Filter' });
  await expect.element(item).toHaveAttribute('aria-checked', 'false');
  await item.click();
  expect(details).toEqual([{ id: 'filter', checked: true }]);
  expect(commands[0].checked).toBe(false);
});

it('keeps Popup and TeachingTip persistent until explicit dismissal', async () => {
  const host = fixture(`
    <metro-popup label="Live preview" trigger-label="Show preview"><p>Preview details</p></metro-popup>
    <metro-teaching-tip heading="Pin this item" trigger-label="Show tip" dismiss-label="Understood">
      <p>Pinned items stay in your list.</p>
    </metro-teaching-tip>
    <button type="button" style="position: fixed; inset: 12rem auto auto 1rem">Outside</button>
  `);
  const popup = host.querySelector('metro-popup')!;
  const popupTrigger = page.getByRole('button', { name: 'Show preview' });
  const tipTrigger = page.getByRole('button', { name: 'Show tip' });
  const outside = page.getByRole('button', { name: 'Outside' });
  const preview = page.getByRole('dialog', { name: 'Live preview' });
  const tip = page.getByRole('dialog', { name: 'Pin this item' });
  const reasons: string[] = [];
  host.addEventListener('metro-close', event => reasons.push((event as CustomEvent).detail.reason));

  await popupTrigger.click();
  await expect.element(preview).toBeVisible();
  await expectFocus(popupTrigger);
  popup.focusContent();
  await expectFocus(preview);
  await outside.click();
  await expect.element(preview).toBeVisible();
  popup.close();
  await expect.element(preview).not.toBeInTheDocument();
  await expectFocus(outside);

  await tipTrigger.click();
  await expect.element(tip).toBeVisible();
  await expectFocus(tip);
  await outside.click();
  await expect.element(tip).toBeVisible();
  await page.getByRole('button', { name: 'Understood' }).click();
  await expect.element(tip).not.toBeInTheDocument();
  await expectFocus(tipTrigger);
  expect(reasons).toEqual(['programmatic', 'action']);
});

it('keeps a teaching tip and its localized dismiss action within the viewport at double text size', async () => {
  const heading = 'Lesezeichen'.repeat(8);
  const dismiss = 'HinweisAusblenden'.repeat(3);
  const host = fixture(`
    <style>metro-teaching-tip::part(surface) { max-inline-size:320px; max-block-size:280px; }</style>
    <div dir="rtl" style="position:fixed;inset:auto 8px 8px auto;font-size:1rem">
      <metro-teaching-tip heading="${heading}" trigger-label="Pin help" dismiss-label="${dismiss}">
        <p>${'Dokumentinformationen'.repeat(18)}</p>
      </metro-teaching-tip>
    </div>
  `);
  const size = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '200%';
  try {
    const trigger = page.getByRole('button', { name: 'Pin help' });
    const tip = page.getByRole('dialog', { name: heading });
    const action = page.getByRole('button', { name: dismiss });
    const closes: string[] = [];
    host.querySelector('metro-teaching-tip')!.addEventListener('metro-close', event => closes.push(event.detail.reason));
    await trigger.click();
    await expectFocus(tip);
    const bounds = tip.element().getBoundingClientRect();
    expect(bounds.right).toBeLessThanOrEqual(document.documentElement.clientWidth - 8);
    expect(bounds.bottom).toBeLessThan(trigger.element().getBoundingClientRect().top);
    expect(bounds.left).toBeGreaterThanOrEqual(8);
    expect(tip.element().scrollWidth).toBeLessThanOrEqual(tip.element().clientWidth + 1);
    await userEvent.tab();
    await expectFocus(action);
    const dismissal = action.element().getBoundingClientRect();
    expect(tip.element().scrollTop).toBeGreaterThan(0);
    expect(dismissal.top).toBeGreaterThanOrEqual(bounds.top - 2);
    expect(dismissal.bottom).toBeLessThanOrEqual(bounds.bottom + 2);
    await userEvent.keyboard('{Enter}');
    await expect.element(tip).not.toBeInTheDocument();
    await expectFocus(trigger);
    expect(closes).toEqual(['action']);
  } finally {
    document.documentElement.style.fontSize = size;
  }
});
