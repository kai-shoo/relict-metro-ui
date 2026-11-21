import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';

test('selection creates independent queue positions and skips a record removed before confirmation', async () => {
  expect(await commands.collectionSelectionQueue()).toEqual({
    separatePositions: [
      ['position-1', 'Field notes'], ['position-2', 'Radio archive'],
      ['position-3', 'Field notes'], ['position-4', 'Radio archive'],
    ],
    updatedSelection: true,
    removedRow: true,
    pendingFocus: true,
    firstRequests: 1,
    emptyFocus: true,
  });
});

test('the compact selection keeps labels readable and shares one Back step with browser history', async () => {
  expect(await commands.compactCollectionSelection()).toEqual({
    labelsFit: true, backStayedOnPage: true, focusReturned: true,
    escapeReturned: true, escapeRemovedEntry: true, pendingCleared: true,
  });
});

test('the compact transfer keeps pending commands and the focused row reachable at 200% text', async () => {
  expect(await commands.compactCollectionTransfer()).toEqual({
    pendingFocus: true, requestsWhilePending: 1, cancelIsNext: true,
    canceledFocusVisible: true, movedFocusVisible: true, labelsFit: true,
  });
});

test('the built collection example uses keyboard Copy and desktop Move for the same selection', async () => {
  const { copied, moved, canceled } = await commands.groupedCollectionExample();
  const selection = {
    items: [['library-recordings', 'field-notes'], ['archive-recordings', 'night-signal']],
    targetGroup: 'queue-recordings', before: 'morning-bulletin',
  };
  const copy = { ...selection, operation: 'copy', input: 'keyboard' };
  const move = { ...selection, operation: 'move', input: 'pointer' };
  expect(copied.commits).toEqual([{ ...copy, targetKeys: ['copy-1', 'copy-2'] }]);
  expect(copied.previews).toContainEqual(copy);
  expect(copied).toMatchObject({ library: ['field-notes', 'radio-archive', 'evening-report'], archive: ['night-signal', 'remote-interview'],
    queue: ['copy-1', 'copy-2', 'morning-bulletin'], focus: 'copy-1' });
  expect(moved.commits).toEqual([...copied.commits, { ...move, targetKeys: ['field-notes', 'night-signal'] }]);
  expect(moved.previews).toContainEqual(move);
  expect(moved).toMatchObject({ library: ['radio-archive', 'evening-report'], archive: ['remote-interview'],
    queue: ['copy-1', 'copy-2', 'field-notes', 'night-signal', 'morning-bulletin'], focus: 'night-signal' });
  expect(canceled).toMatchObject({ ...moved, previews: expect.any(Array) });
});
