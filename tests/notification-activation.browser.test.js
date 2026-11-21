import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

test('keeps the unread badge beside the title at 200% text and updates it after reading', async () => {
  expect(await commands.compactUnreadBadge()).toEqual({
    titleOneLine: true, badgeBesideTitle: true, decreased: true, focusReturned: true, hiddenAtZero: true,
  });
});

test.skipIf(server.browser !== 'chromium')('delivers through the service worker and reuses a ready page without duplicate history', async () => {
  const result = await commands.warmSystemNotification();
  expect(result.gated).toBe(true);
  expect(result.native.title).toBe('Equipment delivery');
  expect(result.native.options.data.href).toMatch(/\/examples\/notifications\/\?event=delivery$/);
  expect(result.dispatched).toMatchObject({ activations: 2, distinctTasks: 1, windowURLs: [], remaining: 0 });
  expect(result.repeated).toMatchObject({ activations: 1, windowURLs: [], remaining: 0 });
  expect(result).toMatchObject({
    oneEntry: true, stillOneEntry: true, windowReused: true, focused: true, anchorFocused: true, unread: true,
    badges: [2, 1, 0],
  });
});

test.skipIf(server.browser !== 'chromium')('passes the cold destination to openWindow and resolves the current model in a new page', async () => {
  const result = await commands.coldSystemNotification();
  expect(result.dispatched).toMatchObject({ activations: 1, remaining: 0 });
  expect(result.dispatched.windowURLs).toHaveLength(1);
  expect(new URL(result.dispatched.windowURLs[0]).search).toBe('?event=survey');
  expect(new URL(result.parent).search).toBe('');
  expect(result).toMatchObject({ description: true, message: true, removed: true });
});

test.skipIf(server.browser !== 'chromium')('ignores expired and unrelated payloads and prunes stale notifications on startup', async () => {
  const result = await commands.staleSystemNotification();
  for (const activation of [result.expired, result.exterior, result.nonRoute]) {
    expect(activation).toMatchObject({ activations: 0, windowURLs: [], remaining: 0 });
  }
  expect(result).toMatchObject({ wasPresent: true, routePreserved: true, unread: true });
});

test.skipIf(server.browser !== 'chromium')('blocked notification permission leaves in-page updates available', async () => {
  await expect(commands.blockedSystemNotification()).resolves.toEqual({ blocked: true, route: 'delivery' });
});
