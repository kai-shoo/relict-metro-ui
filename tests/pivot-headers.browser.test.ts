import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

interface Header {
  label: string;
  hidden: boolean;
  buttonVisible: boolean;
  start: number;
  visible: number;
  clipped: boolean;
}

interface HeaderLayout {
  value: string;
  active: Header;
  previous: Header | null;
  next: Header | null;
  lastVisible: Header;
  focus: string | null;
  focusOutline: string | null;
  real: string[];
  copies: number;
}

interface HeaderMotion {
  start: number;
  end: number;
  offsets: number[];
  distance: number;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    mailPivotHeaders(): Promise<Record<'before' | 'inbox' | 'archive' | 'preview' | 'wide'
      | 'rtlInbox' | 'rtlArchive' | 'rtlPreview' | 'rtlWithoutResize', HeaderLayout> & { events: string[] }>;
    mailPivotHeaderMotion(): Promise<{ straight: HeaderMotion; wrapped: HeaderMotion; events: string[] }>;
    mailPivotHeaderDrag(): Promise<{ delta: number; selected: string; changes: string[] }>;
    mailPivotTouchBack(): Promise<{
      startedOnClippedInbox: boolean; inboxVisible: boolean; neighborVisible: boolean;
      restoredHeader: boolean; scrollRestored: boolean; commandsVisible: boolean; events: string[];
    }>;
  }
}

test('clicking the visible fragment of a mail heading brings its real tab to the leading position', async () => {
  const { before, inbox, archive, rtlWithoutResize, preview, wide, rtlInbox, rtlArchive, rtlPreview, events } = await commands.mailPivotHeaders();
  expect(before).toMatchObject({
    value: 'flagged',
    active: { label: 'Flagged', buttonVisible: true },
    previous: { label: 'Inbox', hidden: false, clipped: true },
    next: { label: 'Archive' },
  });
  expect(inbox).toMatchObject({
    value: 'inbox',
    active: { label: 'Inbox', buttonVisible: true },
    previous: { label: 'Archive', hidden: true, clipped: true },
    next: { label: 'Flagged', hidden: false },
    lastVisible: { clipped: true },
    focus: 'Inbox',
    focusOutline: 'none',
    real: ['Inbox', 'Flagged', 'Archive'],
  });
  expect(Math.abs(inbox.active.start - before.active.start)).toBeLessThanOrEqual(1);
  expect(inbox.next!.visible).toBeGreaterThan(0);
  expect(archive).toMatchObject({
    active: { label: 'Archive', buttonVisible: true },
    previous: { label: 'Flagged', clipped: true },
    next: { label: 'Inbox', hidden: true },
    focus: 'Archive',
    focusOutline: 'none',
  });
  expect(archive.next!.visible).toBeGreaterThan(0);
  expect(rtlWithoutResize).toMatchObject({
    value: 'archive', active: { label: 'Archive', buttonVisible: true }, focus: 'Archive',
  });
  expect(preview).toMatchObject({ value: 'archive', focus: 'Inbox', focusOutline: 'solid' });
  expect(wide).toMatchObject({ value: 'inbox', copies: 0, real: ['Inbox', 'Flagged', 'Archive'] });
  expect(wide.active.start).toBeLessThan(inbox.active.start);
  expect(rtlInbox).toMatchObject({
    active: { label: 'Inbox', buttonVisible: true },
    previous: { label: 'Archive', clipped: true },
    next: { label: 'Flagged' },
  });
  expect(rtlArchive).toMatchObject({ value: 'archive', active: { label: 'Archive', buttonVisible: true }, focus: 'Archive' });
  expect(rtlPreview).toMatchObject({ value: 'archive', focus: 'Inbox' });
  expect(events).toEqual(['inbox', 'archive', 'inbox', 'archive']);
});

test('pointer selection scrolls toward the visible heading even across the cyclic seam', async () => {
  const { straight, wrapped, events } = await commands.mailPivotHeaderMotion();
  for (const { start, end, offsets, distance } of [straight, wrapped]) {
    expect(offsets.some(offset => offset < start - 2 && offset > start - distance + 2)).toBe(true);
    expect(offsets.every(offset => Math.abs(offset - end) <= 2 || offset >= start - distance - 2 && offset <= start + 2),
      JSON.stringify({ start, end, offsets, distance }))
      .toBe(true);
  }
  expect(straight.end).toBeLessThan(straight.start);
  expect(wrapped.end).toBeGreaterThan(wrapped.start);
  expect(events).toEqual(['inbox', 'archive']);
});

test.skipIf(server.browser !== 'chromium')('dragging the mail header scrolls the strip without selecting a tab', async () => {
  const result = await commands.mailPivotHeaderDrag();
  expect(result.delta).toBeGreaterThan(30);
  expect(result.selected).toBe('flagged');
  expect(result.changes).toEqual([]);
});

test.skipIf(server.browser !== 'chromium')('tapping a clipped mail tab and returning from a letter preserves the folder and scroll', async () => {
  expect(await commands.mailPivotTouchBack()).toEqual({
    startedOnClippedInbox: true, inboxVisible: true, neighborVisible: true,
    restoredHeader: true, scrollRestored: true, commandsVisible: true, events: ['inbox'],
  });
});
