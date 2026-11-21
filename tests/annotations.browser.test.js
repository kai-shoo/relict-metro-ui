import { commands, server } from 'vitest/browser';
import { expect, test } from 'vitest';

test('document annotations preserve leaf coordinates, captions, and focus across reflow and reopening', async () => {
  expect(await commands.annotationLifeCycle()).toEqual({ relocated: true, retained: true,
    toolRetained: true, backRestored: true, persisted: true, secondRelocated: true });
}, 15000);

test.skipIf(server.browser !== 'chromium')('emulated pen, lost capture, touch scrolling, and explicit touch inking stay distinct', async () => {
  expect(await commands.annotationTouch()).toEqual({ pressure: true, cancelled: true, scrollsWithoutDrawing: true, fingerEnabled: true });
}, 15000);
