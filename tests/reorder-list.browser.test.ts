import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/reorder-list.js';
import type { MetroReorderDetail } from '../src/reorder-list.js';

interface ReorderState {
  values: string[];
  commits: MetroReorderDetail[];
  previews: MetroReorderDetail[];
  focused?: string;
  proposal: MetroReorderDetail | null;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    reorderDrag(): Promise<{ dropped: ReorderState; canceled: ReorderState; stale: ReorderState }>;
  }
}

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture.querySelector('metro-reorder-list')!;
}

afterEach(() => fixture?.remove());

test('keyboard moves preview a new order while application data stays unchanged until commit', async () => {
  const list = mount(`<metro-reorder-list label="Queue">
    <metro-list-item value="alpha" label="Alpha"><button>Open Alpha</button></metro-list-item>
    <metro-list-item value="beta" label="Beta" disabled>Beta</metro-list-item>
    <metro-list-item value="gamma" label="Gamma">Gamma</metro-list-item>
  </metro-reorder-list>`);
  const commits = vi.fn();
  const previews = vi.fn();
  list.addEventListener('metro-reorder', event => commits(event.detail));
  list.addEventListener('metro-reorder-preview', event => previews(event.detail));
  const start = page.getByRole('button', { name: 'Move Alpha' });
  await expect.element(start).toBeEnabled();
  await expect.element(page.getByRole('button', { name: 'Move Beta' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Open Alpha' })).toBeVisible();
  (start.element() as HTMLButtonElement).focus();
  await userEvent.keyboard(' {ArrowDown}');
  await expect.element(start).toHaveAttribute('aria-pressed', 'true');
  expect(list.values).toEqual(['alpha', 'beta', 'gamma']);
  expect(previews).toHaveBeenCalledExactlyOnceWith({ value: 'alpha', before: 'gamma', values: ['beta', 'alpha', 'gamma'], source: 'keyboard' });
  expect(list.proposal?.before).toBe('gamma');
  expect(list.shadowRoot?.querySelector('[part="marker"]')?.parentElement?.dataset.reorderKey).toBe('gamma');
  await userEvent.keyboard('{Escape}');
  expect(list.proposal).toBeNull();
  expect(list.values).toEqual(['alpha', 'beta', 'gamma']);
  expect(commits).not.toHaveBeenCalled();
  expect(list.shadowRoot?.activeElement).toBe(start.element());

  await userEvent.keyboard(' {ArrowDown}{ArrowDown}{Enter}');
  expect(list.values).toEqual(['alpha', 'beta', 'gamma']);
  expect(commits).toHaveBeenCalledExactlyOnceWith({ value: 'alpha', before: null, values: ['beta', 'gamma', 'alpha'], source: 'keyboard' });
  list.append(list.querySelector('[value="alpha"]')!);
  await expect.poll(() => list.values).toEqual(['beta', 'gamma', 'alpha']);
  expect(list.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Move Alpha');
});

test('desktop drag uses the same insertion contract and cancels outside or after a target disappears', async () => {
  const { dropped, canceled, stale } = await commands.reorderDrag();
  expect(dropped.values).toEqual(['b', 'a', 'c']);
  expect(dropped.commits).toEqual([{ value: 'a', before: 'c', values: ['b', 'a', 'c'], source: 'pointer' }]);
  expect(dropped.previews).toContainEqual(dropped.commits[0]);
  expect(dropped.focused).toBe('a');
  expect(canceled.values).toEqual(dropped.values);
  expect(canceled.commits).toEqual(dropped.commits);
  expect(canceled.proposal).toBeNull();
  expect(canceled.focused).toBe('a');
  expect(stale.values).toEqual(['b', 'a']);
  expect(stale.commits).toEqual(dropped.commits);
  expect(stale.proposal).toBeNull();
  expect(stale.focused).toBe('a');
});

test('keyboard reordering reveals the insertion marker and brings the source handle back on Escape', async () => {
  const list = mount('<metro-reorder-list label="Queue" style="block-size: 132px; scroll-behavior: smooth"></metro-reorder-list>');
  list.items = Array.from({ length: 20 }, (_, index) => ({ value: `item-${index}`, label: `Item ${index}` }));
  const first = page.getByRole('button', { name: 'Move Item 0' });
  await expect.element(first).toBeVisible();
  (first.element() as HTMLButtonElement).focus();
  await userEvent.keyboard(' ' + '{ArrowDown}'.repeat(12));
  expect(list.proposal?.before).toBe('item-13');
  expect(list.scrollTop).toBeGreaterThan(0);
  const marker = list.shadowRoot!.querySelector('[part="marker"]')!.getBoundingClientRect();
  const box = list.getBoundingClientRect();
  expect(marker.top).toBeGreaterThanOrEqual(box.top);
  expect(marker.bottom).toBeLessThanOrEqual(box.bottom + 1);
  await userEvent.keyboard('{Escape}');
  expect(list.proposal).toBeNull();
  expect(list.shadowRoot?.activeElement).toBe(first.element());
  expect(list.scrollTop).toBe(0);
});

test('reorder keeps focus explicitly moved by the app during commit', async () => {
  const list = mount('<button type="button">Summary</button><metro-reorder-list label="Queue"></metro-reorder-list>');
  list.items = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
  const summary = fixture!.querySelector('button')!;
  list.addEventListener('metro-reorder', () => summary.focus());
  const first = page.getByRole('button', { name: 'Move Alpha' });
  await expect.element(first).toBeVisible();
  (first.element() as HTMLButtonElement).focus();
  await userEvent.keyboard(' {ArrowDown}{Enter}');
  await list.updateComplete;
  expect(document.activeElement).toBe(summary);
  expect(list.proposal).toBeNull();
});
