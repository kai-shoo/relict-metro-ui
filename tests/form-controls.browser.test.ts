import { afterEach, describe, expect, test } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/checkbox.js';
import '../src/radio-group.js';
import '../src/toggle-switch.js';

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

describe('Metro checkbox', () => {
  test('uses an associated label and participates in native form validation and reset', async () => {
    const container = mount(`
      <form>
        <label for="digest">Email digest</label>
        <metro-checkbox id="digest" name="digest" value="weekly" required></metro-checkbox>
      </form>
    `);
    const form = container.querySelector('form')!;
    const checkbox = container.querySelector('metro-checkbox')!;
    const control = page.getByRole('checkbox', { name: 'Email digest' });
    await expect.element(control).toBeVisible();

    expect(checkbox.form).toBe(form);
    expect(checkbox.labels.length).toBe(1);
    expect(form.checkValidity()).toBe(false);
    expect(checkbox.validity.valueMissing).toBe(true);

    const events: string[] = [];
    for (const type of ['input', 'change']) {
      form.addEventListener(type, () => events.push(type));
    }
    await userEvent.click(page.getByText('Email digest'));
    expect(checkbox.checked).toBe(true);
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).get('digest')).toBe('weekly');
    expect(events).toEqual(['input', 'change']);

    checkbox.name = 'newsletter';
    checkbox.value = 'yes';
    expect(new FormData(form).get('newsletter')).toBe('yes');
    form.reset();
    await expect.element(control).not.toBeChecked();
    expect(new FormData(form).has('newsletter')).toBe(false);
    expect(events).toEqual(['input', 'change']);
  });

  test('Space clears a mixed mark and updates checked once', async () => {
    const container = mount('<metro-checkbox indeterminate>All messages</metro-checkbox>');
    const checkbox = container.querySelector('metro-checkbox')!;
    const control = page.getByRole('checkbox', { name: 'All messages' });
    await expect.element(control).toBeVisible();

    const native = checkbox.shadowRoot!.querySelector('input')!;
    expect(native.indeterminate).toBe(true);
    checkbox.focus();
    await userEvent.keyboard(' ');
    await expect.element(control).toBeChecked();
    expect(checkbox.indeterminate).toBe(false);
    expect(checkbox.defaultChecked).toBe(false);
  });
});

test.each(['light', 'dark'])('checkbox and radio preserve Phone 8 indicator geometry in the %s theme', async theme => {
  const container = mount(`
    <metro-checkbox data-metro-theme="${theme}" indeterminate>All messages</metro-checkbox>
    <metro-radio-group data-metro-theme="${theme}" label="Density" value="normal">
      <metro-radio value="normal">Normal</metro-radio>
      <metro-radio value="dense">Dense</metro-radio>
    </metro-radio-group>
  `);
  const checkbox = container.querySelector('metro-checkbox')!;
  const group = container.querySelector('metro-radio-group')!;
  await expect.element(page.getByRole('checkbox', { name: 'All messages' })).toBeVisible();
  await expect.element(page.getByRole('radio', { name: 'Normal' })).toBeChecked();

  for (const [component, markPart] of [[checkbox, 'mixed'], [group, 'dot']] as const) {
    const indicator = component.shadowRoot!.querySelector('[part="indicator"]')!;
    const mark = indicator.querySelector(`[part="${markPart}"]`)!;
    const label = indicator.nextElementSibling!;
    const box = indicator.getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    const style = getComputedStyle(indicator);
    expect([box.width, box.height, markBox.width, markBox.height]).toEqual([32, 32, 16, 16]);
    expect(label.getBoundingClientRect().left - box.right).toBeCloseTo(12, 1);
    expect(style.borderTopWidth).toBe('3px');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const foreground = style.borderTopColor;
    expect(foreground).toBe(getComputedStyle(mark).backgroundColor);

    component.disabled = true;
    await component.updateComplete;
    expect(style.borderTopColor).not.toBe(foreground);
    expect(style.borderTopColor).toBe(getComputedStyle(label).color);
    expect(style.borderTopColor).toBe(getComputedStyle(mark).backgroundColor);
  }
});

