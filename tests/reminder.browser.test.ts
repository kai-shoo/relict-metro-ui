import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/reminder.js';
import type { MetroReminderActionDetail } from '../src/reminder.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro reminder', () => {
  test('announces host state and emits a keyed snooze without mutating the schedule', async () => {
    const container = mount(`
      <form>
        <metro-reminder reminder-id="meeting" heading="Call with Pat" state="scheduled"
          scheduled-at="2027-10-12T09:00:00Z" time-text="9:00 AM" snooze-minutes="15">
          <span>Review the proposal.</span>
        </metro-reminder>
      </form>
    `);
    const reminder = container.querySelector('metro-reminder')!;
    const form = container.querySelector('form')!;
    const card = page.getByRole('region', { name: 'Call with Pat' });
    const actions: MetroReminderActionDetail[] = [];
    reminder.addEventListener('metro-reminder-action', event => actions.push(event.detail));
    let submits = 0;
    form.addEventListener('submit', event => { event.preventDefault(); submits++; });
    await expect.element(card.getByRole('status')).toHaveTextContent('Scheduled');
    await expect.element(card.getByText('9:00 AM')).toHaveAttribute('datetime', '2027-10-12T09:00:00Z');
    await expect.element(page.getByText('Review the proposal.')).toBeVisible();
    await userEvent.click(card.getByRole('button', { name: 'Snooze' }));
    expect(actions).toEqual([{
      id: 'meeting', action: 'snooze', scheduledAt: '2027-10-12T09:00:00Z', snoozeMinutes: 15,
    }]);
    expect(reminder.state).toBe('scheduled');
    expect(reminder.scheduledAt).toBe('2027-10-12T09:00:00Z');
    expect(submits).toBe(0);

    reminder.pending = true;
    await expect.element(card).toHaveAttribute('aria-busy', 'true');
    await expect.element(card.getByRole('button', { name: 'Snooze' })).toBeDisabled();
    await userEvent.keyboard('{Enter}');
    expect(actions).toHaveLength(1);
    reminder.pending = false;
    reminder.state = 'snoozed';
    reminder.scheduledAt = '2027-10-12T09:15:00Z';
    reminder.timeText = '9:15 AM';
    await expect.element(card.getByRole('status')).toHaveTextContent('Snoozed');
    await expect.element(card.getByText('9:15 AM')).toHaveAttribute('datetime', '2027-10-12T09:15:00Z');
  });

  test('presents distinct open and dismiss actions and never assumes a device delivered the reminder', async () => {
    const container = mount(`
      <metro-reminder reminder-id="stretch" state="missed" hide-snooze>
        <span slot="heading">Take a break</span>
      </metro-reminder>
    `);
    const reminder = container.querySelector('metro-reminder')!;
    const card = page.getByRole('region', { name: 'Take a break' });
    const actions: MetroReminderActionDetail[] = [];
    container.addEventListener('metro-reminder-action', event => actions.push(event.detail));
    await expect.element(card.getByRole('status')).toHaveTextContent('Missed');
    await expect.element(card.getByRole('button', { name: 'Snooze' })).not.toBeInTheDocument();
    await userEvent.click(card.getByRole('button', { name: 'Open' }));
    await userEvent.click(card.getByRole('button', { name: 'Dismiss' }));
    expect(actions.map(action => [action.id, action.action])).toEqual([['stretch', 'open'], ['stretch', 'dismiss']]);
    expect(reminder.state).toBe('missed');
    await expect.element(card).toBeVisible();
    reminder.reminderId = '';
    await expect.element(card.getByRole('button', { name: 'Open' })).toBeDisabled();
  });

  test('fits a long localized action and moves focus to the updated status when it disappears', async () => {
    const label = 'Отложить напоминание';
    const container = mount(`
      <metro-reminder reminder-id="departure" heading="Отправление" style="width:241px"
        snooze-label="${label}"></metro-reminder>
      <button type="button">Next record</button>
    `);
    const reminder = container.querySelector('metro-reminder')!;
    const root = document.documentElement;
    const original = root.style.fontSize;
    root.style.fontSize = '200%';
    try {
      const card = page.getByRole('region', { name: 'Отправление' });
      const snooze = card.getByRole('button', { name: label });
      const status = card.getByRole('status');
      await expect.element(snooze).toBeVisible();
      const heading = card.getByRole('heading', { name: 'Отправление' }).element();
      const caption = document.createRange();
      caption.selectNodeContents(heading.querySelector('slot')!);
      expect(caption.getClientRects()).toHaveLength(1);
      const button = snooze.element() as HTMLButtonElement;
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(card.element().getBoundingClientRect().right);
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);

      const requests: string[] = [];
      reminder.addEventListener('metro-reminder-action', event => {
        requests.push(event.detail.action);
        reminder.state = 'snoozed';
        reminder.hideSnooze = true;
      }, { once: true });
      button.focus();
      await userEvent.keyboard('{Enter}');
      await expect.element(snooze).not.toBeInTheDocument();
      await expect.element(status).toHaveTextContent('Snoozed');
      expect(reminder.shadowRoot?.activeElement).toBe(status.element());
      expect(requests).toEqual(['snooze']);
      await userEvent.keyboard('{Tab}');
      expect(reminder.shadowRoot?.activeElement).toBe(card.getByRole('button', { name: 'Open' }).element());

      const next = page.getByRole('button', { name: 'Next record' });
      reminder.addEventListener('metro-reminder-action', () => {
        (next.element() as HTMLButtonElement).focus();
        reminder.hideOpen = true;
      }, { once: true });
      await userEvent.keyboard('{Enter}');
      await expect.element(card.getByRole('button', { name: 'Open' })).not.toBeInTheDocument();
      await expect.element(next).toHaveFocus();
    } finally {
      root.style.fontSize = original;
    }
  });
});
