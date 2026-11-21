import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/list-box.js';
import '../src/list-view.js';
import '../src/grid-view.js';
import '../src/items-view.js';

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

async function expectFocus(locator: { element(): Element }) {
  await expect.poll(() => {
    const element = locator.element();
    return (element.getRootNode() as ShadowRoot).activeElement === element;
  }).toBe(true);
}

afterEach(() => fixture?.remove());

test('ListBox selects by stable key, skips disabled options and publishes only user selection', async () => {
  const container = mount(`<metro-list-box label="Folder" value="inbox">
    <metro-list-item value="inbox">Inbox</metro-list-item>
    <metro-list-item value="queued" disabled>Outbox</metro-list-item>
    <metro-list-item value="sent">Sent</metro-list-item>
  </metro-list-box>`);
  const list = container.querySelector('metro-list-box')!;
  const changes = vi.fn();
  list.addEventListener('metro-selection-change', event => changes(event.detail));
  const listbox = page.getByRole('listbox', { name: 'Folder' });
  const inbox = listbox.getByRole('option', { name: 'Inbox' });
  const sent = listbox.getByRole('option', { name: 'Sent' });
  await expect.element(inbox).toHaveAttribute('aria-selected', 'true');
  await expect.element(listbox.getByRole('option', { name: 'Outbox' })).toHaveAttribute('aria-disabled', 'true');
  list.focus();
  await userEvent.keyboard('{ArrowDown}');
  await expectFocus(sent);
  await expect.element(sent).toHaveAttribute('aria-selected', 'true');
  expect(list.value).toBe('sent');
  expect(changes).toHaveBeenCalledExactlyOnceWith({ value: 'sent', selectedValues: ['sent'] });

  await userEvent.keyboard('{Control>}{ArrowUp}{/Control}');
  await expectFocus(inbox);
  expect(list.value).toBe('sent');
  list.value = 'inbox';
  await expect.element(inbox).toHaveAttribute('aria-selected', 'true');
  list.value = 'unknown';
  await expect.element(inbox).toHaveAttribute('aria-selected', 'false');
  expect(list.selectedValues).toEqual([]);
  expect(changes).toHaveBeenCalledTimes(1);
  await userEvent.keyboard('s');
  await expectFocus(sent);
  expect(list.value).toBe('sent');
  expect(changes).toHaveBeenCalledTimes(2);
});

test.each(['metro-list-view', 'metro-grid-view', 'metro-items-view'] as const)('%s adds and shrinks a range while keeping earlier selections', async tag => {
  const container = mount(`<${tag} label="Records" selection-mode="multiple">
    <metro-list-item value="a">A</metro-list-item>
    <metro-list-item value="b">B</metro-list-item>
    <metro-list-item value="c">C</metro-list-item>
    <metro-list-item value="d">D</metro-list-item>
    <metro-list-item value="e">E</metro-list-item>
  </${tag}>`);
  const collection = container.querySelector(tag)!;
  await collection.updateComplete;
  collection.selectedValues = ['a'];
  expect(collection.focusItem('c')).toBe(true);
  await userEvent.keyboard(' {Control>}{Shift>}{End}{/Shift}{/Control}');
  expect(collection.selectedValues).toEqual(['a', 'c', 'd', 'e']);
  await userEvent.keyboard('{Control>}{Shift>}{Home}{/Shift}{/Control}');
  expect(collection.selectedValues).toEqual(['a', 'b', 'c']);
});

test('ListView keeps the embedded button focused when changing between selection and reading', async () => {
  const container = mount(`<metro-list-view label="Records" selection-mode="multiple">
    <metro-list-item value="a"><button type="button">Open notes</button></metro-list-item>
  </metro-list-view>`);
  const list = container.querySelector('metro-list-view')!;
  const action = page.getByRole('button', { name: 'Open notes' });
  const changes = vi.fn();
  const activated = vi.fn();
  list.addEventListener('metro-selection-change', changes);
  list.querySelector('button')!.addEventListener('click', activated);
  await expect.element(action).toBeVisible();
  const original = action.element() as HTMLElement;
  original.focus();

  for (const mode of ['none', 'multiple'] as const) {
    list.selectionMode = mode;
    await expect.element(page.getByRole(mode === 'none' ? 'list' : 'grid', { name: 'Records' })).toBeVisible();
    expect(action.element()).toBe(original);
    await expectFocus(action);
    await userEvent.keyboard('{Enter}');
  }
  expect(activated).toHaveBeenCalledTimes(2);
  expect(changes).not.toHaveBeenCalled();
});

