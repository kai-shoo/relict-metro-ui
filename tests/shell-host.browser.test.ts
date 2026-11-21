import { expect, test, vi } from 'vitest';
import {
  MetroActivationScope, MetroBrowserNotifications, MetroReminderScheduler,
  publishMetroAppBadge, publishMetroLockScreen, readMetroNotificationActivation,
} from '../src/shell-host.js';
import type { MetroActivationDestination, MetroScheduledReminder, MetroShellResult } from '../src/shell-host.js';
import '../src/frame.js';

const reminder = { id: 'meeting', scheduledAt: 1_800_000_000_000, title: 'Meeting',
  destination: { href: '/tasks', parameters: { task: '1' } } };

test('the web badge publishes the unread count and clears zero through the browser capability', async () => {
  const setAppBadge = vi.fn(async () => {});
  const clearAppBadge = vi.fn(async () => {});
  const badge = { setAppBadge, clearAppBadge };
  expect(await publishMetroAppBadge(3, badge)).toBe('applied');
  expect(setAppBadge).toHaveBeenCalledExactlyOnceWith(3);
  expect(await publishMetroAppBadge(0, badge)).toBe('applied');
  expect(clearAppBadge).toHaveBeenCalledOnce();
  expect(await publishMetroAppBadge(3, {})).toBe('unsupported');
  await expect(publishMetroAppBadge(-1, badge)).rejects.toThrow(RangeError);
  setAppBadge.mockRejectedValueOnce(new DOMException('No permission', 'NotAllowedError'));
  expect(await publishMetroAppBadge(3, badge)).toBe('declined');
});

test('host reminders replace and cancel by the same key in order', async () => {
  const queue = new Map<string, MetroScheduledReminder>();
  const order: number[] = [];
  let finishFirst: () => void = () => {};
  const waiting = new Promise<void>(resolve => { finishFirst = resolve; });
  const scheduler = new MetroReminderScheduler({ reminders: {
    async upsert(request) {
      order.push(request.scheduledAt);
      if (request.scheduledAt === reminder.scheduledAt) await waiting;
      queue.set(request.id, request);
      return 'applied';
    },
    cancel(id) { queue.delete(id); return 'applied'; },
  } });

  const initial = scheduler.schedule(reminder);
  const updated = { ...reminder, scheduledAt: reminder.scheduledAt + 3600000,
    destination: { href: '/tasks', parameters: { task: '2' } } };
  const rescheduled = scheduler.schedule(updated);
  updated.destination.parameters.task = 'changed after enqueue';
  await Promise.resolve();
  expect(order).toEqual([reminder.scheduledAt]);
  finishFirst();
  expect(await initial).toBe('applied');
  expect(await rescheduled).toBe('applied');
  expect(queue.size).toBe(1);
  expect(queue.get(reminder.id)).toMatchObject({
    scheduledAt: updated.scheduledAt, destination: { parameters: { task: '2' } },
  });
  expect(await scheduler.cancel(reminder.id)).toBe('applied');
  expect(queue.size).toBe(0);
});

test('unsupported or failed delivery is independent of later confirmed operations', async () => {
  const unsupported = new MetroReminderScheduler();
  expect(await unsupported.schedule(reminder)).toBe('unsupported');
  expect(await unsupported.cancel(reminder.id)).toBe('unsupported');
  await expect(unsupported.schedule({ ...reminder, scheduledAt: NaN })).rejects.toThrow(RangeError);
  const upsert = vi.fn<() => Promise<MetroShellResult>>()
    .mockRejectedValueOnce(new Error('Host unavailable'))
    .mockResolvedValueOnce('declined')
    .mockResolvedValueOnce('applied');
  const scheduler = new MetroReminderScheduler({ reminders: { upsert, cancel: () => 'applied' } });
  const failed = expect(scheduler.schedule(reminder)).rejects.toThrow('Host unavailable');
  expect(await scheduler.schedule(reminder)).toBe('declined');
  await failed;
  expect(await scheduler.schedule(reminder)).toBe('applied');

  const publish = vi.fn(() => 'applied' as const);
  const host = { lockScreen: { roles: ['badge'] as const, publish } };
  expect(await publishMetroLockScreen(host, { role: 'status', text: 'Message', version: 1 })).toBe('unsupported');
  expect(await publishMetroLockScreen(host, { role: 'badge', count: null, version: 2 })).toBe('applied');
  expect(publish).toHaveBeenCalledExactlyOnceWith({ role: 'badge', count: null, version: 2 });
});

