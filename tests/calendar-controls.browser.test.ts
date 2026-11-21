import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/calendar-date-picker.js';
import '../src/color-picker.js';

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

test.each([
  ['metro-calendar-date-picker', '<metro-calendar-date-picker label="Review date" name="review" value="2025-05-14"></metro-calendar-date-picker>', 'review'],
  ['metro-color-picker', '<metro-color-picker label="Accent color" name="accent" value="#123456"></metro-color-picker>', 'accent'],
] as const)('%s discards its dialog when moved and can open again', async (tag, markup, name) => {
  const container = mount(`<form>${markup}<input aria-label="Other field"></form>`);
  const picker = container.querySelector(tag)!;
  const form = container.querySelector('form')!;
  const other = container.querySelector('input')!;
  let changes = 0;
  picker.addEventListener('change', () => changes++);
  await picker.updateComplete;
  const initial = new FormData(form).get(name);
  expect(initial).toBeTruthy();
  const dialog = page.getByRole('dialog');
  picker.showPicker();
  await expect.element(dialog).toBeVisible();
  const oldDialog = picker.shadowRoot!.querySelector('metro-dialog')!;
  picker.remove();
  other.focus();
  form.prepend(picker);
  await picker.updateComplete;
  await oldDialog.updateComplete;
  await expect.element(dialog).not.toBeInTheDocument();
  expect(document.activeElement).toBe(other);
  expect(picker.open).toBe(false);
  expect(new FormData(form).get(name)).toBe(initial);

  picker.showPicker();
  await expect.element(dialog).toBeVisible();
  form.reset();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(new FormData(form).get(name)).toBe(initial);
  expect(changes).toBe(0);
});

