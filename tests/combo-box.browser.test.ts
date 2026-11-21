import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/combo-box.js';
import '../src/list-picker.js';

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

describe('Metro combo box', () => {
  test.each(['ltr', 'rtl'])('ComboBox and ListPicker center their arrows at the trailing edge in %s', async direction => {
    const container = mount(`<div dir="${direction}" style="inline-size: 220px">
      <metro-combo-box label="Folder" style="display:block"><metro-option value="a">Archive</metro-option></metro-combo-box>
      <metro-list-picker label="Category" value="a" style="display:block">
        <metro-option value="a">A long category label with several words</metro-option>
      </metro-list-picker>
    </div>`);
    const combo = container.querySelector('metro-combo-box')!;
    const picker = container.querySelector('metro-list-picker')!;
    await Promise.all([combo.updateComplete, picker.updateComplete]);
    for (const [field, indicator] of [[combo, '[part="indicator"]'], [picker, '.chevron']] as const) {
      const control = field.shadowRoot!.querySelector('select, .trigger')!.getBoundingClientRect();
      const arrow = field.shadowRoot!.querySelector(indicator)!.getBoundingClientRect();
      const trailingGap = direction === 'ltr' ? control.right - arrow.right : arrow.left - control.left;
      expect(trailingGap).toBeGreaterThan(10);
      expect(trailingGap).toBeLessThan(20);
      expect((arrow.top + arrow.bottom) / 2).toBeCloseTo((control.top + control.bottom) / 2, 0);
    }
  });

  test('uses native keyboard selection, skips disabled choices and emits a single event pair', async () => {
    const container = mount(`
      <form>
        <metro-combo-box name="density" value="relaxed">
          <span slot="label">Mail density</span>
          <metro-option value="relaxed">Relaxed</metro-option>
          <metro-option value="normal" disabled>Normal</metro-option>
          <metro-option value="compact" label="Compact"></metro-option>
          <metro-option value="dense">Dense</metro-option>
        </metro-combo-box>
      </form>
    `);
    const form = container.querySelector('form')!;
    const combo = container.querySelector('metro-combo-box')!;
    const control = page.getByRole('combobox', { name: 'Mail density' });
    await expect.element(control).toHaveValue('relaxed');
    expect(control.element()).toBeInstanceOf(HTMLSelectElement);

    const observed: [string, string][] = [];
    for (const type of ['input', 'change']) {
      form.addEventListener(type, event => {
        expect(event.target).toBe(combo);
        observed.push([event.type, combo.value]);
      });
    }

    combo.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(control).toHaveValue('compact');
    expect(new FormData(form).get('density')).toBe('compact');
    expect(observed).toEqual([['input', 'compact'], ['change', 'compact']]);

    combo.value = 'dense';
    expect(new FormData(form).get('density')).toBe('dense');
    await expect.element(control).toHaveValue('dense');
    form.reset();
    expect(combo.value).toBe('relaxed');
    expect(combo.defaultValue).toBe('relaxed');
    await expect.element(control).toHaveValue('relaxed');
    expect(observed).toEqual([['input', 'compact'], ['change', 'compact']]);
  });

  test('associates an external label and validates an empty choice in its form', async () => {
    const container = mount(`
      <form id="profile"></form>
      <fieldset>
        <label for="folder">Archive folder</label>
        <metro-combo-box id="folder" name="folder" form="profile" placeholder="Choose a folder" required>
          <metro-option value="local">Local</metro-option>
          <metro-option value="server">Server</metro-option>
        </metro-combo-box>
      </fieldset>
    `);
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const combo = container.querySelector('metro-combo-box')!;
    const control = page.getByRole('combobox', { name: 'Archive folder' });
    await expect.element(control).toHaveValue('');
    expect(combo.form).toBe(form);
    expect(combo.labels.length).toBe(1);
    expect(combo.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);
    expect(new FormData(form).has('folder')).toBe(false);

    await userEvent.click(page.getByText('Archive folder'));
    await expect.poll(() => combo.shadowRoot?.activeElement).toBe(control.element());
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(control).toHaveValue('local');
    expect(form.checkValidity()).toBe(true);
    combo.setCustomValidity('Choose the server for this account.');
    expect(combo.validationMessage).toBe('Choose the server for this account.');

    fieldset.disabled = true;
    await expect.element(control).toBeDisabled();
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).has('folder')).toBe(false);
    fieldset.disabled = false;
    combo.setCustomValidity('');
    await expect.element(control).toBeEnabled();
    expect(new FormData(form).get('folder')).toBe('local');
  });

  test('keeps explicit selections by stable keys when options change', async () => {
    const container = mount(`
      <form>
        <span id="mail-folder-label">Mail folder</span>
        <metro-combo-box aria-labelledby="mail-folder-label" name="folder" value="server" required>
          <metro-option value="local">Local</metro-option>
          <metro-option value="server">Server</metro-option>
          <metro-option value="local">Duplicate local</metro-option>
        </metro-combo-box>
      </form>
    `);
    const combo = container.querySelector('metro-combo-box')!;
    const form = container.querySelector('form')!;
    const option = combo.querySelector('metro-option[value="server"]')!;
    const control = page.getByRole('combobox', { name: 'Mail folder' });
    await expect.element(control).toHaveValue('server');
    expect((control.element() as HTMLSelectElement).options.length).toBe(3);
    const changes: string[] = [];
    combo.addEventListener('change', () => changes.push(combo.value));

    option.remove();
    await expect.element(control).toHaveValue('');
    expect(new FormData(form).has('folder')).toBe(false);
    expect(combo.checkValidity()).toBe(false);

    combo.prepend(option);
    await expect.element(control).toHaveValue('server');
    option.disabled = true;
    await expect.element(control).toHaveValue('');
    combo.value = 'unlisted';
    expect(combo.value).toBe('');
    combo.value = 'local';
    expect(new FormData(form).get('folder')).toBe('local');
    expect(changes).toEqual([]);
  });

  test('starts at the first enabled option unless an empty choice was requested', async () => {
    const container = mount(`
      <metro-combo-box label="Status" empty-label="No statuses">
        <metro-option value="draft" disabled>Draft</metro-option>
      </metro-combo-box>
    `);
    const combo = container.querySelector('metro-combo-box')!;
    const control = page.getByRole('combobox', { name: 'Status' });
    await expect.element(control).toHaveValue('');
    expect((control.element() as HTMLSelectElement).selectedOptions[0]?.label).toBe('No statuses');

    const next = document.createElement('metro-option');
    next.value = 'ready';
    next.label = 'Ready';
    combo.append(next);
    await expect.element(control).toHaveValue('ready');
    combo.placeholder = 'Choose a status';
    await expect.element(control).toHaveValue('');
    expect((control.element() as HTMLSelectElement).selectedOptions[0]?.label).toBe('Choose a status');
  });
});
