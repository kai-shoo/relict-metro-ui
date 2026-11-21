import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/date-picker.js';
import '../src/time-picker.js';
import type { DateTimeControl } from '../src/date-time-control.js';

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

function observe(form: HTMLFormElement) {
  const events: Array<[string, string]> = [];
  for (const type of ['input', 'change']) {
    form.addEventListener(type, event => {
      const target = event.target as HTMLElement & { value: string };
      events.push([type, target.value]);
    });
  }
  return events;
}

afterEach(() => fixture?.remove());

test('DatePicker preserves ISO date strings and follows the native range, step, and required constraints', async () => {
  const container = mount(`<form>
    <metro-date-picker name="departure" label="Departure" lang="fr" min="2028-02-25" max="2028-03-06"
      value="2028-02-29" step="2" required></metro-date-picker>
  </form>`);
  const date = container.querySelector('metro-date-picker')!;
  const form = container.querySelector('form')!;
  const input = page.getByLabelText('Departure');
  await expect.element(input).toHaveAttribute('type', 'date');
  await expect.element(input).toHaveAttribute('lang', 'fr');
  expect(date.form).toBe(form);
  expect(date.step).toBe(2);
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get('departure')).toBe('2028-02-29');

  date.value = '2028-02-28';
  expect(date.validity.stepMismatch).toBe(true);
  date.value = '2028-03-07';
  expect(date.validity.rangeOverflow).toBe(true);
  date.value = '2028-02-24';
  expect(date.validity.rangeUnderflow).toBe(true);
  date.value = '2027-02-29';
  expect(date.value).toBe('');
  expect(date.validity.valueMissing).toBe(true);
  expect(new FormData(form).get('departure')).toBe('');
  form.reset();
  await expect.element(input).toHaveValue('2028-02-29');
  expect(form.checkValidity()).toBe(true);
});

test('DatePicker propagates user edits once, keeps its default separate, and resets without events', async () => {
  const container = mount(`<form>
    <label for="birthday">Birthday</label>
    <metro-date-picker id="birthday" name="birthday" value="2000-01-01" autocomplete="bday"></metro-date-picker>
  </form>`);
  const form = container.querySelector('form')!;
  const date = container.querySelector('metro-date-picker')!;
  const input = page.getByLabelText('Birthday');
  const events = observe(form);
  await expect.element(input).toHaveAttribute('autocomplete', 'bday');
  expect(date.labels.length).toBe(1);
  await userEvent.click(page.getByText('Birthday'));
  expect(date.shadowRoot!.activeElement).toBe(input.element());

  date.defaultValue = '2000-02-01';
  expect(date.value).toBe('2000-02-01');
  await input.fill('2000-03-01');
  expect(events).toEqual([['input', '2000-03-01'], ['change', '2000-03-01']]);
  date.defaultValue = '2000-04-01';
  expect(date.value).toBe('2000-03-01');
  expect(new FormData(form).get('birthday')).toBe('2000-03-01');
  date.value = '2000-05-01';
  await expect.element(input).toHaveValue('2000-05-01');
  form.reset();
  await expect.element(input).toHaveValue('2000-04-01');
  expect(events).toHaveLength(2);
});

test('TimePicker supports a stepped overnight range and respects disabled fieldsets', async () => {
  const container = mount(`<form><fieldset>
    <metro-time-picker name="handoff" min="22:00" max="02:00" step="30" value="01:00" required>
      <span slot="label">Handoff</span>
      <span slot="description">Local time</span>
    </metro-time-picker>
  </fieldset></form>`);
  const form = container.querySelector('form')!;
  const time = container.querySelector('metro-time-picker')!;
  const input = page.getByRole('textbox', { name: 'Handoff' });
  const events = observe(form);
  await expect.element(input).toHaveAttribute('type', 'time');
  await expect.element(input).toHaveAccessibleDescription('Local time');
  expect(form.checkValidity()).toBe(true);
  await input.fill('23:10:30');
  expect(events).toEqual([['input', '23:10:30'], ['change', '23:10:30']]);
  expect(new FormData(form).get('handoff')).toBe('23:10:30');
  expect(form.checkValidity()).toBe(true);

  time.value = '23:10:20';
  expect(time.validity.stepMismatch).toBe(true);
  time.step = 'any';
  expect(form.checkValidity()).toBe(true);
  time.value = '12:00';
  expect(time.validity.valid).toBe(false);
  const fieldset = container.querySelector('fieldset')!;
  fieldset.disabled = true;
  await expect.element(input).toBeDisabled();
  expect(time.disabled).toBe(false);
  expect(new FormData(form).has('handoff')).toBe(false);
  fieldset.disabled = false;
  form.reset();
  await expect.element(input).toHaveValue('01:00');
  expect(events).toHaveLength(2);
});

test('Date and time support readonly submission and report custom validity through the form', async () => {
  const container = mount(`<form>
    <p id="arrival-label">Arrival</p>
    <metro-time-picker name="arrival" aria-labelledby="arrival-label" value="10:30" readonly></metro-time-picker>
    <metro-date-picker aria-label="Travel date" name="date"></metro-date-picker>
  </form>`);
  const form = container.querySelector('form')!;
  const time = container.querySelector('metro-time-picker')!;
  const date = container.querySelector('metro-date-picker')!;
  const input = page.getByRole('textbox', { name: 'Arrival' });
  await expect.element(input).toHaveAttribute('readonly');
  expect(time.step).toBe(60);
  expect(date.step).toBe(1);
  expect(time.willValidate).toBe(false);
  expect(new FormData(form).get('arrival')).toBe('10:30');
  date.setCustomValidity('Choose a later date.');
  expect(form.checkValidity()).toBe(false);
  expect(date.validationMessage).toBe('Choose a later date.');
  date.setCustomValidity('');
  expect(form.checkValidity()).toBe(true);
});

test.each([['date', '2030-08-19'], ['time', '13:45']])('Dismissing the native %s picker preserves the committed value', async (type, value) => {
  const container = mount(`<form>
    <metro-${type}-picker name="arrival" label="Arrival" value="${value}"></metro-${type}-picker>
    <button type="button">Open picker</button>
  </form>`);
  const form = container.querySelector('form')!;
  const picker = container.querySelector<DateTimeControl>(`metro-${type}-picker`)!;
  const open = container.querySelector('button')!;
  const events = observe(form);
  let error: unknown;
  open.addEventListener('click', () => {
    try { picker.showPicker(); } catch (exception) { error = exception; }
  });
  await expect.element(page.getByLabelText('Arrival')).toHaveValue(value);
  expect(typeof picker.shadowRoot!.querySelector('input')!.showPicker).toBe('function');
  await userEvent.click(page.getByRole('button', { name: 'Open picker' }));
  await userEvent.keyboard('{Escape}');
  expect(error).toBeUndefined();
  expect(events).toEqual([]);
  expect(new FormData(form).get('arrival')).toBe(value);
});