test('ListView retains the current row when leaving selection mode without adding a Tab stop', async () => {
  const container = mount(`<metro-list-view label="Records" selection-mode="multiple">
    <metro-list-item value="a">Alpha</metro-list-item>
    <metro-list-item value="b">Beta</metro-list-item>
  </metro-list-view><button type="button">Next control</button>`);
  const list = container.querySelector('metro-list-view')!;
  const changes = vi.fn();
  list.addEventListener('metro-selection-change', changes);
  await list.updateComplete;
  expect(list.focusItem('b')).toBe(true);
  const row = () => list.shadowRoot!.querySelector<HTMLElement>('[data-collection-value="b"]')!;
  list.selectionMode = 'none';
  await list.updateComplete;
  expect(row().getAttribute('role')).toBe('listitem');
  expect(list.shadowRoot!.activeElement).toBe(row());
  expect(row().tabIndex).toBe(-1);
  list.selectionMode = 'multiple';
  await list.updateComplete;
  expect(row().getAttribute('role')).toBe('gridcell');
  expect(list.shadowRoot!.activeElement).toBe(row());
  list.selectionMode = 'none';
  await list.updateComplete;
  expect(list.shadowRoot!.activeElement).toBe(row());
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'Next control' })).toHaveFocus();
  expect(changes).not.toHaveBeenCalled();
});

test('ListView keeps range selection, activation, and embedded native buttons distinct', async () => {
  const container = mount(`<metro-list-view label="Messages" selection-mode="multiple" activatable>
    <metro-list-item value="one" label="First message">First <button type="button">Flag</button></metro-list-item>
    <metro-list-item value="two" disabled>Second message</metro-list-item>
    <metro-list-item value="three">Third message</metro-list-item>
    <metro-list-item value="four">Last message</metro-list-item>
  </metro-list-view>`);
  const list = container.querySelector('metro-list-view')!;
  const changes = vi.fn();
  const activation = vi.fn();
  const flag = vi.fn();
  list.addEventListener('metro-selection-change', event => changes(event.detail));
  list.addEventListener('metro-item-activate', event => activation(event.detail));
  container.querySelector('button')!.addEventListener('click', flag);
  const grid = page.getByRole('grid', { name: 'Messages' });
  const third = grid.getByRole('gridcell', { name: 'Third message' });
  const last = grid.getByRole('gridcell', { name: 'Last message' });
  await expect.element(grid).toHaveAttribute('aria-multiselectable', 'true');
  list.focus();
  await userEvent.keyboard(' {Shift>}{ArrowDown}{ArrowDown}{/Shift}');
  await expectFocus(last);
  await expect.element(third).toHaveAttribute('aria-selected', 'true');
  expect(list.selectedValues).toEqual(['one', 'three', 'four']);
  expect(changes).toHaveBeenCalledTimes(3);
  await userEvent.keyboard('{Enter}');
  expect(activation).toHaveBeenCalledExactlyOnceWith({ value: 'four' });
  expect(changes).toHaveBeenCalledTimes(3);

  await page.getByRole('button', { name: 'Flag' }).click();
  expect(flag).toHaveBeenCalledTimes(1);
  expect(activation).toHaveBeenCalledTimes(1);
  expect(changes).toHaveBeenCalledTimes(3);

  list.selectedValues = [];
  await list.updateComplete;
  expect(list.focusItem('three')).toBe(true);
  await userEvent.keyboard('{Control>}a{/Control}');
  expect(list.selectedValues).toEqual(['one', 'three', 'four']);
  expect(changes).toHaveBeenLastCalledWith({ value: 'one', selectedValues: ['one', 'three', 'four'] });
});

test('ListView can display passive content or activate items without selection', async () => {
  const container = mount(`<metro-list-view label="Journal">
    <metro-list-item value="first">First entry</metro-list-item>
  </metro-list-view>`);
  const list = container.querySelector('metro-list-view')!;
  const activation = vi.fn();
  list.addEventListener('metro-item-activate', event => activation(event.detail));
  const entry = page.getByRole('list', { name: 'Journal' }).getByRole('listitem');
  await expect.element(entry).toBeVisible();
  await entry.click();
  expect(activation).not.toHaveBeenCalled();

  list.activatable = true;
  await page.getByRole('gridcell', { name: 'First entry' }).click();
  expect(activation).toHaveBeenCalledExactlyOnceWith({ value: 'first' });
  expect(list.value).toBe('');
});

