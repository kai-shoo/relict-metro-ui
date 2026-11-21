import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

test('the archive keeps one playback session and shares the notification with its journal', async () => {
  expect(await commands.mediaExample()).toEqual({ preservedPlayback: true, notificationPreserved: true, zoom: 1.5 });
});

test('the compact media stack keeps whole words and its native control reachable at 200% text', async () => {
  expect(await commands.compactMediaStack()).toEqual({
    titleFits: true, barFits: true, labelFits: true, actionFits: true,
    indicatorAboveLabel: true, childrenStacked: true, nativeEnabled: true,
  });
});

test.skipIf(server.browser !== 'chromium')('the browser host delivers and retracts a scoped service worker notification', async () => {
  expect(await commands.nativeNotificationHost()).toEqual({
    result: 'applied', hasNotice: true, kind: 'notification', pathname: '/tests/fixtures/notification-host.html', remaining: 0,
  });
});

test.skipIf(server.browser !== 'chromium')('fullscreen video retains its native media and paused position', async () => {
  expect(await commands.mediaFullscreen()).toEqual({ entered: true, preserved: true });
});

test.each(['button', 'history'])('mail restores the list through %s Back', async method => {
  expect(await commands.mailBack(method)).toEqual({
    detailFocused: true,
    selected: 'flagged',
    scrollRestored: true,
    focused: true,
    actionsVisible: true,
  });
});

test('folder commands update the list and restore focus', async () => {
  expect(await commands.mailCommand()).toEqual({ empty: true, status: 'Flags cleared.', focused: true });
});

test('the Start tile is a named link that preserves modifier navigation', async () => {
  expect(await commands.startLink()).toEqual({
    original: '/examples/start/',
    opened: '/examples/mail/',
  });
});

test('settings save through the form and reset through the confirmation menu', async () => {
  expect(await commands.settingsForm()).toEqual({
    cancelFocused: true,
    focusReturned: true,
    radioReset: true,
    checkboxReset: true,
    resultHidden: true,
  });
});

test('settings menus keep localized words together with 200% text on a phone', async () => {
  expect(await commands.settingsMenuWrapping()).toEqual({
    menuWordLines: [1, 1],
    triggerWordLines: [1, 1],
    scrolls: true,
    focusReturned: true,
  });
});

test('the narrow workspace keeps both confirmation actions readable and restores draft focus', async () => {
  expect(await commands.workspaceCompact()).toEqual({
    manualSelection: true, headingLines: 2, actionLines: [1, 1], startsAtHeading: true, safeActionFocused: true,
    draftRestored: true, selectedFallback: true, pageFits: true,
  });
});

test('the workspace moves a draft to another window and brings the same session back', async () => {
  expect(await commands.workspaceTransfer()).toEqual({
    draftMoved: 'Записано перед переносом',
    keptOpen: true,
    draftReturned: 'Дополнено в новом окне',
    draftRecovered: 'Сохранено после закрытия окна',
  });
});

test('dragging a document tab reorders the workspace without switching its active document', async () => {
  expect(await commands.workspaceReorder()).toEqual({
    order: ['Блокнот', 'Проекты'],
    selected: 'true',
  });
});

test('a real drop outside the tab row asks the host to open a window and preserves the draft if denied', async () => {
  const text = 'Черновик остаётся при отказе и переезжает при подтверждении';
  expect(await commands.workspaceTearOut()).toEqual({ afterDenied: text, moved: text, focusMoved: true });
});

test.skipIf(server.browser !== 'chromium')('a native drag payload inserts a detached document into the clicked window at the preview', async () => {
  expect(await commands.workspaceDragAcrossWindows()).toEqual({
    order: ['Блокнот', 'Проекты'], draft: 'Вернуть в начало ряда', focus: true,
  });
});

test.skipIf(server.browser !== 'chromium')('touch swipe changes Pivot once and leaves the touched letter unopened', async () => {
  expect(await commands.pivotTouch('horizontal')).toMatchObject({
    selected: 'sent',
    changes: ['sent'],
    hash: '',
  });
});

test.skipIf(server.browser !== 'chromium')('vertical touch scroll leaves the folder selected and the next tap works', async () => {
  const result = await commands.pivotTouch('vertical');
  expect(result).toMatchObject({ selected: 'inbox', changes: [], hash: '', tapHash: '#opened' });
  expect(result.scrolled).toBeGreaterThan(40);
});

test.skipIf(server.browser !== 'chromium')('resizing Pivot after the last touch move discards its drag on release', async () => {
  const result = await commands.pivotResizeTouch();
  expect(result.before.dragging).toBe(true);
  expect(parseFloat(result.before.offset)).toBeLessThan(-100);
  expect(result.resized.width).toBe(result.before.width - 60);
  expect(result).toMatchObject({ value: 'inbox', changes: [], hash: '', released: { dragging: false, offset: '' } });
});

test('editor shares command availability and dispatches Back through layer, mode and history', async () => {
  expect(await commands.editorExample()).toEqual({
    activeDocumentSaved: true, pickerFirst: true, modeSecond: true, shortcutBlocked: true,
  });
});