test('Metro switch reflects its state in accessible input and respects disabled fieldsets', async () => {
  const container = mount(`
    <form>
      <fieldset>
        <metro-toggle-switch name="sync" label="Background sync" value="enabled"
          on-label="Enabled" off-label="Disabled" checked></metro-toggle-switch>
      </fieldset>
    </form>
  `);
  const form = container.querySelector('form')!;
  const fieldset = container.querySelector('fieldset')!;
  const toggle = container.querySelector('metro-toggle-switch')!;
  const control = page.getByRole('switch', { name: 'Background sync' });
  await expect.element(control).toBeChecked();
  expect(new FormData(form).get('sync')).toBe('enabled');

  const events: boolean[] = [];
  toggle.addEventListener('change', () => events.push(toggle.checked));
  await userEvent.click(control);
  await expect.element(control).not.toBeChecked();
  expect(events).toEqual([false]);
  expect(new FormData(form).has('sync')).toBe(false);

  form.reset();
  await expect.element(control).toBeChecked();
  fieldset.disabled = true;
  await expect.element(control).toBeDisabled();
  expect(toggle.disabled).toBe(false);
  expect(new FormData(form).has('sync')).toBe(false);
  fieldset.disabled = false;
  await expect.element(control).toBeEnabled();
  expect(new FormData(form).get('sync')).toBe('enabled');
  expect(events).toEqual([false]);
});

test('Metro switch preserves readable labels in a narrow container at 200% text', async () => {
  const fixture = mount(`
    <metro-toggle-switch style="inline-size: 241px" label="Подписи к фотографиям"
      on-label="Включены" off-label="Отключены" checked></metro-toggle-switch>
  `);
  const toggle = fixture.querySelector('metro-toggle-switch')!;
  await expect.element(page.getByRole('switch', { name: 'Подписи к фотографиям' })).toBeChecked();
  const bounds = (part: string) => toggle.shadowRoot!.querySelector(`[part="${part}"]`)!.getBoundingClientRect();
  expect(bounds('track').width).toBe(89);
  expect(bounds('track').height).toBe(34);

  const html = document.documentElement;
  const originalFontSize = html.style.fontSize;
  html.style.fontSize = '200%';
  try {
    const control = bounds('control');
    const label = bounds('label');
    const track = bounds('track');
    expect(label.width).toBeGreaterThan(120);
    expect(track.top).toBeGreaterThan(label.bottom);
    expect(track.right).toBeLessThan(control.right);
    expect(bounds('state').height).toBeLessThan(160);
  } finally {
    html.style.fontSize = originalFontSize;
  }
});

test('Metro switch commits a drag once and keeps its value on short drags', async () => {
  const container = mount('<metro-toggle-switch label="Bluetooth"></metro-toggle-switch>');
  const toggle = container.querySelector('metro-toggle-switch')!;
  const control = page.getByRole('switch', { name: 'Bluetooth' });
  await expect.element(control).toBeVisible();
  const track = toggle.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!;
  const bounds = track.getBoundingClientRect();
  const y = bounds.y + bounds.height / 2;
  const events: boolean[] = [];
  toggle.addEventListener('change', () => events.push(toggle.checked));

  await userEvent.pointer([
    { keys: '[MouseLeft>]', coords: { x: bounds.left + 4, y } },
    { coords: { x: bounds.left + 18, y } },
    '[/MouseLeft]',
  ]);
  expect(toggle.checked).toBe(false);
  expect(events).toEqual([]);

  await userEvent.pointer([
    { keys: '[MouseLeft>]', coords: { x: bounds.left + 4, y } },
    { coords: { x: bounds.right - 4, y } },
    '[/MouseLeft]',
  ]);
  expect(toggle.checked).toBe(true);
  expect(events).toEqual([true]);

  await userEvent.click(control);
  expect(toggle.checked).toBe(false);
  expect(events).toEqual([true, false]);
});

test.each(['property', 'reset', 'disable'] as const)('Metro switch discards a drag interrupted by %s', async interruption => {
  const container = mount('<form><fieldset><metro-toggle-switch label="Bluetooth"></metro-toggle-switch></fieldset></form>');
  const toggle = container.querySelector('metro-toggle-switch')!;
  const control = page.getByRole('switch', { name: 'Bluetooth' });
  await expect.element(control).toBeVisible();
  const track = toggle.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!;
  const bounds = track.getBoundingClientRect();
  const y = bounds.y + bounds.height / 2;
  const changes: boolean[] = [];
  toggle.addEventListener('change', () => changes.push(toggle.checked));

  await userEvent.pointer([
    { keys: '[MouseLeft>]', coords: { x: bounds.left + 4, y } },
    { coords: { x: bounds.right - 4, y } },
  ]);
  try {
    expect(track.hasAttribute('data-dragging')).toBe(true);
    if (interruption === 'property') toggle.checked = false;
    if (interruption === 'reset') container.querySelector('form')!.reset();
    if (interruption === 'disable') {
      const fieldset = container.querySelector('fieldset')!;
      fieldset.disabled = true;
      fieldset.disabled = false;
    }
    expect(track.hasAttribute('data-dragging')).toBe(false);
  } finally {
    await userEvent.pointer('[/MouseLeft]');
  }
  expect(toggle.checked).toBe(false);
  expect(changes).toEqual([]);
  await control.click();
  expect(changes).toEqual([true]);
});

