import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import { MetroSelectionSet } from '../src/cross-slide.js';
import '../src/pivot.js';

interface CrossState {
  events: { value: string; selected: boolean; source: 'slide' | 'button' }[];
  section: string;
  vertical: number;
  horizontal: number;
  hash: string;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    crossSlideTouch(): Promise<Record<string, CrossState>>;
    collectionCrossSlideMove(): Promise<{
      canceled: string[]; library: string[]; archive: string[]; queue: string[]; selection: string[];
    }>;
  }
}

let fixture: HTMLDivElement | undefined;

afterEach(() => fixture?.remove());

test('explicit selection shares stable keys across filtered groups and prunes actual deletions', async () => {
  fixture = document.createElement('div');
  fixture.innerHTML = `<metro-pivot label="Groups" value="a">
    <metro-pivot-item value="a" label="First"><metro-cross-slide value="one" label="One"><a href="#one">One</a></metro-cross-slide></metro-pivot-item>
    <metro-pivot-item value="b" label="Second"><metro-cross-slide value="two" label="Two"><a href="#two">Two</a></metro-cross-slide></metro-pivot-item>
  </metro-pivot>`;
  document.body.append(fixture);
  const records = [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }, { value: 'three', label: 'Three' }];
  const selection = new MetroSelectionSet(records);
  const changes = vi.fn();
  fixture.addEventListener('metro-cross-slide-change', event => {
    changes(event.detail);
    selection.toggle(event.detail.value, event.detail.selected);
  });
  selection.addEventListener('change', () => {
    for (const row of fixture!.querySelectorAll('metro-cross-slide')) row.selected = selection.has(row.value);
  });
  const one = page.getByRole('button', { name: 'Select One' });
  (await one.findElement() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(one).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Second' }).click();
  await page.getByRole('button', { name: 'Select Two' }).click();
  expect(selection.values).toEqual(['one', 'two']);
  expect(changes).toHaveBeenCalledTimes(2);

  selection.replaceScope(['two', 'three'], ['three']);
  expect(selection.selectedItems).toEqual([records[0], records[2]]);
  selection.setCatalog(records.slice(1));
  expect(selection.values).toEqual(['three']);
  expect(changes).toHaveBeenCalledTimes(2);
});

test.skipIf(server.browser !== 'chromium')('short cross-slide selects without activating and both scroll axes remain native', async () => {
  const { tapped, short, over, canceled, scrolled, across, sideways } = await commands.crossSlideTouch();
  expect(tapped).toMatchObject({ hash: '#record', events: [] });
  const selected = [{ value: 'record', selected: true, source: 'slide' }];
  expect(short).toMatchObject({ events: selected, section: 'one', vertical: 0 });
  expect(over).toMatchObject({ events: selected, section: 'one' });
  expect(canceled.events).toEqual(selected);
  expect(scrolled.vertical).toBeGreaterThan(40);
  expect(scrolled.events).toEqual(selected);
  expect(across.events).toEqual([...selected, { value: 'side', selected: true, source: 'slide' }]);
  expect(across.horizontal).toBe(0);
  expect(sideways.horizontal).toBeGreaterThan(40);
  expect(sideways.events).toEqual(across.events);
});

test.skipIf(server.browser !== 'chromium')('continuing beyond the second threshold moves a selected group only on drop', async () => {
  expect(await commands.collectionCrossSlideMove()).toEqual({
    canceled: ['morning-bulletin'],
    library: ['radio-archive', 'evening-report'],
    archive: ['remote-interview'],
    queue: ['field-notes', 'night-signal', 'morning-bulletin'],
    selection: ['field-notes', 'night-signal'],
  });
});
