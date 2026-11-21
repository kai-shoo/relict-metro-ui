import { beforeEach, expect, test, vi } from 'vitest';
import { commands, page, server } from 'vitest/browser';
import '../src/notification-center.js';
import '../src/status-bar.js';
import '../src/toast.js';
import type { MetroNotification } from '../src/toast.js';

beforeEach(() => { document.body.replaceChildren(); });

const notice: MetroNotification = {
  id: 'record-12', title: 'Field recording', message: 'Your recording is ready.', destination: { id: 12 }, icon: 'play',
};

test('Toast pauses expiration while focused and does not consume or remove an app-owned history entry', async () => {
  const anchor = document.createElement('button');
  anchor.textContent = 'Show alert';
  const toast = document.createElement('metro-toast');
  toast.duration = 90;
  const center = document.createElement('metro-notification-center');
  center.notifications = [notice];
  document.body.append(anchor, toast, center);
  const dismissed = vi.fn();
  toast.addEventListener('metro-notification-dismiss', dismissed);
  await page.getByRole('button', { name: 'Show alert' }).hover();
  toast.show(notice, anchor);
  await toast.updateComplete;
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  (dismiss.element() as HTMLElement).focus();
  await new Promise(resolve => setTimeout(resolve, 160));
  expect(dismissed).not.toHaveBeenCalled();
  await expect.element(dismiss).toBeVisible();
  anchor.focus();
  await expect.poll(() => toast.notification).toBeNull();
  expect(dismissed.mock.calls[0][0].detail).toMatchObject({ id: 'record-12', surface: 'toast', reason: 'timeout' });
  await expect.element(page.getByRole('button', { name: 'Open Field recording' })).toBeVisible();
  expect(center.notifications[0]).toBe(notice);
});

test('both notification surfaces pass the same destination, and the journal restores focus on dismissal', async () => {
  const toast = document.createElement('metro-toast');
  const center = document.createElement('metro-notification-center');
  const next = { id: 'record-13', title: 'Second recording' };
  center.notifications = [notice, next];
  toast.duration = 0;
  document.body.append(toast, center);
  const targets: unknown[] = [];
  toast.addEventListener('metro-notification-activate', event => targets.push(event.detail.notification.destination));
  center.addEventListener('metro-notification-activate', event => targets.push(event.detail.notification.destination));
  center.addEventListener('metro-notification-dismiss', event => {
    center.notifications = center.notifications.filter(item => item.id !== event.detail.id);
  });
  toast.show(notice);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('button', { name: 'Open Field recording' }).click();
  expect(targets).toEqual([notice.destination, notice.destination]);
  await page.getByRole('button', { name: 'Dismiss Field recording' }).click();
  const remaining = page.getByRole('button', { name: 'Dismiss Second recording' });
  await expect.poll(() => center.shadowRoot?.activeElement).toBe(remaining.element());
  expect(center.notifications).toEqual([next]);
  center.addEventListener('metro-notifications-clear', () => { center.notifications = []; });
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect.element(page.getByText('No notifications')).toBeVisible();
  expect(center.shadowRoot?.activeElement).toBe(page.getByRole('heading', { name: 'Notifications' }).element());
});

test('replacing a toast directly discards the previous notification focus target', async () => {
  const source = document.createElement('button');
  source.textContent = 'Open original';
  const toast = document.createElement('metro-toast');
  toast.duration = 0;
  document.body.append(source, toast);
  toast.show(notice, source);
  await expect.element(page.getByText(notice.title)).toBeVisible();
  const replacement = { id: 'new', title: 'New notification' };
  toast.notification = replacement;
  await expect.element(page.getByText(replacement.title)).toBeVisible();
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  (dismiss.element() as HTMLElement).focus();
  expect(toast.dismiss()).toBe(true);
  await toast.updateComplete;
  expect(document.activeElement).not.toBe(source);

  toast.show(replacement, source);
  await expect.element(dismiss).toBeVisible();
  (dismiss.element() as HTMLElement).focus();
  expect(toast.dismiss()).toBe(true);
  expect(document.activeElement).toBe(source);
});