interface SwitchTouchState {
  checked: boolean;
  changes: boolean[];
  scrollTop: number;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    toggleSwitchTouch(): Promise<{ horizontal: SwitchTouchState; vertical: SwitchTouchState }>;
  }
}

test.skipIf(server.browser !== 'chromium')('Metro switch recognizes an emulated horizontal touch drag and permits vertical scrolling', async () => {
  const { horizontal, vertical } = await commands.toggleSwitchTouch();
  expect(horizontal).toEqual({ checked: true, changes: [true], scrollTop: 0 });
  expect(vertical).toMatchObject({ checked: true, changes: [true] });
  expect(vertical.scrollTop).toBeGreaterThan(20);
});

describe('Metro radio group', () => {
  test('uses native arrow navigation, skips disabled options and keeps groups separate', async () => {
    const container = mount(`
      <form>
        <metro-radio-group name="density" label="Density" value="relaxed" required>
          <metro-radio value="relaxed" label="Relaxed"></metro-radio>
          <metro-radio value="spacious" label="Spacious" disabled></metro-radio>
          <metro-radio value="compact" label="Compact"></metro-radio>
        </metro-radio-group>
        <metro-radio-group name="theme" value="system">
          <span slot="label">Theme</span>
          <metro-radio value="system" label="System"></metro-radio>
          <metro-radio value="dark" label="Dark"></metro-radio>
        </metro-radio-group>
      </form>
    `);
    const form = container.querySelector('form')!;
    const density = container.querySelector('metro-radio-group')!;
    const group = page.getByRole('radiogroup', { name: 'Density' });
    await expect.element(group).toBeVisible();
    await expect.element(group.getByRole('radio', { name: 'Relaxed' })).toBeChecked();
    await expect.element(group.getByRole('radio', { name: 'Spacious' })).toBeDisabled();

    const input: string[] = [];
    const change: string[] = [];
    density.addEventListener('input', () => input.push(density.value));
    density.addEventListener('change', () => change.push(density.value));
    density.focus();
    await userEvent.keyboard('{ArrowDown}');
    const compact = group.getByRole('radio', { name: 'Compact' });
    await expect.element(compact).toBeChecked();
    await expect.poll(() => (compact.element().getRootNode() as ShadowRoot).activeElement).toBe(compact.element());
    expect([...new FormData(form)]).toEqual([['density', 'compact'], ['theme', 'system']]);
    expect(input).toEqual(['compact']);
    expect(change).toEqual(['compact']);

    await expect.element(page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'System' })).toBeChecked();
    form.reset();
    await expect.element(group.getByRole('radio', { name: 'Relaxed' })).toBeChecked();
    expect([...new FormData(form)]).toEqual([['density', 'relaxed'], ['theme', 'system']]);
    expect(change).toEqual(['compact']);
  });

  test('validates omitted choices, updates FormData and handles removed options', async () => {
    const container = mount(`
      <form>
        <metro-radio-group name="scope" label="Scope" required>
          <metro-radio value="local">Local</metro-radio>
          <metro-radio value="global">Global</metro-radio>
        </metro-radio-group>
      </form>
    `);
    const form = container.querySelector('form')!;
    const group = container.querySelector('metro-radio-group')!;
    await expect.element(page.getByRole('radio', { name: 'Local' })).toBeVisible();
    expect(form.checkValidity()).toBe(false);

    group.value = 'global';
    expect(new FormData(form).get('scope')).toBe('global');
    expect(group.checkValidity()).toBe(true);
    await expect.element(page.getByRole('radio', { name: 'Global' })).toBeChecked();
    group.querySelector('[value="global"]')!.remove();
    await expect.element(page.getByRole('radio', { name: 'Global' })).not.toBeInTheDocument();
    expect(group.value).toBe('');
    expect(new FormData(form).has('scope')).toBe(false);
    expect(form.checkValidity()).toBe(false);
  });
});
