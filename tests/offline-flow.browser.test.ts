import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

test.each([false, true])('group selection and one download survive resize, retry and offline reopening (reduced motion=%s)', async reduced => {
  const state = await commands.offlineGroupFlow(reduced);
  expect(state).toMatchObject({
    mixed: { mixed: true, checked: false, focused: true },
    all: { mixed: false, checked: true, focused: true },
    clear: { mixed: false, checked: false, focused: true },
    changedGroup: { mixed: true, checked: false, focused: true },
    liveSelection: '3 selected', unknown: true, overflow: true,
    theme: { dark: 'rgb(0, 0, 0)', reduced }, cachedBeforeRetry: true, measured: true, retryFocusKept: true,
    focusedAfterRemoval: true, selectionAfterRemoval: '2 selected',
    files: ['north-route.txt', 'south-route.txt', 'south-route.txt'], bothSaved: true, fileLabelFits: true,
  });
  expect(state.offlineContent).toContain('Follow the blue markers to the north gate.');
});

test.skipIf(server.browser !== 'chromium')('touch and keyboard select the same available keys under a mixed group checkbox', async () => {
  await expect(commands.offlineTouchSelection()).resolves.toEqual({ mixed: true, full: true, selected: '2 selected', disabledExcluded: true });
});