test.each([
  { kind: 'link', href: '/recordings/next', role: 'link', label: 'Open' },
  { kind: 'status', role: 'button', label: 'Dismiss notification' },
] as const)('Toast keeps keyboard focus and pauses a replacement with a $kind', async replacement => {
  const originalSource = document.createElement('button');
  const nextSource = document.createElement('button');
  originalSource.textContent = 'Original source';
  nextSource.textContent = 'Next source';
  const toast = document.createElement('metro-toast');
  toast.duration = 0;
  document.body.append(originalSource, nextSource, toast);
  const dismissed = vi.fn();
  toast.addEventListener('metro-notification-dismiss', dismissed);
  toast.show(notice, originalSource);
  const open = page.getByRole('button', { name: 'Open', exact: true });
  await expect.element(open).toBeVisible();
  (open.element() as HTMLElement).focus();

  const next = { id: 'next', title: 'Next notice', ...('href' in replacement ? { href: replacement.href } : {}) };
  toast.duration = 90;
  toast.show(next, nextSource);
  const target = page.getByRole(replacement.role, { name: replacement.label, exact: true });
  await expect.element(target).toBeVisible();
  expect(toast.shadowRoot?.activeElement).toBe(target.element());
  await new Promise(resolve => setTimeout(resolve, 160));
  expect(toast.notification).toBe(next);
  expect(dismissed).not.toHaveBeenCalled();

  expect(toast.dismiss()).toBe(true);
  expect(document.activeElement).toBe(nextSource);
  expect(dismissed).toHaveBeenCalledTimes(1);
  expect(dismissed.mock.calls[0][0].detail).toMatchObject({ id: next.id, reason: 'dismiss' });
});

test.each(['ltr', 'rtl'])('Toast leaves room for its title and link at double text size in %s', async direction => {
  const toast = document.createElement('metro-toast');
  toast.dir = direction;
  toast.style.inlineSize = '320px';
  toast.openLabel = 'Открыть запись';
  toast.duration = 0;
  document.body.append(toast);
  const root = document.documentElement;
  const previousFontSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    toast.show({
      id: 'sync', title: 'Синхронизация', source: 'Архив', icon: 'play',
      message: 'Проверьте подключение к сети.', href: '#sync',
    });
    const link = page.getByRole('link', { name: toast.openLabel });
    await expect.element(link).toBeVisible();
    const surface = toast.shadowRoot!.querySelector('[part="surface"]')!;
    const title = surface.querySelector('[part="title"]')!;
    const range = document.createRange();
    range.selectNodeContents(title);
    expect(range.getClientRects()).toHaveLength(1);
    const dismiss = page.getByRole('button', { name: toast.dismissLabel }).element();
    const bounds = surface.getBoundingClientRect();
    const action = link.element().getBoundingClientRect();
    const close = dismiss.getBoundingClientRect();
    expect(action.left).toBeGreaterThan(bounds.left);
    expect(action.right).toBeLessThan(bounds.right);
    expect(close.top).toBeGreaterThanOrEqual(action.bottom);
    expect(direction === 'rtl' ? close.left - bounds.left : bounds.right - close.right).toBeLessThan(20);
    expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
  } finally {
    root.style.fontSize = previousFontSize;
  }
});

test('notification reorder keeps the focused action associated with its key', async () => {
  const first = { id: 'a', title: 'Alpha' };
  const second = { id: 'b', title: 'Beta' };
  const third = { id: 'c', title: 'Gamma', href: '/recordings/gamma' };
  const center = document.createElement('metro-notification-center');
  center.notifications = [first, second, third];
  document.body.append(center);

  const open = page.getByRole('link', { name: 'Open Gamma' });
  await expect.element(open).toBeVisible();
  (open.element() as HTMLElement).focus();
  center.notifications = [third, first, second];
  await center.updateComplete;
  expect(center.shadowRoot?.activeElement).toBe(open.element());
  expect(center.shadowRoot?.querySelector('li')?.dataset.key).toBe('c');

  const dismiss = page.getByRole('button', { name: 'Dismiss Gamma' });
  (dismiss.element() as HTMLElement).focus();
  center.notifications = [first, second, third];
  await center.updateComplete;
  expect(center.shadowRoot?.activeElement).toBe(dismiss.element());
});

