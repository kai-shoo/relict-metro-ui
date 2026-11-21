import { afterEach, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

let frame: HTMLIFrameElement;
function open() {
  frame = document.createElement('iframe');
  frame.title = 'Appearance settings';
  frame.src = '/examples/appearance/';
  frame.style.cssText = 'width:640px;height:680px;border:0';
  document.body.append(frame);
  return page.frameLocator(page.getByTitle(frame.title));
}
afterEach(() => {
  frame?.remove();
  localStorage.removeItem('metro-photo-appearance-v1');
});

test('keeps a numeric draft and caret when the system theme changes, and restores explicit settings on reload', async () => {
  const app = open();
  const input = app.getByRole('spinbutton', { name: 'Точная яркость, %' });
  const slider = app.getByRole('slider', { name: 'Яркость, %' });
  await expect.element(input).toHaveValue('100');
  const doc = () => frame.contentDocument!;
  try {
    await commands.setMetroMedia({ colorScheme: 'light' });
    await input.fill('170');
    const native = doc().querySelector('metro-number-box')!.shadowRoot!.querySelector('input')!;
    native.setSelectionRange(1, 2);
    await commands.setMetroMedia({ colorScheme: 'dark' });
    await expect.poll(() => frame.contentWindow!.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
    expect(native.matches(':focus')).toBe(true);
    expect([native.value, native.selectionStart, native.selectionEnd]).toEqual(['170', 1, 2]);
    await userEvent.keyboard('{Enter}');
    await expect.element(slider).toHaveValue('170');
    await app.getByRole('button', { name: 'Сохранить яркость' }).click();
    await app.getByRole('radio', { name: 'Светлая' }).click();
    expect(doc().documentElement.style.getPropertyValue('--metro-color-scheme')).toBe('light');
    frame.contentWindow!.location.reload();
    await expect.element(app.getByRole('radio', { name: 'Светлая' })).toBeChecked();
    await expect.element(input).toHaveValue('170');
    await input.fill('200');
    await userEvent.keyboard('{Enter}');
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    expect(doc().querySelector<HTMLElement>('#preview')!.style.filter).toBe('brightness(170%)');
    await app.getByRole('button', { name: 'Отменить правки' }).click();
    await expect.element(input).toHaveValue('170');
  } finally { await commands.setMetroMedia({ colorScheme: null }); }
});

test('a failed save retains the live preview and writes the same draft on retry', async () => {
  const app = open();
  const slider = app.getByRole('slider', { name: 'Яркость, %' });
  await expect.element(slider).toHaveValue('100');
  frame.contentDocument!.querySelector('metro-slider')!.focus();
  await userEvent.keyboard('{End}');
  await expect.element(app.getByRole('spinbutton')).toHaveValue('175');
  const storage = Object.getPrototypeOf(frame.contentWindow!.localStorage) as Storage;
  const setItem = storage.setItem;
  try {
    storage.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    await app.getByRole('button', { name: 'Сохранить яркость' }).click();
    await expect.element(app.getByRole('button', { name: 'Повторить запись' })).toBeVisible();
    expect(localStorage.getItem('metro-photo-appearance-v1')).toBeNull();
  } finally { storage.setItem = setItem; }
  await app.getByRole('button', { name: 'Повторить запись' }).click();
  expect(JSON.parse(localStorage.getItem('metro-photo-appearance-v1')!).brightness).toBe(175);
});
