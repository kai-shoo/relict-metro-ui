import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/repeat-button.js';
import '../src/split-button.js';
import '../src/toggle-button.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.buttonVariantsTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

function repeatFixture() {
  const host = fixture(`
    <metro-repeat-button delay="64" interval="24">Increase</metro-repeat-button>
    <button type="button" style="position:fixed;bottom:2rem;right:2rem">Outside</button>
  `);
  const control = host.querySelector('metro-repeat-button')!;
  const trigger = page.getByRole('button', { name: 'Increase' });
  const outside = page.getByRole('button', { name: 'Outside' });
  const activations: boolean[] = [];
  host.addEventListener('metro-activate', event => activations.push(event.detail.repeat));
  return { control, trigger, outside, activations };
}

function wait(milliseconds = 100) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

afterEach(() => document.querySelectorAll('[data-button-variants-test]').forEach(node => node.remove()));

it('returns focus to the primary action after an open split menu runs out of commands', async () => {
  const host = fixture('<metro-split-button label="Share" menu-label="Share options"></metro-split-button>');
  const split = host.querySelector('metro-split-button')!;
  split.commands = [{ id: 'copy', label: 'Copy link' }];
  const commands: string[] = [];
  split.addEventListener('metro-command', event => commands.push(event.detail.id));
  const trigger = page.getByRole('button', { name: 'Share options' });
  await trigger.click();
  await expect.element(page.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  split.commands = [];
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(split.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Share', exact: true }).element());
  expect(commands).toEqual([]);
  await userEvent.keyboard('{Enter}');
  expect(commands).toEqual(['primary']);
});

it('returns focus to an explicit fallback if a dropdown is disabled while open', async () => {
  const host = fixture(`<button type="button">Message list</button>
    <metro-drop-down-button label="Commands"></metro-drop-down-button>`);
  const list = host.querySelector('button')!;
  const dropdown = host.querySelector('metro-drop-down-button')!;
  dropdown.returnFocus = list;
  dropdown.commands = [{ id: 'open', label: 'Open' }];
  const trigger = page.getByRole('button', { name: 'Commands' });
  await trigger.click();
  await expect.element(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
  dropdown.disabled = true;
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(list);
});

it('keeps the split menu usable through command replacement and continues the page Tab order', async () => {
  const host = fixture(`
    <button type="button">Before actions</button>
    <metro-split-button label="Export" menu-label="Export options"></metro-split-button>
    <button type="button">After actions</button>
  `);
  const split = host.querySelector('metro-split-button')!;
  const trigger = page.getByRole('button', { name: 'Export options' });
  const primary = page.getByRole('button', { name: 'Export', exact: true });
  const after = page.getByRole('button', { name: 'After actions' });
  const events: string[] = [];
  split.addEventListener('metro-command', event => events.push(event.detail.id));
  split.commands = [{ id: 'csv', label: 'CSV' }, { id: 'pdf', label: 'PDF' }];
  await expect.element(trigger).toBeEnabled();
  (trigger.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{ArrowDown}{End}');
  const menu = split.shadowRoot!.querySelector('metro-menu-flyout')!;
  expect(menu.shadowRoot!.activeElement).toBe(page.getByRole('menuitem', { name: 'PDF' }).element());
  split.commands = [{ id: 'csv', label: 'CSV', disabled: true }, { id: 'text', label: 'Plain text' }];
  const text = page.getByRole('menuitem', { name: 'Plain text' });
  await expect.element(text).toBeVisible();
  expect(menu.shadowRoot!.activeElement).toBe(text.element());
  await userEvent.tab();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect.element(after).toHaveFocus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}{ArrowDown}');
  await expect.element(text).toBeVisible();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(split.shadowRoot!.activeElement).toBe(primary.element());
  expect(events).toEqual([]);
});

it.each(['metro-drop-down-button', 'metro-split-button'] as const)('honors show and close before %s first renders', async tag => {
  const host = fixture('');
  const control = document.createElement(tag);
  control.label = 'Save';
  control.menuLabel = 'Save options';
  control.commands = [{ id: 'local', label: 'Save locally' }];
  host.append(control);
  control.show();
  const trigger = page.getByRole('button', { name: tag === 'metro-split-button' ? 'Save options' : 'Save', exact: true });
  const item = page.getByRole('menuitem', { name: 'Save locally' });
  await expect.element(item).toBeVisible();
  const menu = control.shadowRoot!.querySelector('metro-menu-flyout')!;
  expect(menu.shadowRoot!.activeElement).toBe(item.element());
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  control.close();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(control.shadowRoot!.activeElement).toBe(trigger.element());

  control.remove();
  const cancelled = document.createElement(tag);
  cancelled.commands = [{ id: 'local', label: 'Save locally' }];
  host.append(cancelled);
  cancelled.show();
  cancelled.close();
  await cancelled.updateComplete;
  expect(cancelled.open).toBe(false);
  await expect.element(item).not.toBeInTheDocument();
});

it.each(['ltr', 'rtl'])('keeps the split trigger arrow centered and the two buttons inside the host in %s', async direction => {
  const host = fixture(`<metro-split-button dir="${direction}" style="inline-size:240px"
    label="Переподключение" menu-label="Действия"></metro-split-button>`);
  const split = host.querySelector('metro-split-button')!;
  split.commands = [{ id: 'retry', label: 'Повторить' }];
  await split.updateComplete;
  const root = document.documentElement;
  const original = root.style.fontSize;
  root.style.fontSize = '200%';
  try {
    const control = split.getBoundingClientRect();
    const primary = split.shadowRoot!.querySelector('[part="primary"]')!.getBoundingClientRect();
    const trigger = split.shadowRoot!.querySelector('[part="trigger"]')!.getBoundingClientRect();
    const arrow = split.shadowRoot!.querySelector('[part="indicator"]')!.getBoundingClientRect();
    expect(trigger.width).toBeCloseTo(48, 0);
    expect(Math.abs((arrow.top + arrow.bottom - trigger.top - trigger.bottom) / 2)).toBeLessThan(0.5);
    expect(Math.min(primary.left, trigger.left)).toBeGreaterThanOrEqual(control.left - 1);
    expect(Math.max(primary.right, trigger.right)).toBeLessThanOrEqual(control.right + 1);
    expect(direction === 'ltr' ? trigger.left - primary.right : primary.left - trigger.right).toBeCloseTo(0, 0);
  } finally {
    root.style.fontSize = original;
  }
});

describe('metro-toggle-button', () => {
  it('keeps its accessible name, reflects pressed state and emits input/change only on activation', async () => {
    const host = fixture(`
      <metro-toggle-button label="Bold" checked style="--metro-accent: #e81123">
        <span aria-hidden="true">B</span>
      </metro-toggle-button>
    `);
    const control = host.querySelector('metro-toggle-button')!;
    const trigger = page.getByRole('button', { name: 'Bold' });
    const changes: [string, boolean][] = [];
    for (const type of ['input', 'change']) {
      host.addEventListener(type, event => changes.push([event.type, control.checked]));
    }

    await expect.element(trigger).toHaveAttribute('aria-pressed', 'true');
    expect(getComputedStyle(trigger.element()).backgroundColor).toBe('rgb(232, 17, 35)');
    control.checked = false;
    await expect.element(trigger).toHaveAttribute('aria-pressed', 'false');
    expect(control.hasAttribute('checked')).toBe(false);
    expect(changes).toEqual([]);

    control.focus();
    await userEvent.keyboard('[Space]');
    await expect.element(trigger).toHaveAttribute('aria-pressed', 'true');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-pressed', 'false');
    expect(changes).toEqual([['input', true], ['change', true], ['input', false], ['change', false]]);

    control.disabled = true;
    await expect.element(trigger).toBeDisabled();
    control.click();
    expect(changes).toHaveLength(4);
  });
});

describe('metro-repeat-button', () => {
  it('activates once for a tap, a quick key press, or a programmatic click', async () => {
    const { control, trigger, activations } = repeatFixture();
    control.delay = 1000;
    await trigger.click();
    await userEvent.keyboard('{Enter}[Space]');
    control.click();
    expect(activations).toEqual([false, false, false, false]);
  });

  it('repeats a trusted mouse hold and consumes the release click', async () => {
    const { control, trigger, activations } = repeatFixture();
    const user = userEvent.setup();
    let clicks = 0;
    control.addEventListener('click', () => clicks++);

    try {
      await user.pointer({ target: trigger, keys: '[MouseLeft>]' });
      await expect.poll(() => activations.length).toBeGreaterThanOrEqual(2);
    } finally {
      await user.pointer({ target: trigger, keys: '[/MouseLeft]' });
    }

    const stoppedAt = activations.length;
    await wait();
    expect(activations).toEqual(Array(stoppedAt).fill(true));
    expect(clicks).toBe(0);
    await trigger.click();
    expect(activations.at(-1)).toBe(false);
    expect(clicks).toBe(1);
  });

  it.each(['Enter', 'Space'])('repeats a %s hold without a second activation on release', async key => {
    const { control, activations } = repeatFixture();
    const user = userEvent.setup();
    await control.updateComplete;
    control.focus();

    try {
      await user.keyboard(`[${key}>2]`);
      await expect.poll(() => activations.length).toBeGreaterThanOrEqual(2);
    } finally {
      await user.keyboard(`[/${key}]`);
    }

    const stoppedAt = activations.length;
    await wait();
    expect(activations).toEqual(Array(stoppedAt).fill(true));
  });

  it('cancels a mouse hold when the pointer leaves, even if it re-enters before release', async () => {
    const { trigger, outside, activations } = repeatFixture();
    const user = userEvent.setup();
    await expect.element(trigger).toBeVisible();
    const center = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };
    const insidePoint = center(trigger.element());
    const outsidePoint = center(outside.element());

    try {
      await user.pointer({ coords: insidePoint, keys: '[MouseLeft>]' });
      await expect.poll(() => activations.length).toBeGreaterThan(0);
      await user.pointer({ coords: outsidePoint });
      const stoppedAt = activations.length;
      await user.pointer({ coords: insidePoint });
      await wait();
      expect(activations).toHaveLength(stoppedAt);
    } finally {
      await user.pointer({ coords: insidePoint, keys: '[/MouseLeft]' });
    }

    expect(activations.every(value => value)).toBe(true);
  });

  it.each(['blur', 'disabled', 'disconnect'])('stops a key hold on %s', async reason => {
    const { control, outside, activations } = repeatFixture();
    const user = userEvent.setup();
    await control.updateComplete;
    control.focus();

    try {
      await user.keyboard('{Enter>}');
      await expect.poll(() => activations.length).toBeGreaterThan(0);
      if (reason === 'blur') (outside.element() as HTMLButtonElement).focus();
      else if (reason === 'disabled') control.disabled = true;
      else control.remove();
      const stoppedAt = activations.length;
      await wait();
      expect(activations).toHaveLength(stoppedAt);
    } finally {
      await user.keyboard('{/Enter}');
    }

    expect(activations.every(value => value)).toBe(true);
  });

  it('does not start repeating from synthetic keydown or pointerdown', async () => {
    const { control, trigger, activations } = repeatFixture();
    await control.updateComplete;
    const button = trigger.element();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true, pointerId: 7 }));
    await wait();
    expect(activations).toEqual([]);
  });
});
