import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/long-list-selector.js';

let fixture: HTMLDivElement | undefined;

function mount(content = '<metro-long-list-selector label="Authors"></metro-long-list-selector>') {
  fixture = document.createElement('div');
  fixture.style.setProperty('--metro-long-list-height', '180px');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture.querySelector('metro-long-list-selector')!;
}

function createGroup(value: string, label: string, count: number) {
  return { value, label, items: Array.from({ length: count }, (_, index) => ({ value: `${value}-${index}`, label: `${label} ${index}` })) };
}

afterEach(() => fixture?.remove());

test('wraps a long overview label within a narrow right-to-left list', async () => {
  const label = 'Gruppenübersicht'.repeat(5);
  const list = mount(`<metro-long-list-selector dir="rtl" jump-label="${label}" style="width:160px;font-size:2rem">
  </metro-long-list-selector>`);
  list.groups = [createGroup('a', 'A', 2)];
  const overview = page.getByRole('button', { name: label, exact: true });
  await expect.element(overview).toBeEnabled();
  const bounds = list.getBoundingClientRect();
  const button = overview.element().getBoundingClientRect();
  expect(button.left).toBeGreaterThanOrEqual(bounds.left);
  expect(button.right).toBeLessThanOrEqual(bounds.right);
  expect(overview.element().scrollWidth).toBeLessThanOrEqual(overview.element().clientWidth);
  await overview.click();
  await expect.element(page.getByRole('dialog', { name: label, exact: true })).toBeVisible();
});

test('alphabet headers align the initial at the bottom left and scale into a compact group row', async () => {
  const list = mount();
  list.groups = [createGroup('p', 'П', 1)];
  const header = page.getByRole('button', { name: 'П', exact: true });
  await expect.element(header).toBeVisible();
  const tile = header.element();
  const range = document.createRange();
  range.selectNodeContents(tile);
  const bounds = tile.getBoundingClientRect();
  const letter = range.getBoundingClientRect();
  expect(bounds.width).toBe(62);
  expect(bounds.height).toBe(62);
  expect(getComputedStyle(tile).fontSize).toBe('48px');
  expect(letter.left - bounds.left).toBeCloseTo(8, 0);
  expect(bounds.bottom - letter.bottom).toBeLessThan(letter.top - bounds.top);

  list.groupHeight = 52;
  await expect.poll(() => tile.getBoundingClientRect().width).toBe(52);
  expect(tile.getBoundingClientRect().height).toBe(52);
});

test('alphabet overview uses 99 pixel square tiles with bottom-aligned initials and skips empty groups', async () => {
  const list = mount();
  list.groups = [createGroup('p', 'П', 1), createGroup('r', 'Р', 0), createGroup('s', 'С', 1)];
  const header = page.getByRole('button', { name: 'П', exact: true });
  await header.click();
  const dialog = page.getByRole('dialog', { name: 'Groups' });
  await expect.element(dialog).toBeVisible();
  const tiles = list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="jump-tile"]');
  const [tile, empty] = tiles;
  expect(tile.textContent).toBe('П');
  expect(empty.textContent).toBe('Р');
  expect(empty.disabled).toBe(true);

  const bounds = tile.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(tile);
  const letter = range.getBoundingClientRect();
  expect(bounds.width).toBe(99);
  expect(bounds.height).toBe(99);
  expect(empty.getBoundingClientRect().left - bounds.right).toBe(6);
  expect(getComputedStyle(tile).fontSize).toBe('48px');
  expect(letter.left - bounds.left).toBeCloseTo(8, 0);
  expect(bounds.bottom - letter.bottom).toBeLessThan(letter.top - bounds.top);
});

