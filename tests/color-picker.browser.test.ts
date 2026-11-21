import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
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

describe('Metro color picker', () => {
  test('keeps the collapsed HEX code on one line when the swatch must wrap at 200% text', async () => {
    const container = mount('<metro-color-picker label="Акцент" value="#0050ef" style="width:241px"></metro-color-picker>');
    const picker = container.querySelector('metro-color-picker')!;
    const size = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '200%';
    try {
      await picker.updateComplete;
      const trigger = page.getByRole('button', { name: /Акцент.*#0050ef/ });
      const button = trigger.element();
      const value = picker.shadowRoot!.querySelector('[part="value"]')!;
      const sample = picker.shadowRoot!.querySelector('[part="sample"]')!;
      const text = document.createRange();
      text.selectNodeContents(value);
      const lines = Array.from(text.getClientRects());
      const bounds = button.getBoundingClientRect();
      expect(new Set(lines.map(line => line.y)).size).toBe(1);
      expect(text.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
      expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
      expect(text.getBoundingClientRect().top).toBeGreaterThanOrEqual(sample.getBoundingClientRect().bottom);
      picker.style.width = '460px';
      const swatchBounds = sample.getBoundingClientRect();
      const textBounds = value.getBoundingClientRect();
      expect(textBounds.top + textBounds.height / 2).toBeCloseTo(swatchBounds.top + swatchBounds.height / 2, 0);
      expect(textBounds.left).toBeGreaterThan(swatchBounds.right);
      await userEvent.click(trigger);
      await expect.element(page.getByRole('dialog')).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
      expect(picker.shadowRoot?.activeElement).toBe(button);
    } finally {
      document.documentElement.style.fontSize = size;
    }
  });

  test('fits the full HEX and RGB values at double text size on a narrow viewport', async () => {
    const container = mount('<iframe title="Phone color picker" style="width:320px;height:460px;border:0"></iframe>');
    const frame = container.querySelector('iframe')!;
    const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
    frame.srcdoc = `<!doctype html><html lang="ru" style="font-size:200%">
      <meta charset="utf-8"><script type="module" src="/src/color-picker.ts"></script>
      <metro-color-picker label="Акцент" value="#abcdef" red-label="Красный" green-label="Зелёный"
        blue-label="Синий" apply-label="Применить" cancel-label="Отмена"></metro-color-picker>`;
    await loaded;
    const phone = page.frameLocator(page.getByTitle('Phone color picker'));
    const trigger = phone.getByRole('button', { name: /Акцент/ });
    await trigger.click();
    const hex = phone.getByRole('textbox', { name: 'HEX', exact: true });
    await expect.element(hex).toHaveValue('#abcdef');
    const picker = frame.contentDocument!.querySelector('metro-color-picker')!;
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(hex.element());
    const channels = phone.getByRole('spinbutton');
    const view = frame.contentWindow!;
    const text = view.document.createElement('canvas').getContext('2d')!;
    for (const input of [hex.element(), ...channels.elements()]) {
      const style = view.getComputedStyle(input);
      text.font = `${style.fontSize} ${style.fontFamily}`;
      const width = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      expect(width).toBeGreaterThanOrEqual(text.measureText((input as HTMLInputElement).value).width);
    }
    await userEvent.keyboard('{Tab}{Tab}{Tab}');
    expect(picker.shadowRoot?.activeElement).toBe(phone.getByRole('spinbutton', { name: 'Синий' }).element());
    await userEvent.keyboard('{Tab}{Tab}{Tab}');
    expect(picker.shadowRoot?.activeElement).toBe(phone.getByRole('button', { name: 'Применить' }).element());
    await userEvent.keyboard('{Escape}');
    await expect.element(phone.getByRole('dialog')).not.toBeInTheDocument();
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  });

  test('scrolls the initially focused HEX editor into view in a short dialog', async () => {
    const container = mount(`
      <style>metro-color-picker::part(dialog) { max-block-size: 220px; inline-size: 240px; }</style>
      <metro-color-picker label="Accent color" value="#123456"></metro-color-picker>
    `);
    const picker = container.querySelector('metro-color-picker')!;
    picker.palette = Array.from({ length: 18 }, (_, index) => ({
      value: `#0000${index.toString(16).padStart(2, '0')}`,
      label: `Blue ${index}`,
    }));
    const trigger = page.getByRole('button', { name: /Accent color/ });
    await expect.element(trigger).toBeInViewport();
    const pageTop = window.scrollY;
    await trigger.click();
    const hex = page.getByRole('textbox', { name: 'HEX', exact: true });
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(hex.element());
    const dialog = page.getByRole('dialog').element();
    const frame = dialog.getBoundingClientRect();
    const field = hex.element().getBoundingClientRect();
    expect(field.top).toBeGreaterThanOrEqual(frame.top - 1);
    expect(field.bottom).toBeLessThanOrEqual(frame.bottom + 1);
    expect(window.scrollY).toBe(pageTop);
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());
    expect(picker.value).toBe('#123456');
  });

  test.each([
    { theme: 'light', background: '#00000026', text: '#000000de' },
    { theme: 'dark', background: '#ffffffbf', text: '#000' },
  ])('keeps unfocused color channels readable in $theme', async ({ theme, background, text }) => {
    const container = mount(`
      <metro-color-picker label="Page color" style="--metro-color-scheme:${theme}" value="#abc"></metro-color-picker>
      <span style="background-color:${background}; color:${text}"></span>
    `);
    await userEvent.click(page.getByRole('button', { name: /Page color/ }));
    const channel = page.getByRole('spinbutton', { name: 'Red' });
    await expect.element(channel).toHaveValue(170);
    const reference = getComputedStyle(container.querySelector('span')!);
    const styles = getComputedStyle(channel.element());
    expect(styles.backgroundColor).toBe(reference.backgroundColor);
    expect(styles.color).toBe(reference.color);
  });

  test('syncs HEX and RGB drafts and commits only after keyboard confirmation', async () => {
    const container = mount(`
      <form><metro-color-picker label="Page color" name="tint" value="#ABC"></metro-color-picker></form>
    `);
    const picker = container.querySelector('metro-color-picker')!;
    const form = container.querySelector('form')!;
    const trigger = page.getByRole('button', { name: /Page color/ });
    const hex = page.getByRole('textbox', { name: 'HEX' });
    const events: [string, string][] = [];
    for (const type of ['input', 'change']) form.addEventListener(type, event => {
      expect(event.target).toBe(picker);
      events.push([event.type, picker.value]);
    });
    expect(new FormData(form).get('tint')).toBe('#aabbcc');
    await userEvent.click(trigger);
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(hex.element());
    await userEvent.fill(hex, '#123456');
    await expect.element(page.getByRole('spinbutton', { name: 'Red' })).toHaveValue(18);
    await expect.element(page.getByRole('spinbutton', { name: 'Green' })).toHaveValue(52);
    await expect.element(page.getByRole('spinbutton', { name: 'Blue' })).toHaveValue(86);
    await expect.element(page.getByRole('img', { name: 'Color preview, #123456' })).toBeVisible();
    expect(events).toEqual([]);

    await userEvent.fill(hex, '#XYZ');
    await expect.element(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await expect.element(page.getByRole('status')).toHaveTextContent('Enter a 3- or 6-digit HEX color or RGB channels from 0 to 255.');
    await userEvent.keyboard('{Escape}');
    expect(new FormData(form).get('tint')).toBe('#aabbcc');
    expect(events).toEqual([]);
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());

    await userEvent.click(trigger);
    await expect.element(hex).toHaveValue('#aabbcc');
    await userEvent.fill(hex, '#123456');
    await userEvent.keyboard('{Enter}');
    expect(new FormData(form).get('tint')).toBe('#123456');
    expect(events).toEqual([['input', '#123456'], ['change', '#123456']]);
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(trigger.element());

    picker.value = 'def';
    expect(picker.value).toBe('#ddeeff');
    form.reset();
    expect(picker.value).toBe('#aabbcc');
    expect(events).toHaveLength(2);
  });

  test('uses native keyboard swatches and updates the preview from RGB edits', async () => {
    const container = mount('<metro-color-picker label="Ink shade" value="#001122"></metro-color-picker>');
    const picker = container.querySelector('metro-color-picker')!;
    picker.palette = [
      { value: '#001122', label: 'Night' },
      { value: '#eeeeee', label: 'Paper' },
      { value: '#EEE', label: 'Duplicate' },
      { value: 'invalid', label: 'Invalid' },
    ];
    const trigger = page.getByRole('button', { name: /Ink shade/ });
    const hex = page.getByRole('textbox', { name: 'HEX' });
    await userEvent.click(trigger);
    const palette = page.getByRole('radiogroup', { name: 'Accent colors' });
    const night = palette.getByRole('radio', { name: 'Night' });
    const paper = palette.getByRole('radio', { name: 'Paper' });
    await expect.element(night).toBeChecked();
    await expect.element(palette.getByRole('radio', { name: 'Duplicate' })).not.toBeInTheDocument();
    await userEvent.click(night);
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(paper).toBeChecked();
    await expect.element(hex).toHaveValue('#eeeeee');
    const red = page.getByRole('spinbutton', { name: 'Red' });
    await userEvent.fill(red, '256');
    await expect.element(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await expect.element(red).toHaveAttribute('aria-invalid', 'true');
    await userEvent.fill(red, '17');
    await expect.element(hex).toHaveValue('#11eeee');
    expect(picker.value).toBe('#001122');
    const apply = page.getByRole('button', { name: 'Apply' }).element() as HTMLButtonElement;
    apply.focus();
    expect(apply.matches(':focus')).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(picker.value).toBe('#11eeee');
  });

  test('respects external labels, required validation, clear and a disabled fieldset', async () => {
    const container = mount(`
      <form>
        <fieldset>
          <label for="tint">Accent color</label>
          <metro-color-picker id="tint" name="tint" required></metro-color-picker>
        </fieldset>
      </form>
    `);
    const picker = container.querySelector('metro-color-picker')!;
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const trigger = page.getByRole('button', { name: /Accent color/ });
    await expect.element(trigger).toBeVisible();
    expect(picker.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);
    await userEvent.click(page.getByText('Accent color'));
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());

    picker.value = '#c00';
    expect(form.checkValidity()).toBe(true);
    picker.showPicker();
    await expect.element(page.getByRole('dialog')).toBeVisible();
    fieldset.disabled = true;
    await expect.element(trigger).toBeDisabled();
    expect(picker.open).toBe(false);
    expect(new FormData(form).has('tint')).toBe(false);
    fieldset.disabled = false;
    picker.required = false;
    await userEvent.click(trigger);
    await userEvent.click(page.getByRole('button', { name: 'Clear' }));
    expect(picker.value).toBe('');
    expect(new FormData(form).get('tint')).toBe('');
    expect(form.checkValidity()).toBe(true);
  });
});
