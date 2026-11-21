import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/command-bar.js';
import '../src/page.js';
import type { MetroCommandDetail } from '../src/command-bar.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.wp8BarTest = '';
  host.style.padding = '200px 100px 0';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

afterEach(() => document.querySelectorAll('[data-wp8-bar-test]').forEach(host => host.remove()));

it('keeps the first four icon commands in author order and opens only explicit secondary commands', async () => {
  const host = fixture(`
    <metro-command-bar profile="wp8" style="width: 360px">
      <metro-app-bar-separator></metro-app-bar-separator>
      <metro-app-bar-button command-id="unknown" label="Unknown icon" icon-name="unknown"></metro-app-bar-button>
      <metro-app-bar-button command-id="pin" label="Pin" icon-name="pin"></metro-app-bar-button>
      <metro-app-bar-button command-id="extra" label="Extra" icon-name="add" priority="100"></metro-app-bar-button>
      <metro-app-bar-button command-id="settings" label="settings" icon-name="settings" placement="secondary"></metro-app-bar-button>
    </metro-command-bar>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  bar.commands = [
    { id: 'text', label: 'No icon' },
    { id: 'save', label: 'Save', iconName: 'save' },
    { id: 'search', label: 'Search', iconName: 'search', priority: 20 },
    { id: 'sync', label: 'Sync', icon: '↻' },
    { id: 'help', label: 'help', placement: 'secondary' },
  ];
  const buttons = () => [...bar.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="primary"] button')];
  const ids = () => buttons().map(button => button.dataset.command);
  await expect.poll(ids).toEqual(['save', 'search', 'sync', 'pin']);
  expect(buttons().every(button => button.querySelector('[part="icon"]'))).toBe(true);
  const label = buttons()[0].querySelector('.label')!;
  expect(getComputedStyle(label).display).toBe('none');

  bar.style.width = '190px';
  bar.commands = bar.commands.map(command => ({ ...command, priority: command.id === 'sync' ? 900 : 0 }));
  bar.querySelector('[command-id="extra"]')!.setAttribute('priority', '999');
  const more = page.getByRole('button', { name: 'More commands' });
  await more.click();
  expect(ids()).toEqual(['save', 'search', 'sync', 'pin']);
  expect(getComputedStyle(label).display).not.toBe('none');
  const secondary = [...bar.shadowRoot!.querySelectorAll('[part="overflow"] button')];
  expect(secondary.map(button => button.textContent?.trim())).toEqual(['help', 'settings']);
  expect(secondary.every(button => !button.querySelector('[part="icon"], metro-icon'))).toBe(true);
  expect(bar.shadowRoot!.querySelector('[role="separator"]')).toBeNull();
  await expect.element(page.getByRole('button', { name: 'help' })).toBeVisible();

  const events: MetroCommandDetail[] = [];
  bar.addEventListener('metro-command', event => events.push(event.detail));
  await userEvent.keyboard('{Enter}');
  expect(events).toEqual([{ id: 'help' }]);
  await expect.element(more).toHaveAttribute('aria-expanded', 'false');
  expect(bar.shadowRoot!.activeElement).toBe(more.element());
});

it.each([
  ['portrait', 'default', 72],
  ['portrait', 'minimized', 30],
  ['landscape', 'default', 72],
  ['landscape', 'minimized', 72],
] as const)('uses the correct closed size in %s %s mode', async (orientation, mode, size) => {
  const landscape = orientation === 'landscape';
  const host = fixture(`
    <metro-command-bar profile="wp8" mode="${mode}" orientation="${landscape ? 'vertical' : 'horizontal'}">
      <metro-app-bar-button command-id="save" label="Save" icon-name="save"></metro-app-bar-button>
      <metro-app-bar-button command-id="pin" label="Pin" icon-name="pin"></metro-app-bar-button>
    </metro-command-bar>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  const more = page.getByRole('button', { name: 'More commands' });
  const save = page.getByRole('button', { name: 'Save' });
  const pin = page.getByRole('button', { name: 'Pin' });
  const extent = () => bar.getBoundingClientRect()[landscape ? 'width' : 'height'];

  await expect.element(more).toBeVisible();
  expect(extent()).toBe(size);
  if (!landscape && mode === 'minimized') {
    await expect.element(save).not.toBeInTheDocument();
  } else {
    await expect.element(save).toBeVisible();
    const first = save.element().getBoundingClientRect();
    const second = pin.element().getBoundingClientRect();
    expect(landscape ? first.bottom <= second.top : first.right <= second.left).toBe(true);
  }
  await more.click();
  await expect.element(save).toBeVisible();
  expect(getComputedStyle(save.element().querySelector('.label')!).display).not.toBe('none');
  await more.click();
  expect(extent()).toBe(size);
});

it.each(['horizontal', 'vertical'] as const)('reserves only the opaque strip and overlays the page in %s orientation', async orientation => {
  const landscape = orientation === 'vertical';
  const host = fixture(`
    <metro-page style="width: 360px; height: 320px">
      <div>Page content</div>
      <metro-command-bar slot="commands" profile="wp8" orientation="${orientation}" mode="minimized">
        <metro-app-bar-button command-id="save" label="Save" icon-name="save"></metro-app-bar-button>
        <metro-app-bar-button command-id="help" label="help" placement="secondary"></metro-app-bar-button>
      </metro-command-bar>
    </metro-page>
  `);
  const metroPage = host.querySelector('metro-page')!;
  const bar = host.querySelector('metro-command-bar')!;
  const more = page.getByRole('button', { name: 'More commands' });
  const help = page.getByRole('button', { name: 'help' });
  await expect.element(more).toBeVisible();

  const edge = landscape ? 'right' : 'bottom';
  const bodyEdge = () => metroPage.shadowRoot!.querySelector('[part="body"]')!.getBoundingClientRect()[edge];
  const pageEdge = () => metroPage.getBoundingClientRect()[edge];
  const reserved = () => pageEdge() - bodyEdge();
  const strip = landscape ? 72 : 30;
  expect(reserved()).toBe(strip);
  expect(bar.getBoundingClientRect()[edge]).toBe(pageEdge());
  await more.click();
  await expect.element(help).toBeVisible();
  expect(reserved()).toBe(strip);
  const menu = help.element().getBoundingClientRect();
  expect(menu[landscape ? 'right' : 'top']).toBeLessThanOrEqual(bodyEdge());
  await userEvent.keyboard('{Escape}');

  for (const opacity of [0, 0.5, 0.8]) {
    bar.setAttribute('opacity', String(opacity));
    await expect.poll(reserved).toBe(0);
    expect(bar.getBoundingClientRect()[edge]).toBe(pageEdge());
    const row = bar.shadowRoot!.querySelector('.row')!;
    expect(getComputedStyle(row).backgroundColor).toMatch(new RegExp(`(?:[,/])\\s*${opacity === 0 ? '0' : String(opacity).replace('.', '\\.')}\\)$`));
    expect(getComputedStyle(more.element()).opacity).toBe('1');
    await more.click();
    await expect.element(help).toBeVisible();
    expect(reserved()).toBe(0);
    expect(getComputedStyle(row).backgroundColor).not.toMatch(/[,/]\s*0(?:\.\d+)?\)$/);
    await userEvent.keyboard('{Escape}');
  }
  bar.setAttribute('opacity', '1');
  await expect.poll(reserved).toBe(strip);
  bar.hidden = true;
  await expect.poll(reserved).toBe(0);
  bar.hidden = false;
  await expect.poll(reserved).toBe(strip);
  bar.replaceChildren();
  await expect.poll(reserved).toBe(0);
});

it('repositions a slotted bar when the page switches orientation', async () => {
  const host = fixture(`
    <metro-page style="width: 360px; height: 320px">
      <metro-command-bar slot="commands" profile="wp8" mode="minimized">
        <metro-app-bar-button command-id="save" label="Save" icon-name="save"></metro-app-bar-button>
      </metro-command-bar>
    </metro-page>
  `);
  const bar = host.querySelector('metro-command-bar')!;
  const bounds = () => bar.getBoundingClientRect();
  const filled = () => [bounds().width, bounds().height];
  await expect.poll(filled).toEqual([360, 30]);
  bar.orientation = 'vertical';
  await expect.poll(filled).toEqual([72, 320]);
  await expect.element(page.getByRole('button', { name: 'Save' })).toBeVisible();
  bar.orientation = 'horizontal';
  await expect.poll(filled).toEqual([360, 30]);
  await expect.element(page.getByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});
