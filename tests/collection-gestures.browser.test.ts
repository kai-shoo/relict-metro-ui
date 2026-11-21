import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/swipe-control.js';
import '../src/refresh-container.js';

interface TouchState {
  selected: string;
  open: string;
  actions: { value: string; id: string; side: string }[];
  refreshes: string[];
  hash: string;
  scrolling: number;
  nested: number;
  busy: boolean;
  pulling: boolean;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    collectionTouch(control: 'swipe'): Promise<
      Record<'opened' | 'canceled' | 'archived' | 'executed' | 'replacedCommands' | 'changedMode' | 'replaced' | 'tapped', TouchState>
      & { readyBeforeReplacement: boolean; draggingAfterReplacement: boolean }
    >;
    collectionTouch(control: 'refresh'): Promise<Record<string, TouchState>>;
    collectionReducedMotion(): Promise<{ matched: boolean; durations: number[] }>;
  }
}

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => fixture?.remove());

test('SwipeControl gives both sides a keyboard path and dispatches the action for the current key', async () => {
  const root = mount('<metro-swipe-control value="message-1"><a href="#detail">Message</a></metro-swipe-control>');
  const swipe = root.querySelector('metro-swipe-control')!;
  swipe.actions = [{ id: 'mark', label: 'Flag', side: 'start' }, { id: 'clear', label: 'Archive' }];
  const action = vi.fn();
  swipe.addEventListener('metro-swipe-action', event => action(event.detail));
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.click();
  await expect.element(page.getByRole('menuitem', { name: 'Flag' })).toBeVisible();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(action).toHaveBeenCalledExactlyOnceWith({ id: 'clear', side: 'end', value: 'message-1' });
  await expect.poll(() => swipe.shadowRoot?.activeElement).toBe(trigger.element());

  swipe.busy = true;
  await expect.element(trigger).toBeDisabled();
  expect(swipe.showActions('start')).toBe(false);
  swipe.busy = false;
  expect(swipe.showActions('start')).toBe(true);
  const flag = page.getByRole('button', { name: 'Flag' });
  await expect.element(flag).toBeVisible();
  (flag.element() as HTMLElement).focus();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => swipe.openSide).toBe('');
  await expect.poll(() => swipe.shadowRoot?.activeElement).toBe(trigger.element());

  expect(swipe.showActions('end')).toBe(true);
  swipe.value = 'replacement';
  await swipe.updateComplete;
  expect(swipe.openSide).toBe('');
  expect(action).toHaveBeenCalledTimes(1);
});