test('GridView uses two-dimensional roving focus and preserves it across column changes', async () => {
  const container = mount('<metro-grid-view label="Albums" selection-mode="single" columns="3"></metro-grid-view>');
  const grid = container.querySelector('metro-grid-view')!;
  grid.items = Array.from({ length: 6 }, (_, index) => ({ value: String(index + 1), label: `Album ${index + 1}` }));
  const albums = page.getByRole('grid', { name: 'Albums' });
  await expect.element(albums.getByRole('gridcell', { name: 'Album 1' })).toHaveAttribute('tabindex', '0');
  grid.focus();
  await userEvent.keyboard('{ArrowDown}{ArrowRight}');
  const fifth = albums.getByRole('gridcell', { name: 'Album 5' });
  await expectFocus(fifth);
  expect(grid.value).toBe('');
  await userEvent.keyboard(' ');
  await expect.element(fifth).toHaveAttribute('aria-selected', 'true');
  grid.columns = 2;
  await expectFocus(fifth);
  await expect.poll(() => albums.getByRole('row').length).toBe(3);
  await userEvent.keyboard('{ArrowUp}');
  await expectFocus(albums.getByRole('gridcell', { name: 'Album 3' }));
  expect(grid.value).toBe('5');
});

test('GridView keeps a visible keyboard target in view when responsive columns collapse', async () => {
  const container = mount('<metro-grid-view label="Stations" selection-mode="single" style="width:470px;height:162px"></metro-grid-view>');
  const grid = container.querySelector('metro-grid-view')!;
  grid.items = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `Station ${index + 1}` }));
  const navigation = page.getByRole('grid', { name: 'Stations' });
  await expect.poll(() => navigation.getByRole('row').length).toBe(4);
  await grid.updateComplete;
  expect(grid.focusItem('7', { preventScroll: true })).toBe(true);
  const target = navigation.getByRole('gridcell', { name: 'Station 7' });
  expect(target.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(grid.getBoundingClientRect().bottom);
  const documentOffset = window.scrollY;
  const changes = vi.fn();
  grid.addEventListener('metro-selection-change', changes);

  grid.style.width = '200px';
  await expect.poll(() => navigation.getByRole('row').length).toBe(12);
  await expectFocus(target);
  const focused = target.element().getBoundingClientRect();
  const bounds = grid.getBoundingClientRect();
  expect(focused.top).toBeGreaterThanOrEqual(bounds.top - 1);
  expect(focused.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  expect(window.scrollY).toBe(documentOffset);
  await userEvent.keyboard('{ArrowDown}');
  await expectFocus(navigation.getByRole('gridcell', { name: 'Station 8' }));
  expect(changes).not.toHaveBeenCalled();
});

test('ListView restores the start of an item after a layout change shortens it', async () => {
  const container = mount(`<metro-list-view label="Contacts" style="height:100px;overflow-anchor:none;
    --metro-collection-item-height:100px"></metro-list-view>`);
  const list = container.querySelector('metro-list-view')!;
  list.items = Array.from({ length: 10 }, (_, index) => ({ value: `item-${index}`, label: `Contact ${index}` }));
  await list.updateComplete;
  list.scrollTop = 145;
  const anchor = list.getAnchor()!;
  expect(anchor).toEqual({ key: 'item-1', offset: -45, axis: 'vertical' });
  list.style.setProperty('--metro-collection-item-height', '32px');
  expect(list.restoreAnchor(anchor)).toBe(true);
  expect(list.getAnchor()).toEqual({ ...anchor, offset: 0 });
});

test('Changing collection data preserves its visible offset and moves removed focus to the nearest enabled item', async () => {
  const container = mount(`<metro-list-view label="Contacts" selection-mode="multiple"
    style="height:120px; --metro-collection-item-height: 50px"></metro-list-view>`);
  const list = container.querySelector('metro-list-view')!;
  const people = ['amy', 'bob', 'cal', 'dee', 'eli', 'fio'].map(value => ({ value, label: value }));
  list.items = people;
  list.selectedValues = ['cal', 'dee'];
  await expect.element(page.getByRole('gridcell', { name: 'cal' })).toBeVisible();
  expect(list.focusItem('cal')).toBe(true);
  list.scrollTop = 108;
  const before = list.getAnchor();
  expect(before).toEqual({ key: 'cal', offset: -8, axis: 'vertical' });

  list.items = [{ value: 'anon', label: 'Anon' }, ...people];
  await list.updateComplete;
  expect(list.getAnchor()).toEqual(before);
  await expectFocus(page.getByRole('gridcell', { name: 'cal' }));

  const changes = vi.fn();
  list.addEventListener('metro-selection-change', changes);
  list.items = list.items.filter(item => item.value !== 'cal');
  await list.updateComplete;
  await expectFocus(page.getByRole('gridcell', { name: 'dee' }));
  expect(list.getAnchor()).toEqual({ key: 'dee', offset: -8, axis: 'vertical' });
  expect(list.selectedValues).toEqual(['dee']);
  expect(list.restoreAnchor(before!)).toBe(false);
  expect(changes).not.toHaveBeenCalled();

  list.items = [];
  await list.updateComplete;
  await expectFocus(page.getByRole('grid', { name: 'Contacts' }));
  list.items = [{ value: 'geo', label: 'Geo' }];
  await list.updateComplete;
  await expectFocus(page.getByRole('gridcell', { name: 'Geo' }));
});
