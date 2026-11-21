import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';

test('the first real collection request can fail, retry successfully, and render an empty response', async () => {
  expect(await commands.refreshColdFlow()).toEqual({ whileLoading: true, coldError: true,
    retry: '14 requests shown.', empty: '0 requests shown.', alertsAfterEmpty: 0, methods: ['GET', 'GET', 'GET'] });
});

test('refresh keeps existing rows usable during failure, cancels a pending retry, and accepts a subsequent response', async () => {
  expect(await commands.refreshRecoveryFlow()).toEqual({ rowsInteractive: true, keptOnError: true,
    afterCancel: { alerts: 0, selected: true, aborted: true }, result: '14 requests shown.', progress: 0,
    methods: ['GET', 'GET', 'GET', 'GET'], announcements: [] });
});

test('background data preserves the filter, position, focus and command key, then recovers from a removed or empty view', async () => {
  const outcome = await commands.refreshFocusFlow();
  expect(outcome.anchorBefore.offset).toBeCloseTo(-10, 0);
  const anchor = { key: '105', offset: outcome.anchorBefore.offset, axis: 'vertical' };
  const description = 'Schedule a calibration for the portable meters.';
  expect(outcome).toEqual({ expanded: true, filterFocus: true, focusAfterFilter: true, state: 'open', anchorBefore: anchor,
    afterUpdate: { anchor, focused: true, selected: true, route: true },
    unchanged: { anchor, focused: true, announcements: ['13 requests shown.'] },
    actions: { menuFocus: true, fromMenu: description, fromBar: description },
    removed: { anchor: { ...anchor, key: '106' }, nearest: true, disabled: true },
    empty: { focused: true, expanded: 'false', route: true, announcements: ['13 requests shown.',
      '12 requests shown. Equipment calibration is no longer in this view.',
      '0 requests shown. Meeting room projector is no longer in this view.'] },
    methods: ['GET', 'GET', 'GET', 'GET', 'GET'],
  });
});
