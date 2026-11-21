import { afterEach, expect, test, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/lockable-pivot.js';

interface TouchState {
  outer: string;
  inner: string;
  events: { id: string; value: string }[];
  dragging: boolean;
  offset: string;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    lockablePivotTouch(): Promise<{
      locked: TouchState; unlocked: TouchState; began: boolean; interrupted: TouchState;
      beganBeforeBriefLock: boolean; briefLock: TouchState;
    }>;
  }
}

let fixture: HTMLDivElement | undefined;

function mount(attributes: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = `<metro-lockable-pivot label="Folders" ${attributes}>
    <metro-pivot-item value="inbox" label="Inbox">Inbox messages</metro-pivot-item>
    <metro-pivot-item value="sent" label="Sent"><input aria-label="Filter sent"></metro-pivot-item>
    <metro-pivot-item value="archive" label="Archive">Archive messages</metro-pivot-item>
  </metro-lockable-pivot>`;
  document.body.append(fixture);
  return fixture.querySelector('metro-lockable-pivot')!;
}

afterEach(() => fixture?.remove());

test('LockablePivot pins a stable value while current panel content remains interactive', async () => {
  const pivot = mount('locked value="sent"');
  const changes = vi.fn();
  pivot.addEventListener('metro-change', event => changes(event.detail.value));
  const sent = page.getByRole('tab', { name: 'Sent' });
  const filter = page.getByRole('textbox', { name: 'Filter sent' });
  await expect.element(sent).toHaveAttribute('aria-selected', 'true');
  expect(pivot.shadowRoot?.querySelectorAll('[role="tab"]').length).toBe(1);
  (sent.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}{Home}{End}{Enter}{Space}');
  expect(pivot.shadowRoot?.activeElement).toBe(sent.element());

  await filter.fill('abc');
  pivot.value = 'inbox';
  await expect.poll(() => pivot.value).toBe('sent');
  await expect.element(filter).toHaveValue('abc');
  expect(document.activeElement).toBe(filter.element());
  expect(changes).not.toHaveBeenCalled();

  pivot.locked = false;
  const inbox = page.getByRole('tab', { name: 'Inbox' });
  await expect.element(inbox).toBeVisible();
  expect(document.activeElement).toBe(filter.element());
  (sent.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowLeft}{Enter}');
  await expect.element(inbox).toHaveAttribute('aria-selected', 'true');
  expect(changes).toHaveBeenCalledExactlyOnceWith('inbox');
});

test('locking returns focus from an inactive tab and keeps the normal silent fallback when a panel disappears', async () => {
  const pivot = mount('value="inbox"');
  const changes = vi.fn();
  pivot.addEventListener('metro-change', changes);
  const inbox = page.getByRole('tab', { name: 'Inbox' });
  const archive = page.getByRole('tab', { name: 'Archive' });
  await expect.element(archive).toBeVisible();
  (archive.element() as HTMLElement).focus();
  pivot.locked = true;
  pivot.value = 'sent';
  await expect.poll(() => pivot.shadowRoot?.activeElement).toBe(inbox.element());
  expect(pivot.value).toBe('inbox');

  pivot.querySelector('[value="inbox"]')!.remove();
  await expect.poll(() => pivot.value).toBe('sent');
  const sent = page.getByRole('tab', { name: 'Sent' });
  await expect.poll(() => pivot.shadowRoot?.activeElement).toBe(sent.element());
  expect(pivot.shadowRoot?.querySelectorAll('[role="tab"]').length).toBe(1);
  pivot.value = 'archive';
  await expect.poll(() => pivot.value).toBe('sent');
  expect(changes).not.toHaveBeenCalled();
});

test('a locked Pivot keeps a focus destination when every tab becomes unavailable', async () => {
  const pivot = mount('locked value="sent"');
  const sent = page.getByRole('tab', { name: 'Sent' });
  await expect.element(sent).toBeVisible();
  (sent.element() as HTMLElement).focus();
  const tabs = page.getByRole('tablist', { name: 'Folders' });
  const panels = [...pivot.querySelectorAll('metro-pivot-item')];
  for (const panel of panels) panel.disabled = true;
  await expect.element(sent).not.toBeInTheDocument();
  expect(pivot.value).toBe('');
  expect(pivot.shadowRoot?.activeElement).toBe(tabs.element());
  const archive = panels.find(panel => panel.value === 'archive')!;
  archive.disabled = false;
  const available = page.getByRole('tab', { name: 'Archive' });
  await expect.element(available).toHaveAttribute('aria-selected', 'true');
  expect(pivot.shadowRoot?.activeElement).toBe(available.element());
});

test.skipIf(server.browser !== 'chromium')('emulated touch cannot switch a locked or interrupted nested Pivot', async () => {
  const { locked, unlocked, began, interrupted, beganBeforeBriefLock, briefLock } = await commands.lockablePivotTouch();
  expect(locked).toEqual({ outer: 'outside-a', inner: 'a', events: [], dragging: false, offset: '' });
  expect(unlocked).toEqual({ outer: 'outside-a', inner: 'b', events: [{ id: 'inner', value: 'b' }], dragging: false, offset: '' });
  expect(began).toBe(true);
  expect(interrupted).toEqual(unlocked);
  expect(beganBeforeBriefLock).toBe(true);
  expect(briefLock).toEqual(unlocked);
});