test('link, notification and reminder resolve against current data without repeating a Frame visit', async () => {
  const fixture = document.createElement('section');
  fixture.innerHTML = `
    <metro-frame value="list">
      <metro-page value="list" label="Tasks"></metro-page>
      <metro-page value="task" label="Task details"></metro-page>
    </metro-frame>
  `;
  document.body.append(fixture);
  try {
    const frame = fixture.querySelector('metro-frame')!;
    await frame.updateComplete;
    const tasks = new Set(['one', 'two']);
    let current: string | null = null;
    const commit = vi.fn((destination: MetroActivationDestination) => {
      if (!frame.navigate(destination.route, { params: destination.params })) return false;
      current = destination.identity;
      return true;
    });
    const scope = new MetroActivationScope({
      resolve(entry) {
        if (!('destination' in entry)) return null;
        const id = entry.destination.parameters?.task;
        if (!id || !tasks.has(id)) return null;
        return { identity: id, route: 'task', params: { id } };
      },
      current: () => current,
      navigate: commit,
    });
    const destination = { href: '/tasks', parameters: { task: 'one' } };
    expect(await scope.activate({ kind: 'link', destination })).toBe('opened');
    expect(await scope.activate({ kind: 'notification', id: 'notice', destination })).toBe('current');
    expect(commit).toHaveBeenCalledOnce();
    expect(frame.visit?.params).toEqual({ id: 'one' });
    tasks.delete('one');
    expect(await scope.activate({ kind: 'reminder', id: 'meeting', destination })).toBe('unavailable');
    expect(frame.back()).toBe(true);
    expect(frame.value).toBe('list');
    expect(frame.canGoBack).toBe(false);
  } finally {
    fixture.remove();
  }
});

test('stale asynchronous launch cannot commit after another activation or local navigation', async () => {
  const readSignals: AbortSignal[] = [];
  const finish: ((destination: MetroActivationDestination) => void)[] = [];
  const commit = vi.fn(() => true);
  const scope = new MetroActivationScope({
    resolve(activation, signal) {
      readSignals.push(signal);
      if (activation.kind === 'launch') return new Promise(resolve => { finish.push(resolve); });
      return { identity: 'incoming', route: 'record' };
    },
    current: () => null,
    navigate: commit,
  });
  const warm = scope.activate({ kind: 'launch' });
  expect(await scope.activate({ kind: 'file', file: new File(['note'], 'note.txt') })).toBe('opened');
  expect(readSignals[0].aborted).toBe(true);
  finish[0]({ identity: 'restored', route: 'recent' });
  expect(await warm).toBe('superseded');

  const restore = scope.activate({ kind: 'launch' });
  scope.cancel();
  expect(readSignals[2].aborted).toBe(true);
  finish[1]({ identity: 'restored', route: 'recent' });
  expect(await restore).toBe('superseded');
  expect(commit).toHaveBeenCalledExactlyOnceWith(
    { identity: 'incoming', route: 'record' }, expect.objectContaining({ kind: 'file' }),
  );
});

test('browser notifications request permission explicitly and reject stale or foreign destinations', async () => {
  const scope = 'https://example.test/app/';
  const records = new Map<string, Notification>();
  const showNotification = vi.fn(async (_title: string, options?: NotificationOptions) => {
    const tag = options?.tag ?? '';
    const data = options?.data;
    records.set(tag, { tag, data, close: () => { records.delete(tag); } } as Notification);
  });
  const transport = {
    scope, showNotification,
    async getNotifications(filter?: GetNotificationOptions) {
      return [...records.values()].filter(entry => !filter?.tag || entry.tag === filter.tag);
    },
  };
  let permission: NotificationPermission = 'default';
  const requestPermission = vi.fn(async () => permission = 'granted');
  const host = new MetroBrowserNotifications(transport, { get permission() { return permission; }, requestPermission });
  const expiresAt = Date.now() + 60_000;
  const notice = { id: 'draft', title: 'Draft ready', expiresAt,
    destination: { href: 'notes?entry=draft', parameters: { note: 'draft' } } };
  expect(await host.publish(notice)).toBe('declined');
  expect(requestPermission).not.toHaveBeenCalled();
  expect(showNotification).not.toHaveBeenCalled();
  expect(await host.requestPermission()).toBe('granted');
  await expect(host.publish({ ...notice, destination: { href: '/other' } })).rejects.toThrow(RangeError);
  await expect(host.publish({ ...notice, destination: { href: 'https://other.test/app/' } })).rejects.toThrow(RangeError);
  expect(await host.publish(notice)).toBe('applied');
  expect(await host.publish({ ...notice, id: 'latest', expiresAt: expiresAt + 1000 })).toBe('applied');
  const pending = records.get('draft')!;
  expect(readMetroNotificationActivation(pending, scope, expiresAt - 1)).toEqual({
    kind: 'notification', id: 'draft', destination: {
      href: 'https://example.test/app/notes?entry=draft', parameters: { note: 'draft' },
    },
  });
  expect(readMetroNotificationActivation(pending, scope, expiresAt)).toBeNull();
  expect(readMetroNotificationActivation(pending, 'https://example.test/other/')).toBeNull();
  expect(await host.pruneExpired(expiresAt)).toBe(1);
  expect(await host.dismiss('latest')).toBe('applied');
  expect(records.size).toBe(0);
});
