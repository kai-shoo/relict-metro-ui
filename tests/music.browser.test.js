import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';

test('the music launch defers a protected tile target and commits once after a failed and retried sign-in', async () => {
  expect(await commands.musicAccess(false)).toEqual({
    tileHasGlyph: true, targetWasDeferred: true, failedOnce: true, playerVisits: ['beacon'], openedURL: 'beacon',
  });
}, 15000);

test('the music launch cancels an in-flight sign-in and an unrelated sign-in leaves the destination cleared', async () => {
  expect(await commands.musicAccess(true)).toEqual({ targetWasDeferred: true, cleared: true, playerVisits: [] });
}, 15000);

test('music reuses one playing record across recent and search and returns through menu, focus, filter, and scroll', async () => {
  expect(await commands.musicPlayback()).toEqual({
    menuFirst: true, favoriteTarget: 'Добавлено в избранное · У озера', recentRestored: true,
    searchRestored: true, sameMedia: true, playsInBackground: true, favoriteRetained: true, queueFollowsSearch: true,
  });
}, 15000);
