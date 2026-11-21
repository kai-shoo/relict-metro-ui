import { beforeEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/split-view.js';
import '../src/two-pane-view.js';

beforeEach(() => { document.body.replaceChildren(); });

test('TwoPaneView preserves slotted content and relocates focus when a pane becomes hidden', async () => {
  document.body.innerHTML = `
    <metro-two-pane-view first-label="List" second-label="Editor" wide-mode="second-first"
      tall-mode="first-second" min-tall-height="450" style="width: 800px; height: 500px">
      <button slot="first" type="button">Open contact</button>
      <input slot="second" aria-label="Contact draft">
    </metro-two-pane-view>
  `;
  const panes = document.querySelector('metro-two-pane-view')!;
  const modes: string[] = [];
  panes.addEventListener('metro-layout-change', event => modes.push(event.detail.mode));
  const draft = page.getByRole('textbox', { name: 'Contact draft' });
  const open = page.getByRole('button', { name: 'Open contact' });
  await draft.fill('unsaved contact');
  expect(panes.mode).toBe('wide');
  expect(draft.element().getBoundingClientRect().left).toBeLessThan(open.element().getBoundingClientRect().left);
  panes.style.width = '310px';
  await expect.poll(() => panes.mode).toBe('tall');
  expect(draft.element().getBoundingClientRect().top).toBeGreaterThan(open.element().getBoundingClientRect().top);
  await expect.element(draft).toHaveFocus();
  panes.style.height = '300px';
  await expect.poll(() => panes.mode).toBe('single');
  expect(panes.shadowRoot?.activeElement?.getAttribute('part')).toBe('first');
  panes.panePriority = 'second';
  await expect.element(draft).toHaveValue('unsaved contact');
  await expect.element(draft).toBeVisible();
  expect(modes).toEqual(['tall', 'single']);
});

test('SplitView separates its compact rail and full drawer and restores the toggle on Escape', async () => {
  document.body.innerHTML = `
    <metro-split-view display-mode="compact-overlay" pane-label="Folders" toggle-label="Toggle folders">
      <a slot="compact" href="#pinned">Pinned</a>
      <a slot="pane" href="#archive">Archive</a>
      <input aria-label="Document">
    </metro-split-view>
  `;
  const split = document.querySelector('metro-split-view')!;
  const change = vi.fn();
  split.addEventListener('metro-pane-change', change);
  const content = page.getByRole('textbox', { name: 'Document' });
  const toggle = page.getByRole('button', { name: 'Toggle folders' });
  await content.fill('draft');
  await expect.element(page.getByRole('link', { name: 'Pinned' })).toBeVisible();
  await toggle.click();
  await expect.element(page.getByRole('complementary', { name: 'Folders' })).toBeVisible();
  expect(split.shadowRoot?.activeElement?.getAttribute('part')).toBe('pane');
  expect(split.shadowRoot?.querySelector('[part="content"]')?.hasAttribute('inert')).toBe(true);
  await userEvent.tab();
  await expect.element(page.getByRole('link', { name: 'Archive' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(split.shadowRoot?.activeElement).toBe(toggle.element());
  await expect.element(content).toHaveValue('draft');
  expect(change.mock.calls.map(([event]) => event.detail.open)).toEqual([true, false]);
});

test('SplitView moves focus when layout makes content inert and preserves focus outside the layout', async () => {
  document.body.innerHTML = `
    <button type="button">Outside settings</button>
    <metro-split-view open pane-label="Folders">
      <a slot="pane" href="#archive">Archive</a>
      <input aria-label="Draft">
    </metro-split-view>`;
  const split = document.querySelector('metro-split-view')!;
  const outside = page.getByRole('button', { name: 'Outside settings' });
  const draft = page.getByRole('textbox', { name: 'Draft' });
  await draft.fill('untouched');
  const editor = draft.element() as HTMLInputElement;
  (outside.element() as HTMLButtonElement).focus();
  split.displayMode = 'overlay';
  await split.updateComplete;
  await expect.element(outside).toHaveFocus();

  split.displayMode = 'inline';
  await split.updateComplete;
  editor.focus();
  split.displayMode = 'overlay';
  await split.updateComplete;
  expect(split.shadowRoot?.activeElement?.getAttribute('part')).toBe('pane');
  expect(editor.value).toBe('untouched');
});

test('SplitView falls back to its toggle when the opening control is no longer focusable', async () => {
  document.body.innerHTML = `
    <button type="button">Open folders externally</button>
    <metro-split-view display-mode="overlay" toggle-label="Folders">
      <a slot="pane" href="#archive">Archive</a>
    </metro-split-view>`;
  const trigger = document.querySelector('button')!;
  const split = document.querySelector('metro-split-view')!;
  await split.updateComplete;
  trigger.focus();
  split.showPane(trigger);
  await split.updateComplete;
  trigger.disabled = true;
  await userEvent.keyboard('{Escape}');
  await split.updateComplete;
  expect(split.open).toBe(false);
  expect(split.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Folders', exact: true }).element());
});

test('SplitView sends focus to its toggle when the compact rail disappears', async () => {
  document.body.innerHTML = `
    <metro-split-view display-mode="compact-inline">
      <a slot="compact" href="#pinned">Pinned</a>
      <a slot="pane" href="#archive">Archive</a>
      <p>Messages</p>
    </metro-split-view>`;
  const split = document.querySelector('metro-split-view')!;
  await split.updateComplete;
  split.querySelector('a')!.focus();
  split.displayMode = 'inline';
  await split.updateComplete;
  expect(split.shadowRoot?.activeElement?.getAttribute('part')).toBe('toggle');
});

test.each(['ltr', 'rtl'])('SplitView places the overlay on the logical end in %s and closes from the scrim', async direction => {
  document.body.innerHTML = `
    <metro-split-view dir="${direction}" placement="end" display-mode="overlay"
      style="inline-size: 300px; --metro-split-pane-size: 120px">
      <p slot="pane">Folders</p>
      <p style="block-size: 100px; margin: 0">Messages</p>
    </metro-split-view>`;
  const split = document.querySelector('metro-split-view')!;
  const changes: boolean[] = [];
  split.addEventListener('metro-pane-change', event => changes.push(event.detail.open));
  const toggle = page.getByRole('button', { name: 'Toggle pane' });
  await toggle.click();
  const pane = split.shadowRoot!.querySelector('[part="pane"]')!.getBoundingClientRect();
  const scrim = split.shadowRoot!.querySelector('[part="scrim"]')!.getBoundingClientRect();
  expect(pane.width).toBe(120);
  const edge = direction === 'ltr' ? 'right' : 'left';
  expect(pane[edge]).toBe(scrim[edge]);
  const x = direction === 'ltr' ? scrim.left + 15 : scrim.right - 15;
  await userEvent.pointer([{ keys: '[MouseLeft]', coords: { x, y: scrim.top + 15 } }]);
  await split.updateComplete;
  expect(split.shadowRoot?.activeElement).toBe(toggle.element());
  expect(changes).toEqual([true, false]);
});