test('notification reorder keeps the focused action visible in a scrollable journal', async () => {
  const scroller = document.createElement('div');
  scroller.style.cssText = 'height:250px;overflow:auto;overflow-anchor:none';
  const center = document.createElement('metro-notification-center');
  const current = { id: 'current', title: 'Current recording', href: '#current' };
  const others = Array.from({ length: 12 }, (_, index) => ({
    id: `item-${index}`, title: `Recording ${index + 1}`, message: 'Archived recording from the field.',
  }));
  scroller.append(center);
  document.body.append(scroller);
  center.notifications = [current, ...others];
  const link = page.getByRole('link', { name: 'Open Current recording' });
  await expect.element(link).toBeVisible();
  const action = link.element() as HTMLElement;
  action.focus();
  const visible = () => {
    const view = scroller.getBoundingClientRect();
    const box = action.getBoundingClientRect();
    return box.top >= view.top && box.bottom <= view.bottom;
  };
  expect(visible()).toBe(true);

  center.notifications = [...others, current];
  await center.updateComplete;
  expect(center.shadowRoot?.activeElement).toBe(action);
  expect(visible()).toBe(true);
  expect(scroller.scrollTop).toBeGreaterThan(0);
  expect(window.scrollY).toBe(0);
});

test.each(['ltr', 'rtl'])('notification rows keep their title readable with double text size in %s', async direction => {
  const center = document.createElement('metro-notification-center');
  center.dir = direction;
  center.style.inlineSize = '320px';
  center.heading = 'Уведомления';
  center.openLabel = 'Открыть запись';
  center.clearLabel = 'Очистить все уведомления';
  center.dismissLabel = 'Скрыть';
  document.body.append(center);
  const root = document.documentElement;
  const previousSize = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    center.notifications = [{
      id: 'recording', title: 'Синхронизация', message: 'Проверьте подключение к сети.',
      href: '#recording', icon: 'play',
    }];
    const link = page.getByRole('link', { name: 'Открыть запись Синхронизация' });
    await expect.element(link).toBeVisible();
    const item = center.shadowRoot!.querySelector('[part="item"]')!;
    const title = item.querySelector('[part="title"]')!;
    const range = document.createRange();
    range.selectNodeContents(title);
    expect(range.getClientRects()).toHaveLength(1);
    range.selectNodeContents(page.getByRole('heading', { name: 'Уведомления' }).element());
    expect(range.getClientRects()).toHaveLength(1);
    const close = page.getByRole('button', { name: 'Скрыть Синхронизация' }).element().getBoundingClientRect();
    const action = link.element().getBoundingClientRect();
    const bounds = item.getBoundingClientRect();
    expect(close.top).toBeGreaterThanOrEqual(action.bottom);
    expect(direction === 'rtl' ? close.left - bounds.left : bounds.right - close.right).toBeLessThan(20);
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
  } finally {
    root.style.fontSize = previousSize;
  }
});

test('the status bar uses supplied signals and shows progress separately from the battery', async () => {
  const status = document.createElement('metro-status-bar');
  status.time = '18:24';
  status.signal = 3;
  status.battery = 64;
  status.charging = true;
  status.busy = true;
  document.body.append(status);
  await expect.element(page.getByRole('img', { name: 'Signal: 3/4' })).toBeVisible();
  await expect.element(page.getByRole('img', { name: 'Battery: 64%, Charging' })).toBeVisible();
  const progress = page.getByRole('progressbar', { name: 'Background activity' });
  await expect.element(progress).not.toHaveAttribute('aria-valuenow');
  status.progress = 25;
  await expect.element(progress).toHaveAttribute('aria-valuenow', '25');
  status.signal = null;
  await expect.element(page.getByRole('img', { name: 'Signal: 3/4' })).not.toBeInTheDocument();
  await expect.element(page.getByText('18:24')).toBeVisible();
});