test('pins a single group header and pushes it out at the next group in both scroll directions', async () => {
  const list = mount('<metro-long-list-selector label="Authors"><div slot="header" style="height:40px"></div></metro-long-list-selector>');
  list.groups = [createGroup('a', 'A', 40), createGroup('empty', 'E', 0), createGroup('b', 'B', 40)];
  await list.updateComplete;
  const root = list.shadowRoot!;
  const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!;
  const headerOffset = (group: string) => {
    const rows = root.querySelectorAll(`[data-row="group:${group}"]`);
    expect(rows.length).toBeLessThanOrEqual(1);
    return rows[0] && Math.round(rows[0].getBoundingClientRect().top - viewport.getBoundingClientRect().top);
  };
  const boundary = 40 + list.groupHeight + 40 * list.itemHeight;
  expect(headerOffset('a')).toBe(40);
  viewport.scrollTop = 900;
  await expect.poll(() => headerOffset('a')).toBe(0);
  expect(root.querySelectorAll('[part="row"]').length).toBeLessThan(16);

  viewport.scrollTop = boundary - 30;
  await expect.poll(() => headerOffset('a')).toBe(30 - list.groupHeight);
  expect(headerOffset('b')).toBe(30);
  viewport.scrollTop = boundary + 350;
  await expect.poll(() => headerOffset('b')).toBe(0);
  expect(headerOffset('a')).toBeUndefined();

  viewport.scrollTop = boundary - 30;
  await expect.poll(() => headerOffset('a')).toBe(30 - list.groupHeight);
  viewport.scrollTop = 900;
  await expect.poll(() => headerOffset('a')).toBe(0);
  viewport.scrollTop = 10;
  await expect.poll(() => headerOffset('a')).toBe(30);
});