test('SwipeControl keeps keyboard focus usable as revealed actions become unavailable', async () => {
  const root = mount(`<metro-swipe-control><a href="#entry">Open message</a></metro-swipe-control>
    <button type="button">Elsewhere</button>`);
  const swipe = root.querySelector('metro-swipe-control')!;
  const archive = { id: 'archive', label: 'Archive' };
  const flag = { id: 'flag', label: 'Flag' };
  swipe.actions = [archive, flag];
  swipe.showActions('end');
  const archiving = page.getByRole('button', { name: 'Archive' });
  await expect.element(archiving).toBeVisible();
  (archiving.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  const action = vi.fn();
  swipe.addEventListener('metro-swipe-action', action);

  swipe.actions = [{ ...archive, disabled: true }, flag];
  await swipe.updateComplete;
  expect(swipe.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Flag' }).element());
  expect(swipe.openSide).toBe('end');

  swipe.actions = [{ ...flag, side: 'start' }];
  await swipe.updateComplete;
  expect(swipe.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Actions' }).element());
  expect(swipe.openSide).toBe('');

  swipe.busy = true;
  await swipe.updateComplete;
  const viewport = swipe.shadowRoot!.querySelector('[part="viewport"]')!;
  expect(swipe.shadowRoot?.activeElement).toBe(viewport);
  expect(getComputedStyle(viewport, '::after').borderTopWidth).toBe('2px');
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('link', { name: 'Open message' })).toHaveFocus();

  const elsewhere = page.getByRole('button', { name: 'Elsewhere' });
  (elsewhere.element() as HTMLElement).focus();
  swipe.busy = false;
  swipe.actions = [archive];
  await swipe.updateComplete;
  await expect.element(elsewhere).toHaveFocus();
  expect(action).not.toHaveBeenCalled();
});

test('SwipeControl closes its menu on a record change or when no command can run', async () => {
  const root = mount(`<metro-swipe-control value="message-1" actions-label="Команды письма">
    <a href="#entry">Open message</a></metro-swipe-control>`);
  const swipe = root.querySelector('metro-swipe-control')!;
  const archive = { id: 'archive', label: 'Archive' };
  const flag = { id: 'flag', label: 'Flag' };
  swipe.actions = [archive, flag];
  const action = vi.fn();
  swipe.addEventListener('metro-swipe-action', action);
  const trigger = page.getByRole('button', { name: 'Команды письма' });
  const menu = page.getByRole('menu');
  const viewport = () => swipe.shadowRoot?.querySelector('[part="viewport"]');

  await trigger.click();
  await expect.element(menu).toBeVisible();
  swipe.actions = [{ ...archive, disabled: true }, flag];
  const flagItem = page.getByRole('menuitem', { name: 'Flag' });
  await expect.poll(() => (flagItem.element().getRootNode() as ShadowRoot).activeElement).toBe(flagItem.element());

  swipe.busy = true;
  await expect.element(menu).not.toBeInTheDocument();
  expect(swipe.shadowRoot?.activeElement).toBe(viewport());
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('link', { name: 'Open message' })).toHaveFocus();

  swipe.busy = false;
  await trigger.click();
  await expect.element(menu).toHaveAccessibleName('Команды письма');
  swipe.value = 'message-2';
  await expect.element(menu).not.toBeInTheDocument();
  expect(swipe.shadowRoot?.activeElement).toBe(trigger.element());

  await trigger.click();
  await expect.element(menu).toBeVisible();
  swipe.actions = [];
  await expect.element(menu).not.toBeInTheDocument();
  expect(swipe.shadowRoot?.activeElement).toBe(viewport());
  expect(action).not.toHaveBeenCalled();
});

test.each(['ltr', 'rtl'])('SwipeControl centers row text and fits a localized trigger at double text in %s', async direction => {
  const root = mount(`<metro-swipe-control dir="${direction}" actions-label="Действия"
    style="width: 320px; font-size: 2em">Маршрут</metro-swipe-control>`);
  const swipe = root.querySelector('metro-swipe-control')!;
  swipe.actions = [{ id: 'flag', label: 'Отметить' }];
  await swipe.updateComplete;
  const trigger = swipe.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!;
  const textRect = (element: Node) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
  };
  const centerY = (rect: DOMRect) => (rect.top + rect.bottom) / 2;
  expect(Math.abs(centerY(textRect(swipe)) - centerY(textRect(trigger)))).toBeLessThanOrEqual(1);

  swipe.actionsLabel = 'Дополнительные действия с записью';
  await swipe.updateComplete;
  const body = swipe.shadowRoot!.querySelector<HTMLElement>('.body')!;
  expect(body.clientWidth).toBeGreaterThanOrEqual(160);
  expect(trigger.scrollWidth).toBeLessThanOrEqual(trigger.clientWidth + 1);
  expect(textRect(trigger).bottom).toBeLessThanOrEqual(trigger.getBoundingClientRect().bottom);
  expect(trigger.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
});

test('RefreshContainer shows the start of a saved row that shrinks during refresh', async () => {
  const root = mount(`<metro-refresh-container style="--metro-refresh-height:100px;overflow-anchor:none">
    <div data-metro-key="first" style="height:100px">First</div>
    <div data-metro-key="target" style="height:100px">Target</div>
    <div data-metro-key="last" style="height:200px">Last</div>
  </metro-refresh-container>`);
  const refresh = root.querySelector('metro-refresh-container')!;
  await refresh.updateComplete;
  refresh.scrollViewport!.scrollTop = 145;
  expect(refresh.getAnchor()).toEqual({ key: 'target', offset: -45, axis: 'vertical' });
  refresh.addEventListener('metro-refresh', () => { refresh.refreshing = true; });
  expect(refresh.requestRefresh()).toBe(true);
  await refresh.updateComplete;
  refresh.querySelector<HTMLElement>('[data-metro-key="target"]')!.style.height = '24px';
  refresh.refreshing = false;
  await refresh.updateComplete;
  expect(refresh.getAnchor()).toEqual({ key: 'target', offset: 0, axis: 'vertical' });
});

test('RefreshContainer waits for application completion, preserves position and restores keyed focus', async () => {
  const root = mount(`<metro-refresh-container label="Messages" style="--metro-refresh-height: 100px">
    <div data-metro-key="one" style="height:100px">One</div>
    <div data-metro-key="two" style="height:100px"><button type="button" data-metro-focus="two">Old row</button></div>
    <div data-metro-key="three" style="height:100px">Three</div>
  </metro-refresh-container>`);
  const refresh = root.querySelector('metro-refresh-container')!;
  const requests = vi.fn();
  refresh.addEventListener('metro-refresh', event => {
    requests(event.detail.source);
    refresh.refreshing = true;
  });
  const trigger = page.getByRole('button', { name: 'Refresh' });
  const item = page.getByRole('button', { name: 'Old row' });
  await expect.element(item).toBeVisible();
  (item.element() as HTMLElement).focus({ preventScroll: true });
  refresh.scrollViewport!.scrollTop = 110;
  const anchor = refresh.getAnchor();
  expect(anchor).toEqual({ key: 'two', offset: -10, axis: 'vertical' });
  expect(refresh.requestRefresh()).toBe(true);
  expect(refresh.requestRefresh()).toBe(false);
  await expect.element(trigger).toBeDisabled();
  await expect.element(item).toBeEnabled();
  expect(requests).toHaveBeenCalledExactlyOnceWith('programmatic');

  refresh.insertAdjacentHTML('afterbegin', '<div data-metro-key="new" style="height:60px">New</div>');
  item.element().outerHTML = '<button type="button" data-metro-focus="two">Updated row</button>';
  refresh.refreshing = false;
  refresh.status = 'Updated';
  await expect.element(page.getByRole('status')).toHaveTextContent('Updated');
  expect(refresh.getAnchor()).toEqual(anchor);
  expect(document.activeElement?.textContent).toBe('Updated row');

  await trigger.click();
  await expect.element(page.getByRole('progressbar', { name: 'Refreshing' })).toBeVisible();
  refresh.status = 'Try again';
  refresh.refreshing = false;
  await expect.element(page.getByRole('status')).toHaveTextContent('Try again');
  await expect.element(page.getByRole('button', { name: 'Updated row' })).toBeEnabled();
  expect(requests.mock.calls).toEqual([['programmatic'], ['button']]);
});

test('direct gestures remove settle motion when system motion is reduced', async () => {
  expect(await commands.collectionReducedMotion()).toEqual({ matched: true, durations: [0, 0] });
});

test('RefreshContainer returns to an available row or the list after a refresh replaces focused data', async () => {
  const root = mount(`<metro-refresh-container label="Messages" style="--metro-refresh-height: 100px">
    <div data-metro-key="message" style="height: 140px">
      <button type="button" data-metro-focus="message">Message</button>
    </div>
    <div data-metro-key="next" style="height: 140px">Next message</div>
  </metro-refresh-container><button type="button">Elsewhere</button>`);
  const refresh = root.querySelector('metro-refresh-container')!;
  const original = refresh.querySelector('button')!;
  const outside = root.querySelector<HTMLButtonElement>(':scope > button')!;
  await refresh.updateComplete;
  const viewport = refresh.scrollViewport!;
  viewport.scrollTop = 10;
  original.focus({ preventScroll: true });
  refresh.refreshing = true;
  await refresh.updateComplete;

  original.disabled = true;
  const replacement = original.cloneNode(true) as HTMLButtonElement;
  replacement.textContent = 'Updated message';
  replacement.disabled = false;
  original.after(replacement);
  refresh.refreshing = false;
  await refresh.updateComplete;
  expect(document.activeElement).toBe(replacement);
  expect(refresh.getAnchor()).toEqual({ key: 'message', offset: -10, axis: 'vertical' });

  refresh.refreshing = true;
  await refresh.updateComplete;
  replacement.closest('[data-metro-key]')!.remove();
  refresh.refreshing = false;
  await refresh.updateComplete;
  expect(refresh.shadowRoot?.activeElement).toBe(viewport);

  const remainingRow = refresh.querySelector('[data-metro-key="next"]')!;
  remainingRow.innerHTML = '<button type="button">Next message</button>';
  remainingRow.querySelector('button')!.focus({ preventScroll: true });
  refresh.refreshing = true;
  await refresh.updateComplete;
  outside.focus();
  remainingRow.remove();
  refresh.refreshing = false;
  await refresh.updateComplete;
  expect(document.activeElement).toBe(outside);
});

test.skipIf(server.browser !== 'chromium')('emulated touch assigns horizontal ownership to the row and rolls back a canceled or stale gesture', async () => {
  const { opened, canceled, archived, executed, replacedCommands, changedMode, replaced,
    readyBeforeReplacement, draggingAfterReplacement, tapped } = await commands.collectionTouch('swipe');
  expect(opened).toMatchObject({ selected: 'one', open: 'end', actions: [], hash: '' });
  expect(canceled).toMatchObject({ selected: 'one', open: 'end', actions: [], hash: '' });
  expect(archived).toMatchObject({ open: '', actions: [{ value: 'record', id: 'archive', side: 'end' }] });
  expect(executed).toMatchObject({ selected: 'one', open: '', hash: '' });
  expect(executed.actions).toEqual([archived.actions[0], archived.actions[0]]);
  expect(readyBeforeReplacement).toBe(true);
  expect(draggingAfterReplacement).toBe(false);
  expect(replacedCommands).toMatchObject({ selected: 'one', open: '', hash: '', actions: executed.actions });
  expect(changedMode).toMatchObject({ selected: 'one', open: '', hash: '', actions: executed.actions });
  expect(replaced.actions).toEqual(executed.actions);
  expect(tapped.hash).toBe('#opened');
});

test.skipIf(server.browser !== 'chromium')('emulated touch keeps ordinary and nested vertical scrolling native and refreshes at the top on release', async () => {
  const { scrolled, mid, canceled, refreshed, busy, nested } = await commands.collectionTouch('refresh');
  expect(scrolled.scrolling).toBeGreaterThan(40);
  expect(scrolled).toMatchObject({ selected: 'one', open: '', refreshes: [], hash: '' });
  expect(mid.refreshes).toEqual([]);
  expect(canceled).toMatchObject({ scrolling: 0, pulling: false, refreshes: [] });
  expect(refreshed).toMatchObject({ selected: 'one', busy: true, pulling: false, refreshes: ['pull'] });
  expect(busy.refreshes).toEqual(['pull']);
  expect(nested.nested).toBeGreaterThan(20);
  expect(nested).toMatchObject({ scrolling: 0, refreshes: ['pull'], selected: 'one' });
});