describe('Metro calendar view', () => {
  test('moves focus to a day when the focused month button reaches the calendar limit', async () => {
    const container = mount('<metro-calendar-view value="2025-01-14" min="2025-01-01" max="2025-02-28"></metro-calendar-view>');
    const calendar = container.querySelector('metro-calendar-view')!;
    const next = page.getByRole('button', { name: 'Next month' });
    await expect.element(next).toBeEnabled();
    (next.element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(next).toBeDisabled();
    expect(calendar.shadowRoot?.activeElement?.getAttribute('data-date')).toBe('2025-02-14');
    expect(calendar.value).toBe('2025-01-14');
  });

  test('keeps day numbers readable in a narrow calendar at 200% text', async () => {
    const container = mount('<metro-calendar-view style="inline-size: 240px" value="2025-01-19" locale="en-US"></metro-calendar-view>');
    const calendar = container.querySelector('metro-calendar-view')!;
    await calendar.updateComplete;
    const html = document.documentElement;
    const initial = html.style.fontSize;
    html.style.fontSize = '200%';
    try {
      calendar.focus({ preventScroll: true });
      const active = calendar.shadowRoot!.activeElement!;
      const text = new Range();
      text.selectNodeContents(active);
      expect(text.getBoundingClientRect().width).toBeLessThan(active.getBoundingClientRect().width);
      expect(calendar.scrollWidth).toBe(calendar.clientWidth);
      const month = calendar.shadowRoot!.querySelector('[part="month"]')!.getBoundingClientRect();
      const previous = calendar.shadowRoot!.querySelector('[part="previous"]')!.getBoundingClientRect();
      expect(month.width).toBeCloseTo(calendar.clientWidth, 0);
      expect(previous.top).toBeGreaterThanOrEqual(month.bottom);
      await userEvent.keyboard('{ArrowRight}'.repeat(6));
      const date = calendar.shadowRoot!.activeElement!;
      expect(date.getAttribute('data-date')).toBe('2025-01-25');
      const cell = date.getBoundingClientRect();
      const view = calendar.getBoundingClientRect();
      expect(cell.left).toBeGreaterThanOrEqual(view.left - 1);
      expect(cell.right).toBeLessThanOrEqual(view.right + 1);
    } finally {
      html.style.fontSize = initial;
    }
  });

  test('navigates across months, skips unavailable dates and selects without moving the tab stop', async () => {
    const container = mount(`
      <metro-calendar-view locale="en-US" value="2024-02-28" min="2024-01-30" max="2024-04-30"></metro-calendar-view>
    `);
    const calendar = container.querySelector('metro-calendar-view')!;
    calendar.disabledDates = ['2024-02-29'];
    const initial = page.getByRole('button', { name: 'Wednesday, February 28, 2024' });
    await expect.element(initial).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Thursday, February 29, 2024' })).toBeDisabled();

    const events: [string, string][] = [];
    for (const name of ['input', 'change']) {
      container.addEventListener(name, event => events.push([event.type, calendar.value]));
    }
    calendar.focus();
    await userEvent.keyboard('{ArrowRight}');
    const friday = page.getByRole('button', { name: 'Friday, March 1, 2024' });
    await expect.poll(() => calendar.shadowRoot?.activeElement).toBe(friday.element());
    expect(calendar.value).toBe('2024-02-28');
    expect(events).toEqual([]);
    await userEvent.keyboard('{Enter}');
    expect(calendar.value).toBe('2024-03-01');
    expect(events).toEqual([['input', '2024-03-01'], ['change', '2024-03-01']]);
    await expect.element(page.getByRole('gridcell', { selected: true }).getByRole('button')).toHaveTextContent('1');

    calendar.value = '2024-03-31';
    await expect.poll(() => (calendar.shadowRoot?.activeElement as HTMLElement)?.dataset.date).toBe('2024-03-31');
    await userEvent.keyboard('{PageDown}');
    await expect.poll(() => (calendar.shadowRoot?.activeElement as HTMLElement)?.dataset.date).toBe('2024-04-30');
    await expect.element(page.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(calendar.value).toBe('2024-03-31');
    expect(events).toHaveLength(2);
  });

  test('formats Gregorian dates in the configured locale and can move without selecting', async () => {
    const container = mount('<metro-calendar-view locale="fr-FR" value="2024-02-29"></metro-calendar-view>');
    const calendar = container.querySelector('metro-calendar-view')!;
    const grid = page.getByRole('grid', { name: 'février 2024' });
    await expect.element(grid).toBeVisible();
    expect(calendar.shadowRoot?.querySelector('th')?.textContent).toBe('lun.');
    const selected = grid.getByRole('gridcell', { selected: true });
    await expect.element(selected.getByRole('button', { name: 'jeudi 29 février 2024' })).toBeVisible();

    calendar.firstDayOfWeek = 0;
    await expect.poll(() => calendar.shadowRoot?.querySelector('th')?.textContent).toBe('dim.');
    calendar.showDate('0099-02-27');
    await expect.element(page.getByRole('grid', { name: 'février 99' })).toBeVisible();
    expect(calendar.value).toBe('2024-02-29');
    calendar.value = '2023-02-29';
    expect(calendar.value).toBe('');
  });

  test('keeps the date with focus in sync with showDate and leaves external focus in place', async () => {
    const container = mount(`<metro-calendar-view dir="rtl" locale="en-US" value="2025-01-14"></metro-calendar-view>
      <button type="button">Other control</button>`);
    const calendar = container.querySelector('metro-calendar-view')!;
    const other = container.querySelector('button')!;
    const events: string[] = [];
    for (const name of ['input', 'change']) calendar.addEventListener(name, event => events.push(event.type));
    await calendar.updateComplete;
    const activeDate = () => calendar.shadowRoot?.activeElement?.getAttribute('data-date');
    calendar.focus();
    expect(activeDate()).toBe('2025-01-14');

    calendar.showDate('2025-04-24');
    await expect.element(page.getByRole('grid', { name: 'April 2025' })).toBeVisible();
    expect(activeDate()).toBe('2025-04-24');
    expect(calendar.shadowRoot?.activeElement?.getAttribute('tabindex')).toBe('0');
    await userEvent.keyboard('{ArrowRight}');
    expect(activeDate()).toBe('2025-04-23');

    calendar.showDate('2025-07-09');
    other.focus();
    await expect.element(page.getByRole('grid', { name: 'July 2025' })).toBeVisible();
    expect(document.activeElement).toBe(other);
    expect(calendar.shadowRoot?.querySelector('.day[tabindex="0"]')?.getAttribute('data-date')).toBe('2025-07-09');
    expect(calendar.value).toBe('2025-01-14');
    expect(events).toEqual([]);
  });
});

describe('Metro calendar date picker', () => {
  test('keeps the month, focused date, and actions reachable in a short dialog at 200% text', async () => {
    const container = mount('');
    const frame = document.createElement('iframe');
    frame.title = 'Drafts on a phone';
    frame.src = '/examples/drafts/';
    frame.style.cssText = 'width:305px;height:460px;border:0';
    const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
    container.append(frame);
    await loaded;
    const doc = frame.contentDocument!;
    doc.documentElement.style.fontSize = '200%';
    const picker = doc.querySelector('metro-calendar-date-picker')!;
    picker.value = '2025-11-04';
    const app = page.frameLocator(page.getByTitle(frame.title));
    const trigger = app.getByRole('button', { name: /^Review date/ });
    await trigger.click();
    const dialog = app.getByRole('dialog', { name: 'Choose a date' });
    await expect.element(dialog).toBeVisible();
    const calendar = picker.shadowRoot!.querySelector('metro-calendar-view')!;
    const days = calendar.shadowRoot!.querySelector<HTMLElement>('.days')!;
    const header = calendar.shadowRoot!.querySelector('[part="header"]')!;
    const month = calendar.shadowRoot!.querySelector('[part="month"]')!;
    const activeDate = () => calendar.shadowRoot?.activeElement?.getAttribute('data-date');
    const expectMonthAndFocusedDay = () => expect.poll(() => {
      const viewport = dialog.element().getBoundingClientRect();
      const day = calendar.shadowRoot!.activeElement!.getBoundingClientRect();
      const headerBounds = header.getBoundingClientRect();
      return headerBounds.top >= viewport.top - 1 &&
        day.top >= headerBounds.bottom - 1 && day.bottom <= viewport.bottom + 1;
    }).toBe(true);
    await expect.poll(activeDate).toBe('2025-11-04');
    await expectMonthAndFocusedDay();
    expect(dialog.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(270);
    expect(days.scrollWidth - days.clientWidth).toBeLessThan(140);

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{End}');
    await expect.poll(activeDate).toBe('2025-11-29');
    const cell = calendar.shadowRoot!.activeElement!.getBoundingClientRect();
    const surface = dialog.element().getBoundingClientRect();
    const viewport = days.getBoundingClientRect();
    expect(cell.top).toBeGreaterThanOrEqual(surface.top - 1);
    expect(cell.bottom).toBeLessThanOrEqual(surface.bottom + 1);
    expect(cell.left).toBeGreaterThanOrEqual(viewport.left - 1);
    expect(cell.right).toBeLessThanOrEqual(viewport.right + 1);
    await expectMonthAndFocusedDay();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(activeDate).toBe('2025-12-06');
    expect(month.textContent).toMatch(/December 2025/);
    await expectMonthAndFocusedDay();
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
    await expect.poll(activeDate).toBe('2025-11-28');
    expect(month.textContent).toMatch(/November 2025/);
    await expectMonthAndFocusedDay();
    await userEvent.keyboard('{Enter}{Escape}');
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());
    expect(picker.value).toBe('2025-11-04');

    const events: [string, string][] = [];
    for (const type of ['input', 'change']) {
      picker.addEventListener(type, () => events.push([type, picker.value]));
    }
    await userEvent.keyboard('{Enter}');
    await expect.poll(activeDate).toBe('2025-11-04');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(picker.value).toBe('2025-11-04');
    expect(events).toEqual([]);
    const pageScroll = doc.defaultView!.scrollY;
    const actions = ['Clear', 'Cancel', 'Apply'].map(name => app.getByRole('button', { name, exact: true }));
    for (const action of actions) {
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => picker.shadowRoot?.activeElement).toBe(action.element());
    }
    await expect.poll(() => dialog.element().getBoundingClientRect().bottom - actions[2].element().getBoundingClientRect().bottom)
      .toBeGreaterThanOrEqual(4);
    const scroller = dialog.element().getBoundingClientRect();
    for (const action of actions) {
      const bounds = action.element().getBoundingClientRect();
      expect(bounds.top).toBeGreaterThanOrEqual(scroller.top - 1);
      expect(bounds.bottom).toBeLessThanOrEqual(scroller.bottom + 1);
    }
    expect(doc.defaultView!.scrollY).toBe(pageScroll);
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());
    expect(picker.value).toBe('2025-11-05');
    expect(events).toEqual([['input', '2025-11-05'], ['change', '2025-11-05']]);
  });

  test('keeps a programmed date when Apply follows a replaced open draft', async () => {
    const container = mount(`<form>
      <metro-calendar-date-picker label="Appointment" locale="en-US" name="appointment" value="2025-01-14" required></metro-calendar-date-picker>
    </form>`);
    const picker = container.querySelector('metro-calendar-date-picker')!;
    const form = container.querySelector('form')!;
    const trigger = page.getByRole('button', { name: /Appointment/ });
    const calendar = () => picker.shadowRoot!.querySelector('metro-calendar-view')!;
    const changes: string[] = [];
    picker.addEventListener('change', () => changes.push(picker.value));
    await trigger.click();
    await page.getByRole('button', { name: 'Wednesday, January 15, 2025' }).click();
    expect(calendar().value).toBe('2025-01-15');
    picker.defaultValue = '2025-02-02';
    await expect.poll(() => calendar().value).toBe('2025-02-02');
    picker.value = '2025-02-10';
    await expect.poll(() => calendar().value).toBe('2025-02-10');
    await page.getByRole('button', { name: 'Apply' }).click();
    expect(new FormData(form).get('appointment')).toBe('2025-02-10');
    expect(changes).toEqual([]);
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  });

  test('returns keyboard focus from a calendar with no available days when a date becomes available', async () => {
    const container = mount(`<metro-calendar-date-picker label="Appointment" value="2025-01-14"
      min="2025-01-14" max="2025-01-14" required></metro-calendar-date-picker>`);
    const picker = container.querySelector('metro-calendar-date-picker')!;
    const calendar = () => picker.shadowRoot!.querySelector('metro-calendar-view')!;
    const apply = page.getByRole('button', { name: 'Apply' });
    await page.getByRole('button', { name: /Appointment/ }).click();
    const focusedDay = () => calendar().shadowRoot?.activeElement?.getAttribute('data-date');
    await expect.poll(focusedDay).toBe('2025-01-14');
    picker.disabledDates = ['2025-01-14'];
    await expect.element(apply).toBeDisabled();
    expect(calendar().shadowRoot?.activeElement?.getAttribute('role')).toBe('grid');
    picker.disabledDates = [];
    await expect.element(apply).toBeEnabled();
    await expect.poll(focusedDay).toBe('2025-01-14');
  });

  test('stages a selection, restores focus on Escape, and submits a change only on Apply', async () => {
    const container = mount(`
      <form>
        <metro-calendar-date-picker label="Appointment" locale="en-US" name="appointment" value="2025-01-14" required></metro-calendar-date-picker>
      </form>
    `);
    const form = container.querySelector('form')!;
    const picker = container.querySelector('metro-calendar-date-picker')!;
    const trigger = page.getByRole('button', { name: /Appointment/ });
    const modal = page.getByRole('dialog', { name: 'Choose a date' });
    const calendar = () => picker.shadowRoot!.querySelector('metro-calendar-view')!;
    const focusedDate = () => (calendar().shadowRoot?.activeElement as HTMLElement)?.dataset.date;
    const events: [string, string][] = [];
    for (const name of ['input', 'change']) {
      form.addEventListener(name, event => {
        expect(event.target).toBe(picker);
        events.push([event.type, picker.value]);
      });
    }

    await userEvent.click(trigger);
    await expect.element(modal).toBeVisible();
    await expect.poll(focusedDate).toBe('2025-01-14');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await expect.poll(() => calendar().value).toBe('2025-01-15');
    expect(picker.value).toBe('2025-01-14');
    expect(new FormData(form).get('appointment')).toBe('2025-01-14');
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());
    expect(events).toEqual([]);

    await userEvent.click(trigger);
    await expect.poll(focusedDate).toBe('2025-01-14');
    await userEvent.click(page.getByRole('button', { name: 'Thursday, January 16, 2025' }));
    await userEvent.click(page.getByRole('button', { name: 'Apply' }));
    expect(picker.value).toBe('2025-01-16');
    expect(new FormData(form).get('appointment')).toBe('2025-01-16');
    expect(events).toEqual([['input', '2025-01-16'], ['change', '2025-01-16']]);
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());

    picker.value = '2025-02-10';
    expect(new FormData(form).get('appointment')).toBe('2025-02-10');
    form.reset();
    expect(picker.value).toBe('2025-01-14');
    expect(events).toHaveLength(2);
  });

  test('honors range and required constraints, an external label and a disabled fieldset', async () => {
    const container = mount(`
      <form>
        <fieldset>
          <label for="due">Due date</label>
          <metro-calendar-date-picker id="due" locale="en-US" name="due" min="2025-01-10" max="2025-01-31" required></metro-calendar-date-picker>
        </fieldset>
      </form>
    `);
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const picker = container.querySelector('metro-calendar-date-picker')!;
    const trigger = page.getByRole('button', { name: /Due date/ });
    await expect.element(trigger).toBeVisible();
    expect(picker.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);
    expect(picker.labels.length).toBe(1);
    await userEvent.click(page.getByText('Due date'));
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());

    picker.value = '2025-01-09';
    expect(picker.validity.rangeUnderflow).toBe(true);
    picker.value = '2025-02-01';
    expect(picker.validity.rangeOverflow).toBe(true);
    picker.value = '2025-01-12';
    expect(picker.checkValidity()).toBe(true);
    picker.disabledDates = ['2025-01-12'];
    await picker.updateComplete;
    expect(picker.validity.customError).toBe(true);

    picker.showPicker();
    await expect.element(page.getByRole('dialog')).toBeVisible();
    fieldset.disabled = true;
    await expect.element(trigger).toBeDisabled();
    expect(picker.open).toBe(false);
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).has('due')).toBe(false);
    fieldset.disabled = false;
    picker.required = false;
    await userEvent.click(trigger);
    await userEvent.click(page.getByRole('button', { name: 'Clear', exact: true }));
    expect(picker.value).toBe('');
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).get('due')).toBe('');
  });
});