test('opens Quick Jump from a pinned letter and preserves virtual anchors on cancel or jump', async () => {
  const list = mount();
  list.groups = [createGroup('a', 'A', 40), createGroup('b', 'B', 40)];
  await list.updateComplete;
  const anchor = { key: 'a-22', offset: -12, axis: 'vertical' } as const;
  expect(list.restoreAnchor(anchor)).toBe(true);
  const grid = page.getByRole('grid', { name: 'Authors' });
  const pinned = grid.getByRole('button', { name: 'A', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Groups' });
  await pinned.click();
  await expect.element(dialog).toBeVisible();
  expect(list.getAnchor()).toEqual(anchor);
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.poll(() => list.shadowRoot?.activeElement).toBe(pinned.element());
  expect(list.getAnchor()).toEqual(anchor);

  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).toBeVisible();
  const beta = Array.from(list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="jump-tile"]'))
    .find(button => button.textContent?.trim() === 'B')!;
  await userEvent.click(beta);
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('B 0');
  expect(list.getAnchor()).toEqual({ key: 'b', offset: 0, axis: 'vertical', group: true });
  expect(list.shadowRoot!.querySelectorAll('[part="row"]').length).toBeLessThan(16);
});

test('reveals a focused item below the pinned header', async () => {
  const list = mount();
  list.groups = [createGroup('a', 'A', 40)];
  await list.updateComplete;
  expect(list.restoreAnchor({ key: 'a-22', offset: -12, axis: 'vertical' })).toBe(true);
  await expect.poll(() => list.getAnchor()?.key).toBe('a-22');
  expect(list.focusItem('a-23')).toBe(true);
  const header = list.shadowRoot!.querySelector('[data-row="group:a"]')!;
  const viewport = list.shadowRoot!.querySelector('[part="viewport"]')!;
  await expect.poll(() => {
    const item = list.shadowRoot?.activeElement;
    if (item?.textContent?.trim() !== 'A 23') return false;
    const bounds = item.getBoundingClientRect();
    return bounds.top >= header.getBoundingClientRect().bottom
      && bounds.bottom <= viewport.getBoundingClientRect().bottom;
  }).toBe(true);
});

test('virtualizes rows, keeps offscreen selection and makes keyboard End reach the real final row', async () => {
  const list = mount();
  list.selectionMode = 'multiple';
  const groups = [createGroup('a', 'Alpha', 400), createGroup('b', 'Beta', 400), createGroup('c', 'Gamma', 400)];
  list.groups = groups;
  const changes = vi.fn();
  list.addEventListener('metro-selection-change', event => changes(event.detail));
  const viewport = page.getByRole('grid', { name: 'Authors' });
  await expect.element(viewport).toHaveAttribute('aria-rowcount', '1203');
  expect(list.shadowRoot!.querySelectorAll('[part="row"]').length).toBeLessThan(16);
  expect(list.shadowRoot!.querySelectorAll('[part="jump-tile"]')).toHaveLength(0);

  expect(list.focusItem('a-0')).toBe(true);
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Alpha 0');
  await userEvent.keyboard(' {End}');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Gamma 399');
  await expect.element(viewport.getByRole('gridcell', { name: 'Gamma 399' })).toBeVisible();
  expect(list.selectedValues).toEqual(['a-0']);
  expect(list.shadowRoot!.querySelectorAll('[part="row"]').length).toBeLessThan(16);

  await userEvent.keyboard('{Control>}a{/Control}');
  expect(list.selectedValues).toHaveLength(1200);
  expect(changes).toHaveBeenCalledTimes(2);
  list.groups = [{ ...groups[0], items: groups[0].items.slice(1) }, groups[1], groups[2]];
  await list.updateComplete;
  expect(list.selectedValues).toHaveLength(1199);
  expect(list.selectedValues).not.toContain('a-0');
  expect(changes).toHaveBeenCalledTimes(2);
});

test('repeated letters cycle through enabled items and a prefix moves focus without selecting', async () => {
  const list = mount();
  list.selectionMode = 'multiple';
  list.groups = [
    { value: 'a', label: 'A', items: [{ value: 'alpha', label: 'Alpha' }] },
    { value: 'b', label: 'B', items: [
      { value: 'blocked', label: 'Blocked', disabled: true },
      { value: 'beta', label: 'Beta' },
      { value: 'budget', label: 'Budget' },
    ] },
  ];
  list.selectedValues = ['alpha'];
  await list.updateComplete;
  const changed = vi.fn();
  list.addEventListener('metro-selection-change', changed);
  expect(list.focusItem('alpha')).toBe(true);
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Alpha');
  await userEvent.keyboard('bb');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Budget');
  expect(list.focusItem('alpha')).toBe(true);
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Alpha');
  await userEvent.keyboard('be');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta');
  expect(list.selectedValues).toEqual(['alpha']);
  expect(changed).not.toHaveBeenCalled();
});

test('Tab enters the visible rows after passive scrolling without disturbing the anchor', async () => {
  const list = mount();
  list.groups = [createGroup('a', 'Alpha', 60)];
  await list.updateComplete;
  const overview = page.getByRole('button', { name: 'Groups', exact: true });
  (overview.element() as HTMLElement).focus();
  const viewport = list.shadowRoot!.querySelector<HTMLElement>('[part=viewport]')!;
  viewport.scrollTop = 1100;
  await expect.poll(() => list.getAnchor()?.key).toBe('a-18');
  await expect.poll(() => list.shadowRoot!.querySelector('[data-row="item:a-18"]')).toBeTruthy();
  const anchor = list.getAnchor();
  await userEvent.keyboard('{Tab}');
  const focused = list.shadowRoot?.activeElement;
  expect(focused?.getAttribute('role')).toBe('gridcell');
  const row = focused!.getBoundingClientRect();
  const bounds = viewport.getBoundingClientRect();
  expect(row.top).toBeGreaterThanOrEqual(bounds.top - 1);
  expect(row.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  expect(list.getAnchor()).toEqual(anchor);
});

test('changing viewport and row height keeps a focused row in sight without changing selection', async () => {
  const list = mount();
  list.selectionMode = 'single';
  list.groups = [createGroup('a', 'Alpha', 60)];
  list.value = 'a-0';
  await list.updateComplete;
  const changed = vi.fn();
  list.addEventListener('metro-selection-change', changed);
  expect(list.focusItem('a-12')).toBe(true);
  const viewport = list.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
  const inView = () => {
    const active = list.shadowRoot?.activeElement;
    if (active?.textContent?.trim() !== 'Alpha 12') return false;
    const row = active.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    return row.top >= bounds.top - 1 && row.bottom <= bounds.bottom + 1;
  };
  await expect.poll(inView).toBe(true);

  list.style.setProperty('--metro-long-list-height', '115px');
  await expect.poll(inView).toBe(true);
  list.itemHeight = 102;
  await list.updateComplete;
  await expect.poll(inView).toBe(true);
  expect(list.value).toBe('a-0');
  expect(changed).not.toHaveBeenCalled();
});

test('adding and shrinking a keyed range preserves rows selected outside it', async () => {
  const list = mount();
  list.selectionMode = 'multiple';
  list.groups = [createGroup('a', 'Alpha', 12)];
  await list.updateComplete;
  list.selectedValues = ['a-1'];
  list.focusItem('a-4');
  await list.updateComplete;
  await userEvent.keyboard(' {Control>}{Shift>}{ArrowDown}{ArrowDown}{ArrowUp}{/Shift}{/Control}');
  expect(list.selectedValues).toEqual(['a-1', 'a-4', 'a-5']);
});

test('keeps a shortened row as the scroll anchor when virtual row sizes change', async () => {
  const list = mount();
  list.groups = [createGroup('a', 'Alpha', 20)];
  list.itemHeight = 100;
  await list.updateComplete;
  const anchor = { key: 'a-6', offset: -60, axis: 'vertical' } as const;
  expect(list.restoreAnchor(anchor)).toBe(true);
  await expect.poll(() => list.getAnchor()).toEqual(anchor);
  list.itemHeight = 44;
  await list.updateComplete;
  const top = { ...anchor, offset: 0 };
  expect(list.getAnchor()).toEqual(top);
  list.jumpToGroup('a');
  expect(list.restoreAnchor(anchor)).toBe(true);
  await expect.poll(() => list.getAnchor()).toEqual(top);
});

test('restores the visible key and pixel offset after group reordering and chooses nearby focus on removal', async () => {
  const list = mount();
  const first = createGroup('a', 'Alpha', 8);
  const second = createGroup('b', 'Beta', 8);
  list.groups = [first, second];
  await list.updateComplete;
  expect(list.restoreAnchor({ key: 'b-1', offset: -12, axis: 'vertical' })).toBe(true);
  await list.updateComplete;
  expect(list.getAnchor()).toEqual({ key: 'b-1', offset: -12, axis: 'vertical' });

  list.focusItem('b-3');
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta 3');
  list.groups = [second, first];
  await list.updateComplete;
  expect(list.getAnchor()).toEqual({ key: 'b-1', offset: -12, axis: 'vertical' });
  expect(list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta 3');

  list.groups = [{ ...second, items: second.items.filter(item => item.value !== 'b-3') }, first];
  await list.updateComplete;
  expect(list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta 4');
  expect(list.getAnchor()).toEqual({ key: 'b-1', offset: -12, axis: 'vertical' });
});

test('Quick Jump reopens from a group heading, moves to the chosen group and restores the anchor on Escape', async () => {
  const list = mount(`<metro-long-list-selector label="Authors" jump-label="Jump to group">
    <metro-list-group value="a" label="Alpha">
      ${Array.from({ length: 7 }, (_, index) => `<metro-list-item value="a-${index}">Alpha ${index}</metro-list-item>`).join('')}
    </metro-list-group>
    <metro-list-group value="b" label="Beta">
      ${Array.from({ length: 7 }, (_, index) => `<metro-list-item value="b-${index}">Beta ${index}</metro-list-item>`).join('')}
    </metro-list-group>
    <metro-list-group value="empty" label="Empty group"></metro-list-group>
  </metro-long-list-selector>`);
  const changes = vi.fn();
  list.addEventListener('metro-group-jump', event => changes(event.detail));
  const viewport = page.getByRole('grid', { name: 'Authors' });
  const dialog = page.getByRole('dialog', { name: 'Jump to group' });
  await viewport.getByRole('button', { name: 'Alpha' }).click();
  await expect.element(dialog).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Empty group' })).toBeDisabled();
  const beta = Array.from(list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="jump-tile"]'))
    .find(button => button.textContent?.trim() === 'Beta')!;
  await userEvent.click(beta);
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta 0');
  expect(list.getAnchor()).toEqual({ key: 'b', offset: 0, axis: 'vertical', group: true });
  expect(changes).toHaveBeenCalledExactlyOnceWith({ value: 'b', itemValue: 'b-0' });

  await viewport.getByRole('button', { name: 'Beta' }).click();
  await expect.element(dialog).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta');
  expect(list.getAnchor()).toEqual({ key: 'b', offset: 0, axis: 'vertical', group: true });
  expect(changes).toHaveBeenCalledTimes(1);
});

test('native group checkbox exposes mixed state and selects members outside the virtual window', async () => {
  const list = mount('<metro-long-list-selector label="Offline" selection-mode="multiple" group-selection></metro-long-list-selector>');
  const group = createGroup('a', 'Alpha', 30);
  list.groups = [{ ...group, items: group.items.map((item, index) => ({ ...item, disabled: index === 12 })) }];
  list.selectedValues = ['a-0'];
  const check = page.getByRole('checkbox', { name: 'Alpha' });
  await expect.element(check).toBeVisible();
  expect((check.element() as HTMLInputElement).indeterminate).toBe(true);
  const changes = vi.fn();
  list.addEventListener('metro-selection-change', event => changes(event.detail));

  await check.click();
  await expect.element(check).toBeChecked();
  expect(list.selectedValues).toHaveLength(29);
  expect(list.selectedValues).toContain('a-29');
  expect(list.selectedValues).not.toContain('a-12');
  await userEvent.keyboard(' ');
  await expect.element(check).not.toBeChecked();
  expect(list.selectedValues).toEqual([]);
  expect(changes).toHaveBeenCalledTimes(2);
});

test('header and footer scroll with the list while anchors, group jumps and the virtual window use row offsets', async () => {
  const list = mount(`<metro-long-list-selector label="Authors">
    <div slot="header" style="block-size: 240px"><button type="button">Filter authors</button></div>
    <div slot="footer" style="block-size: 220px"><button type="button">Load more authors</button></div>
  </metro-long-list-selector>`);
  list.groups = [createGroup('a', 'Alpha', 8), createGroup('b', 'Beta', 8)];
  const grid = page.getByRole('grid', { name: 'Authors' });
  await expect.element(grid).toHaveAttribute('aria-rowcount', '18');
  const viewport = list.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
  const header = list.querySelector<HTMLElement>('[slot="header"]')!;
  const footer = list.querySelector<HTMLElement>('[slot="footer"]')!;
  const bounds = () => viewport.getBoundingClientRect();
  expect(header.getBoundingClientRect().top).toBe(bounds().top);
  expect(list.getAnchor()).toBeNull();
  expect(grid.query()?.contains(footer)).toBe(false);

  expect(list.jumpToGroup('b')).toBe(true);
  await expect.poll(() => viewport.scrollTop).toBe(240 + 78 + 8 * 56);
  expect(list.getAnchor()).toEqual({ key: 'b', offset: 0, axis: 'vertical', group: true });
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Beta 0');

  const anchor = { key: 'b-2', offset: -12, axis: 'vertical' } as const;
  expect(list.restoreAnchor(anchor)).toBe(true);
  await expect.poll(() => list.getAnchor()).toEqual(anchor);
  const before = viewport.scrollTop;
  list.style.transform = 'scale(.8)';
  list.style.transformOrigin = 'top left';
  header.style.blockSize = '310px';
  await expect.poll(() => viewport.scrollTop).toBe(before + 70);
  expect(list.getAnchor()).toEqual(anchor);
  list.style.transform = '';

  expect(list.restoreAnchor({ ...anchor, key: 'b-7', offset: 0 })).toBe(true);
  await expect.poll(() => list.getAnchor()).toEqual({ ...anchor, key: 'b-7', offset: 0 });
  expect(footer.getBoundingClientRect().top).toBeLessThan(bounds().bottom);
  viewport.scrollTop = viewport.scrollHeight;
  await expect.poll(() => footer.getBoundingClientRect().bottom).toBe(bounds().bottom);
  expect(list.getAnchor()).toBeNull();
  expect(list.shadowRoot!.querySelectorAll('[part="row"]').length).toBeLessThan(16);
});

test('header and footer controls keep ordinary roles and focus while an empty list gains or loses records', async () => {
  const list = mount(`<metro-long-list-selector label="Authors">
    <button slot="header" type="button">Filter authors</button>
    <p slot="empty">No authors found.</p>
    <button slot="footer" type="button">Load more authors</button>
  </metro-long-list-selector>`);
  const grid = page.getByRole('grid', { name: 'Authors' });
  const footer = page.getByRole('button', { name: 'Load more authors' });
  await expect.element(grid).toHaveAttribute('aria-rowcount', '0');
  await expect.element(page.getByRole('button', { name: 'Filter authors' })).toBeVisible();
  await expect.element(page.getByText('No authors found.')).toBeVisible();
  const button = (await footer.findElement()) as HTMLButtonElement;
  button.focus();
  list.groups = [createGroup('a', 'Alpha', 3)];
  await expect.element(grid).toHaveAttribute('aria-rowcount', '4');
  expect(document.activeElement).toBe(button);
  await expect.element(page.getByText('No authors found.')).not.toBeVisible();

  expect(list.focusItem('a-0')).toBe(true);
  await expect.poll(() => list.shadowRoot?.activeElement?.textContent?.trim()).toBe('Alpha 0');
  list.groups = [];
  await expect.element(grid).toHaveAttribute('aria-rowcount', '0');
  expect(list.shadowRoot?.activeElement).toBe(grid.element());
  await expect.element(page.getByText('No authors found.')).toBeVisible();
  await expect.element(footer).toBeVisible();
});