test.each(['ltr', 'rtl'])('the status bar fits localized status content at double text size in %s', async direction => {
  const status = document.createElement('metro-status-bar');
  status.dir = direction;
  status.style.inlineSize = '320px';
  status.label = 'Состояние устройства';
  status.time = 'Понедельник, 21 сентября, 23:59';
  status.dateTime = '2026-09-21T23:59:00';
  status.signal = 3;
  status.networkLabel = 'Сигнал';
  status.battery = 12;
  status.batteryLabel = 'Батарея';
  status.charging = true;
  status.chargingLabel = 'заряжается';
  status.progress = 0;
  status.progressLabel = 'Синхронизация';
  status.innerHTML = `<span slot="start">СинхронизацияПолевойСтанции</span>
    <span slot="end">В сети</span>`;
  const root = document.documentElement;
  const previousSize = root.style.fontSize;
  root.style.fontSize = '200%';
  document.body.append(status);
  try {
    await expect.element(page.getByRole('group', { name: status.label })).toBeVisible();
    const row = status.shadowRoot!.querySelector('[part="status"]')!;
    const time = status.shadowRoot!.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe(status.dateTime);
    expect(time.textContent).toBe(status.time);
    const bounds = row.getBoundingClientRect();
    for (const item of [time, ...status.children]) {
      const box = item.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    }
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    const timeBox = time.getBoundingClientRect();
    expect(direction === 'rtl' ? timeBox.left - bounds.left : bounds.right - timeBox.right).toBeLessThan(24);
    const range = document.createRange();
    range.selectNodeContents(time.querySelector('bdi') ?? time);
    for (const line of range.getClientRects()) {
      const trailingGap = direction === 'rtl' ? line.left - timeBox.left : timeBox.right - line.right;
      expect(trailingGap).toBeLessThan(1);
    }
    await expect.element(page.getByRole('img', { name: 'Сигнал: 3/4' })).toBeVisible();
    await expect.element(page.getByRole('img', { name: 'Батарея: 12%, заряжается' })).toBeVisible();
    const progress = page.getByRole('progressbar', { name: 'Синхронизация' });
    await expect.element(progress).toHaveAttribute('aria-valuenow', '0');
  } finally {
    root.style.fontSize = previousSize;
  }
});

test.skipIf(server.browser !== 'chromium')('the status bar keeps the signal and battery fills visible in forced colors', async () => {
  const status = document.createElement('metro-status-bar');
  status.signal = 2;
  status.battery = 50;
  document.body.append(status);
  try {
    await commands.setMetroMedia({ colorScheme: 'dark', forcedColors: 'active' });
    expect(window.matchMedia('(forced-colors: active)').matches).toBe(true);
    await expect.element(page.getByRole('img', { name: 'Signal: 2/4' })).toBeVisible();
    const root = status.shadowRoot!;
    const available = root.querySelector('.bar[data-available]')!;
    const inactive = root.querySelector('.bar:not([data-available])')!;
    const cell = root.querySelector('.cell')!;
    const canvas = getComputedStyle(status).backgroundColor;
    const availableColor = getComputedStyle(available).backgroundColor;
    expect(availableColor).not.toBe(canvas);
    expect(getComputedStyle(inactive).backgroundColor).not.toBe(availableColor);
    expect(getComputedStyle(cell, '::after').backgroundColor).toBe(getComputedStyle(cell).borderTopColor);
  } finally {
    await commands.setMetroMedia({ colorScheme: null, forcedColors: null });
  }
});
