import { afterEach, expect, test } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/date-picker.js';
import '../src/time-picker.js';

type TimeFormSnapshot = { value: string; submitted: string | null; events: string[] };

declare module 'vitest/browser' {
  interface BrowserCommands {
    phonePickerLayout(): Promise<{
      width: number; headingVisible: boolean; reachable: boolean; completeRows: boolean; retainedFocus: boolean; restoredFocus: boolean;
    }>;
    swipePhoneTime(): Promise<{
      hourBefore: string | null;
      swipe: { touchStarts: number; snap: { offset: number; error: number }; hour: number; cell: number };
      staged: TimeFormSnapshot;
      committed: TimeFormSnapshot;
    }>;
  }
}

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

function expectClosed(picker: HTMLElement & { pickerOpen: boolean }) {
  return expect.poll(() => ({ open: picker.pickerOpen,
    modal: picker.shadowRoot?.querySelector('metro-dialog')?.shadowRoot?.querySelector('dialog')?.open,
  })).toEqual({ open: false, modal: false });
}

afterEach(() => fixture?.remove());

test('phone date columns follow locale, stage a leap-day change and restore the trigger on Escape and Done', async () => {
  const container = mount(`<form>
    <metro-date-picker presentation="phone" locale="fr" name="departure" label="Départ"
      dialog-label="Date de départ" apply-label="Appliquer" cancel-label="Annuler"
      min="2028-02-25" max="2029-03-03" value="2028-02-29"></metro-date-picker>
  </form>`);
  const form = container.querySelector('form')!;
  const picker = container.querySelector('metro-date-picker')!;
  picker.pickerLabels = { day: 'Jour', month: 'Mois', year: 'Année' };
  const events: string[] = [];
  for (const type of ['input', 'change']) {
    form.addEventListener(type, (event) => {
      expect(event.target).toBe(picker);
      events.push(`${type}:${picker.value}`);
    });
  }
  const trigger = page.getByRole('button', { name: 'Départ' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Date de départ' });
  const day = page.getByRole('spinbutton', { name: 'Jour' });
  const month = page.getByRole('spinbutton', { name: 'Mois' });
  const year = page.getByRole('spinbutton', { name: 'Année' });
  await expect.element(dialog).toBeVisible();
  await expect.element(day).toHaveAttribute('aria-valuenow', '29');
  expect(page.getByRole('spinbutton').elements()).toEqual([day.element(), month.element(), year.element()]);
  await expect.poll(() => picker.shadowRoot?.activeElement?.getAttribute('data-column')).toBe('day');
  await userEvent.tab();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(day).toHaveAttribute('aria-valuenow', '28');
  expect(new FormData(form).get('departure')).toBe('2028-02-29');
  await userEvent.keyboard('{Escape}');
  await expectClosed(picker);
  expect(events).toEqual([]);
  expect(picker.shadowRoot?.activeElement).toBe(trigger.element());

  await userEvent.click(trigger);
  (year.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  (month.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  const apply = page.getByRole('button', { name: 'Appliquer' });
  await expect.element(apply).toBeDisabled();
  expect(new FormData(form).get('departure')).toBe('2028-02-29');
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.click(apply);
  await expectClosed(picker);
  expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  expect(new FormData(form).get('departure')).toBe('2029-02-28');
  expect(events).toEqual(['input:2029-02-28', 'change:2029-02-28']);

  await userEvent.click(trigger);
  await userEvent.click(apply);
  await expectClosed(picker);
  expect(events).toHaveLength(2);

  picker.showPicker();
  await expect.element(dialog).toBeVisible();
  picker.value = '2028-03-01';
  await expectClosed(picker);
  expect(events).toHaveLength(2);
  form.reset();
  expect(picker.value).toBe('2028-02-29');
});

test('phone time applies a localized period, wraps minute cells, and cancels explicit Back or form disablement', async () => {
  const container = mount(`<form><fieldset>
    <metro-time-picker presentation="phone" lang="en-US" name="time" label="Pickup" value="11:59" step="30"></metro-time-picker>
  </fieldset></form>`);
  const form = container.querySelector('form')!;
  const fieldset = container.querySelector('fieldset')!;
  const picker = container.querySelector('metro-time-picker')!;
  const trigger = page.getByRole('button', { name: 'Pickup' });
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Pickup' });
  const minute = page.getByRole('spinbutton', { name: 'Minute' });
  const seconds = page.getByRole('spinbutton', { name: 'Second' });
  const period = page.getByRole('spinbutton', { name: 'Day period' });
  await expect.element(period).toHaveAttribute('aria-valuetext', 'AM');
  (minute.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(minute).toHaveAttribute('aria-valuenow', '0');
  (period.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(period).toHaveAttribute('aria-valuetext', 'PM');
  (seconds.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  const done = page.getByRole('button', { name: 'Done' });
  await expect.element(done).toBeDisabled();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.click(done);
  expect(picker.value).toBe('23:00');
  expect(new FormData(form).get('time')).toBe('23:00');

  picker.showPicker();
  await expect.element(dialog).toBeVisible();
  expect(picker.closePicker()).toBe(true);
  await expectClosed(picker);
  expect(picker.closePicker()).toBe(false);
  expect(picker.value).toBe('23:00');

  await userEvent.click(trigger);
  fieldset.disabled = true;
  await expectClosed(picker);
  await expect.element(trigger).toBeDisabled();
  expect(new FormData(form).has('time')).toBe(false);
});

test('a phone time with an offset step can reach the valid seconds even when the committed time omitted them', async () => {
  const container = mount(`<metro-time-picker presentation="phone" locale="en-GB" label="Pickup"
    value="23:59" min="22:00:30" max="02:00:30" step="60"></metro-time-picker>`);
  const picker = container.querySelector('metro-time-picker')!;
  await userEvent.click(page.getByRole('button', { name: 'Pickup' }));
  const seconds = page.getByRole('spinbutton', { name: 'Second' });
  const done = page.getByRole('button', { name: 'Done' });
  await expect.element(seconds).toHaveAttribute('aria-valuenow', '0');
  await expect.element(done).toBeDisabled();
  (seconds.element() as HTMLElement).focus();
  await userEvent.keyboard('{PageUp}{PageUp}{PageUp}');
  await expect.element(seconds).toHaveAttribute('aria-valuenow', '30');
  await userEvent.click(done);
  expect(picker.value).toBe('23:59:30');
  expect(picker.validity.valid).toBe(true);
});

test('keeps editing focus when the locale removes the day-period wheel', async () => {
  const container = mount(`<metro-time-picker presentation="phone" locale="en-US" label="Pickup"
    value="23:59"></metro-time-picker>`);
  const picker = container.querySelector('metro-time-picker')!;
  const trigger = page.getByRole('button', { name: 'Pickup' });
  const hour = page.getByRole('spinbutton', { name: 'Hour' });
  const minute = page.getByRole('spinbutton', { name: 'Minute' });
  const period = page.getByRole('spinbutton', { name: 'Day period' });
  await trigger.click();
  await expect.element(period).toBeVisible();
  (minute.element() as HTMLElement).focus();
  await userEvent.keyboard('{Home}');
  expect(minute.element().getAttribute('aria-valuenow')).toBe('0');

  (period.element() as HTMLElement).focus();
  picker.locale = 'en-GB';
  await expect.element(period).not.toBeInTheDocument();
  expect(picker.shadowRoot?.activeElement).toBe(hour.element());
  await expect.element(hour).toHaveAttribute('aria-valuenow', '23');
  await userEvent.keyboard('{End}');
  await expect.element(hour).toHaveAttribute('aria-valuenow', '23');
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(hour).toHaveAttribute('aria-valuenow', '0');
  await userEvent.keyboard('{Escape}');
  await expectClosed(picker);
  expect(picker.value).toBe('23:59');
  expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
});

test('uses the narrow phone viewport and brings the final date column into view with Tab', async () => {
  expect(await commands.phonePickerLayout()).toEqual({
    width: 320, headingVisible: true, reachable: true, completeRows: true, retainedFocus: true, restoredFocus: true,
  });
});

test.skipIf(server.browser !== 'chromium')('a native vertical touch scroll changes only the staged phone wheel', async () => {
  const { hourBefore, swipe, staged, committed } = await commands.swipePhoneTime();
  expect(hourBefore).toBe('11');
  expect(swipe.touchStarts).toBe(1);
  expect(swipe.snap.offset).toBeGreaterThan(0);
  expect(swipe.snap.error).toBeLessThanOrEqual(1);
  expect(swipe.hour).toBe(11 + swipe.snap.offset);
  expect(swipe.cell).toBe(swipe.hour);
  expect(staged).toEqual({ value: '11:00', submitted: '11:00', events: [] });
  const selected = `${swipe.hour}:00`;
  expect(committed).toEqual({ value: selected, submitted: selected, events: [`input:${selected}`, `change:${selected}`] });
});
