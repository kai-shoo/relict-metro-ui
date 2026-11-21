import { afterEach, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/command-bar.js';
import '../src/hub.js';

declare module 'vitest/browser' {
  interface BrowserCommands {
    phoneHubExample(): Promise<Record<string, boolean>>;
  }
}

function mount(markup: string) {
  const host = document.createElement('div');
  host.dataset.phoneHub = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

afterEach(() => document.querySelectorAll('[data-phone-hub]').forEach(host => host.remove()));

test('CommandBar modes preserve commands, accessible triggers, and focus when collapsed', async () => {
  const host = mount('<metro-command-bar style="width:400px"></metro-command-bar>');
  const bar = host.querySelector('metro-command-bar')!;
  bar.commands = [{ id: 'new', label: 'Create', icon: '+' }, { id: 'about', label: 'About', placement: 'secondary' }];
  const primary = page.getByRole('button', { name: 'Create' });
  const more = page.getByRole('button', { name: 'More commands' });
  const row = () => bar.shadowRoot!.querySelector('.row')!.getBoundingClientRect().height;
  await expect.element(primary).toBeVisible();
  const expandedHeight = row();
  expect(bar.mode).toBe('default');

  bar.mode = 'compact';
  await bar.updateComplete;
  const compactHeight = row();
  expect(compactHeight).toBeLessThan(expandedHeight);
  await expect.element(primary).toBeVisible();
  (primary.element() as HTMLElement).focus();

  bar.mode = 'minimal';
  await expect.element(primary).not.toBeInTheDocument();
  expect(row()).toBeLessThan(compactHeight);
  await expect.poll(() => bar.shadowRoot!.activeElement).toBe(more.element());
  bar.focus();
  expect(bar.shadowRoot!.activeElement).toBe(more.element());
  await userEvent.keyboard('{Enter}');
  await expect.element(primary).toBeVisible();
  await expect.element(page.getByText('Create', { exact: true })).toBeVisible();
  await expect.poll(() => bar.shadowRoot!.activeElement).toBe(page.getByRole('button', { name: 'About' }).element());
  expect(bar.closeMenu()).toBe(true);
  expect(bar.closeMenu()).toBe(false);
  await expect.poll(() => bar.shadowRoot!.activeElement).toBe(more.element());

  bar.commands = [{ id: 'primary-only', label: 'Only command' }];
  await bar.updateComplete;
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => bar.shadowRoot!.activeElement).toBe(page.getByRole('button', { name: 'Only command' }).element());
});

test('first visible geometry changes independently of a held drag and Phone Hub only cycles with three sections', async () => {
  const host = mount(`<metro-hub value="overview" heading="Routes" style="width:380px">
    <metro-hub-section value="overview" label="Overview"><p>Overview cards</p></metro-hub-section>
    <metro-hub-section value="recent" label="Recent"><p>Recent cards</p></metro-hub-section>
    <metro-hub-section value="favorites" label="Favorites"><p>Favorite cards</p></metro-hub-section>
  </metro-hub>`);
  const hub = host.querySelector('metro-hub')!;
  const visible: string[] = [];
  const committed: string[] = [];
  hub.addEventListener('metro-sections-in-view-change', event => visible.push(event.detail.first));
  hub.addEventListener('metro-change', event => committed.push(event.detail.value));
  await expect.poll(() => hub.sectionsInView).toEqual(['overview', 'recent']);
  expect(hub.firstVisible).toBe('overview');

  const view = hub.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect();
  const y = view.top + 45;
  try {
    await userEvent.pointer({ keys: '[MouseLeft>]', coords: { x: view.right - 6, y } });
    await userEvent.pointer({ coords: { x: view.left + view.width * .5, y } });
    expect(hub.firstVisible).toBe('overview');
    expect(hub.sectionsInView).toContain('recent');
    await userEvent.pointer({ coords: { x: view.left + 5, y } });
    await expect.poll(() => hub.firstVisible).toBe('recent');
    expect(hub.value).toBe('overview');
    expect(committed).toEqual([]);
  } finally {
    await userEvent.pointer('[/MouseLeft]');
  }
  await expect.poll(() => hub.value).toBe('recent');
  expect(visible).toContain('recent');
  expect(committed).toEqual(['recent']);

  hub.focusSection('favorites');
  await expect.poll(() => hub.firstVisible).toBe('favorites');
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => hub.value).toBe('overview');
  expect(committed).toEqual(['recent', 'overview']);

  hub.querySelector('[value="favorites"]')!.remove();
  hub.focusSection('recent');
  await expect.poll(() => hub.firstVisible).toBe('recent');
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => hub.value).toBe('recent');
  expect(committed).toEqual(['recent', 'overview']);
});

test('Phone Hub example keeps commands tied to the visible section and restores the origin on Back', async () => {
  expect(await commands.phoneHubExample()).toEqual({
    previewIsPassive: true, menuBack: true, recentIsCompact: true, contextChanged: true,
    stalePreserved: true, cancelPreserved: true, freshCleared: true,
  });
}, 15000);
