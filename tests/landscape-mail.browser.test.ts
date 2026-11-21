import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';

test('keeps the mail rail and overflow menu reachable at 200% text in a short landscape viewport', async () => {
  expect(await commands.compactLandscapeOverflow()).toEqual({
    outsideRail: true, insideViewport: true, toggleReachable: true,
    lastActionVisible: true, toggleRegainedFocus: true, marked: true,
  });
});

test('rotates the mail command bar and keeps Flagged, message data and Back focus', async () => {
  expect(await commands.landscapeMail()).toEqual({
    count: 12,
    first: 'Radio check at 08:30',
    initiallyUnread: true,
    landscapeFolder: true,
    listPreserved: true,
    overflowFocused: true,
    overflowBesideRail: true,
    overflowReturnedFocus: true,
    appliedMarkRead: true,
    inactiveIsHidden: true,
    detailFocused: true,
    body: "I can pick up lunch on the way. Let me know if you're meeting us at the station.",
    message: 'field-lunch',
    detailPreserved: true,
    returnedFolder: 'flagged',
    restoredScroll: true,
    returnedRow: true,
    restoredReadState: true,
    sorted: true,
  });
}, 20000);
