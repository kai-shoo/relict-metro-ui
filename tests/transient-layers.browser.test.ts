import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent, type Locator } from 'vitest/browser';
import '../src/dialog.js';
import '../src/flyout.js';
import '../src/menu-flyout.js';
import '../src/tooltip.js';
import type { MetroDialogCloseEvent } from '../src/dialog.js';
import type { MetroFlyoutCloseEvent } from '../src/flyout.js';
import type { MetroCommandEvent } from '../src/command-bar.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.overlayTest = '';
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

async function expectFocus(locator: Locator): Promise<void> {
  await expect.poll(() => {
    const element = locator.element();
    return (element.getRootNode() as Document | ShadowRoot).activeElement === element;
  }).toBe(true);
}

afterEach(() => {
  document.querySelectorAll('[data-overlay-test]').forEach(host => host.remove());
});

it('keeps an open flyout and tooltip anchored through scrolling in an enclosing shadow tree', async () => {
  const host = fixture(`
    <div id="shell">
      <button id="source" type="button">Actions</button>
      <metro-tooltip text="Record number"><button id="record" type="button">Record</button></metro-tooltip>
    </div>
    <metro-flyout label="Information" pass-through><p>Details</p></metro-flyout>
  `);
  const root = host.querySelector('#shell')!.attachShadow({ mode: 'open' });
  root.innerHTML = `<div style="height:190px;overflow:auto">
    <div style="padding:80px 8px 420px"><slot></slot></div>
  </div>`;
  const scroll = root.firstElementChild!;
  const flyout = host.querySelector('metro-flyout')!;
  const source = host.querySelector<HTMLElement>('#source')!;
  const record = host.querySelector<HTMLElement>('#record')!;
  const tooltip = page.getByRole('tooltip');
  await host.querySelector('metro-tooltip')!.updateComplete;
  record.focus();
  await expect.element(tooltip).toBeVisible();
  const tooltipTop = tooltip.element().getBoundingClientRect().top;
  scroll.scrollTop = 24;
  await expect.poll(() => tooltip.element().getBoundingClientRect().top).toBeCloseTo(tooltipTop - 24, 0);

  flyout.show(source);
  const surface = page.getByRole('dialog', { name: 'Information' });
  await expect.element(surface).toBeVisible();
  const flyoutTop = surface.element().getBoundingClientRect().top;
  scroll.scrollTop = 48;
  await expect.poll(() => surface.element().getBoundingClientRect().top).toBeCloseTo(flyoutTop - 24, 0);
});

it('reveals a slotted autofocus action inside a short flyout without scrolling the page', async () => {
  const host = fixture(`
    <style>metro-flyout::part(surface) { max-block-size: 9rem; }</style>
    <div style="height:120vh">
      <metro-flyout label="Record options" trigger-label="Options">
        <div aria-hidden="true" style="height:25rem"></div>
        <button type="button" autofocus data-metro-close>Continue</button>
      </metro-flyout>
    </div>
  `);
  const trigger = page.getByRole('button', { name: 'Options' });
  const panel = page.getByRole('dialog', { name: 'Record options' });
  const action = page.getByRole('button', { name: 'Continue' });
  const start = window.scrollY;
  await trigger.click();
  await expectFocus(action);
  const surface = panel.element();
  const bounds = surface.getBoundingClientRect();
  const focused = action.element().getBoundingClientRect();
  expect(surface.scrollTop).toBeGreaterThan(0);
  expect(focused.top).toBeGreaterThanOrEqual(bounds.top);
  expect(focused.bottom).toBeLessThanOrEqual(bounds.bottom);
  expect(window.scrollY).toBe(start);
  await userEvent.keyboard('{Escape}');
  await expect.element(panel).not.toBeInTheDocument();
  await expectFocus(trigger);
  expect(host.querySelector('metro-flyout')!.open).toBe(false);
});

it('keeps the keyboard target inside a short menu when commands change or the menu reopens', async () => {
  const host = fixture(`
    <style>metro-menu-flyout::part(surface) { max-block-size: 10rem; }</style>
    <metro-menu-flyout label="Record actions" trigger-label="Actions"></metro-menu-flyout>
  `);
  const flyout = host.querySelector('metro-menu-flyout')!;
  const makeCommands = (prefix: string) => Array.from({ length: 12 }, (_, index) => ({
    id: `${prefix}-${index}`, label: `${prefix} ${index + 1}`,
  }));
  flyout.commands = makeCommands('Record');
  const trigger = page.getByRole('button', { name: 'Actions' });
  const menu = page.getByRole('menu', { name: 'Record actions' });
  const expectVisibleFocus = async (name: string) => {
    const item = page.getByRole('menuitem', { name, exact: true });
    await expectFocus(item);
    await expect.poll(() => {
      const panel = menu.element().getBoundingClientRect();
      const row = item.element().getBoundingClientRect();
      return row.top >= panel.top - 1 && row.bottom <= panel.bottom + 1;
    }).toBe(true);
  };

  await trigger.click();
  await expectVisibleFocus('Record 1');
  await userEvent.keyboard('{End}');
  await expectVisibleFocus('Record 12');
  await userEvent.keyboard('{Home}');
  await expectVisibleFocus('Record 1');
  await userEvent.keyboard('{End}');
  flyout.commands = makeCommands('New record');
  await expectVisibleFocus('New record 1');
  await userEvent.keyboard('{End}{Escape}');
  await expectFocus(trigger);
  await userEvent.keyboard('{Enter}');
  await expectVisibleFocus('New record 1');
});

it('keeps a reordered menu command focused and visible by id', async () => {
  const host = fixture(`
    <style>metro-menu-flyout::part(surface) { max-block-size: 10rem; }</style>
    <metro-menu-flyout label="Record actions" trigger-label="Actions"></metro-menu-flyout>
  `);
  const flyout = host.querySelector('metro-menu-flyout')!;
  const [first, ...rest] = Array.from({ length: 12 }, (_, index) => ({
    id: `record-${index}`, label: `Record ${index + 1}`,
  }));
  flyout.commands = [first, ...rest];
  const selected: string[] = [];
  flyout.addEventListener('metro-command', event => selected.push(event.detail.id));
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.click();
  await expectFocus(page.getByRole('menuitem', { name: first.label, exact: true }));

  flyout.commands = [...rest, { ...first, label: 'Renamed record' }];
  await flyout.updateComplete;
  const menu = page.getByRole('menu', { name: 'Record actions' }).element();
  const renamed = page.getByRole('menuitem', { name: 'Renamed record' });
  await expectFocus(renamed);
  const bounds = menu.getBoundingClientRect();
  const row = renamed.element().getBoundingClientRect();
  expect(row.top).toBeGreaterThanOrEqual(bounds.top - 1);
  expect(row.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  expect(selected).toEqual([]);
  await userEvent.keyboard('{Enter}');
  expect(selected).toEqual([first.id]);
  await expectFocus(trigger);
});

it('lets Escape close the focused menu when another control has a hovered tooltip', async () => {
  const host = fixture(`
    <metro-tooltip text="Record number"><button type="button">Record</button></metro-tooltip>
    <button id="source" type="button">Actions</button>
    <metro-menu-flyout label="Record actions" pass-through></metro-menu-flyout>
  `);
  const menu = host.querySelector('metro-menu-flyout')!;
  const source = host.querySelector<HTMLElement>('#source')!;
  menu.commands = [{ id: 'open', label: 'Open' }];
  await page.getByRole('button', { name: 'Record', exact: true }).hover();
  const tooltip = page.getByRole('tooltip');
  await expect.element(tooltip).toBeVisible();
  menu.show(source);
  await expectFocus(page.getByRole('menuitem', { name: 'Open', exact: true }));
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('menu', { name: 'Record actions' })).not.toBeInTheDocument();
  await expect.element(tooltip).not.toBeInTheDocument();
  await expectFocus(page.getByRole('button', { name: 'Actions' }));
});

it.each(['hidden', 'disabled'] as const)('restores the fallback when a connected layer trigger becomes %s', async property => {
  for (const tag of ['metro-dialog', 'metro-flyout', 'metro-menu-flyout'] as const) {
    const host = fixture(`
      <button type="button">Original source</button>
      <button type="button">Return to messages</button>
    `);
    const [source, fallback] = [...host.querySelectorAll('button')];
    const layer = document.createElement(tag);
    layer.label = 'Record actions';
    layer.returnFocus = fallback;
    if ('commands' in layer) {
      layer.commands = [{ id: 'open', label: 'Open record' }];
    } else {
      layer.innerHTML = '<button type="button" autofocus>Open record</button>';
    }
    host.append(layer);
    await layer.updateComplete;

    source.focus();
    layer.show(source);
    const surface = page.getByRole(tag === 'metro-menu-flyout' ? 'menu' : 'dialog', { name: 'Record actions' });
    await expect.element(surface).toBeVisible();
    source[property] = true;
    expect(source.isConnected).toBe(true);
    layer.close();

    await expectFocus(page.getByRole('button', { name: 'Return to messages' }));
    expect(layer.open).toBe(false);
    host.remove();
  }
});

describe('metro-dialog', () => {
  it('opens a long message at its heading and scrolls to the distant action on Tab', async () => {
    fixture(`
      <style>metro-dialog::part(surface) { max-block-size: 190px; }</style>
      <metro-dialog label="Review the update" trigger-label="Review">
        <p>Read the summary before continuing.</p>
        <p style="min-block-size: 24rem">This change affects several folders.</p>
        <button slot="actions" type="button" data-metro-value="continue">Continue</button>
      </metro-dialog>
    `);
    const trigger = page.getByRole('button', { name: 'Review', exact: true });
    await trigger.click();
    const surface = page.getByRole('dialog', { name: 'Review the update' }).element();
    const heading = page.getByRole('heading', { name: 'Review the update' });
    await expectFocus(heading);
    expect(surface.scrollTop).toBe(0);
    expect(heading.element().getBoundingClientRect().top).toBeGreaterThan(surface.getBoundingClientRect().top);

    await userEvent.keyboard('{Tab}');
    const action = page.getByRole('button', { name: 'Continue' });
    await expectFocus(action);
    const button = action.element();
    expect(surface.scrollTop).toBeGreaterThan(0);
    expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(surface.getBoundingClientRect().bottom + 1);
    await userEvent.keyboard('{Escape}');
    await expectFocus(trigger);

    await trigger.click();
    await expectFocus(heading);
    expect(surface.scrollTop).toBe(0);
    await userEvent.keyboard('{Escape}');

    button.setAttribute('autofocus', '');
    await trigger.click();
    await expectFocus(action);
    expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(surface.getBoundingClientRect().bottom + 1);
  });

  it('keeps a long action label visible and operable inside a narrow dialog', async () => {
    const label = 'Wiederherstellungseinstellungen';
    const host = fixture(`
      <style>metro-dialog::part(surface) { inline-size: 240px; font-size: 2rem; }</style>
      <metro-dialog label="Settings" trigger-label="Restore">
        <p>Restore saved settings.</p>
        <button slot="actions" type="button" data-metro-value="restore">${label}</button>
      </metro-dialog>
    `);
    const dialog = host.querySelector('metro-dialog')!;
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    const surface = page.getByRole('dialog', { name: 'Settings' }).element();
    const action = page.getByRole('button', { name: label, exact: true });
    await expect.element(action).toBeVisible();
    expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth + 1);
    expect(action.element().scrollWidth).toBeLessThanOrEqual(action.element().clientWidth + 1);
    await action.click();
    expect(dialog.returnValue).toBe('restore');
  });

  it('uses native modal focus and returns the selected action value', async () => {
    const host = fixture(`
      <metro-dialog label="Confirm deletion" trigger-label="Delete">
        <p>This removes the selected message.</p>
        <input autofocus aria-label="Confirmation note">
        <button slot="actions" type="button" data-metro-value="cancel">Cancel</button>
        <button slot="actions" type="button" data-metro-value="delete">Confirm</button>
      </metro-dialog>
    `);
    const dialog = host.querySelector('metro-dialog')!;
    const closed: MetroDialogCloseEvent['detail'][] = [];
    dialog.addEventListener('metro-close', event => closed.push((event as MetroDialogCloseEvent).detail));

    const trigger = page.getByRole('button', { name: 'Delete', exact: true });
    await trigger.click();
    await expect.element(page.getByRole('dialog', { name: 'Confirm deletion' })).toBeVisible();
    await expectFocus(page.getByRole('textbox', { name: 'Confirmation note' }));

    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect.element(page.getByRole('dialog', { name: 'Confirm deletion' })).not.toBeInTheDocument();
    await expectFocus(trigger);
    expect(dialog.returnValue).toBe('delete');
    expect(closed).toEqual([{ reason: 'action', value: 'delete' }]);
  });

  it('lets the application prevent dismissal and restores fallback focus on Escape', async () => {
    const host = fixture(`
      <button type="button">Original source</button>
      <button type="button">Message list</button>
      <metro-dialog label="Review message"><p>Unsent draft</p></metro-dialog>
    `);
    const [source, fallback] = Array.from(host.querySelectorAll('button'));
    const dialog = host.querySelector('metro-dialog')!;
    dialog.returnFocus = fallback;
    const closed: MetroDialogCloseEvent['detail'][] = [];
    dialog.addEventListener('metro-close', event => closed.push((event as MetroDialogCloseEvent).detail));

    source.focus();
    dialog.show(source);
    await expect.element(page.getByRole('dialog', { name: 'Review message' })).toBeVisible();
    source.remove();
    dialog.addEventListener('metro-before-close', event => event.preventDefault(), { once: true });

    await userEvent.keyboard('{Escape}');
    expect(dialog.open).toBe(true);
    expect(closed).toEqual([]);

    await userEvent.keyboard('{Escape}');
    await expectFocus(page.getByRole('button', { name: 'Message list' }));
    expect(dialog.open).toBe(false);
    expect(closed).toEqual([{ reason: 'escape', value: '' }]);
  });
});

describe('metro-flyout', () => {
  it('keeps edits open until a close action and restores the trigger on Escape', async () => {
    const host = fixture(`
      <metro-flyout label="Filters" trigger-label="Filter messages">
        <label><input type="checkbox" autofocus> Unread only</label>
        <button type="button" data-metro-close>Done</button>
      </metro-flyout>
    `);
    const flyout = host.querySelector('metro-flyout')!;
    const closed: MetroFlyoutCloseEvent['detail'][] = [];
    flyout.addEventListener('metro-close', event => closed.push((event as MetroFlyoutCloseEvent).detail));

    const trigger = page.getByRole('button', { name: 'Filter messages' });
    await trigger.click();
    const checkbox = page.getByRole('checkbox', { name: 'Unread only' });
    await expectFocus(checkbox);
    await checkbox.click();
    await expect.element(checkbox).toBeChecked();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(closed).toEqual([]);

    await page.getByRole('button', { name: 'Done' }).click();
    await expectFocus(trigger);
    expect(closed).toEqual([{ reason: 'action' }]);

    await trigger.click();
    await userEvent.keyboard('{Escape}');
    await expectFocus(trigger);
    expect(closed).toEqual([{ reason: 'action' }, { reason: 'escape' }]);
  });

  it('consumes the dismiss click unless pass-through is enabled', async () => {
    const host = fixture(`
      <metro-flyout label="Filters" trigger-label="Open filters"><p>Filter controls</p></metro-flyout>
      <button type="button" style="position:fixed;inset:12rem auto auto 1rem">Outside action</button>
    `);
    const flyout = host.querySelector('metro-flyout')!;
    let outsideClicks = 0;
    host.querySelector('button')!.addEventListener('click', () => outsideClicks++);

    const trigger = page.getByRole('button', { name: 'Open filters' });
    const outside = page.getByRole('button', { name: 'Outside action' });
    await trigger.click();
    await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
    await outside.click({ force: true });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expectFocus(trigger);
    expect(outsideClicks).toBe(0);

    flyout.passThrough = true;
    await trigger.click();
    await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
    await outside.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expectFocus(outside);
    expect(outsideClicks).toBe(1);
  });
});

describe('metro-menu-flyout', () => {
  it.each([
    ['light', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
    ['dark', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'],
  ])('uses a solid inverse surface in the %s theme and accepts custom colors', async (theme, background, foreground) => {
    const host = fixture(`<metro-menu-flyout data-metro-theme="${theme}"
      label="Message actions" trigger-label="Commands"></metro-menu-flyout>`);
    const menu = host.querySelector('metro-menu-flyout')!;
    menu.commands = [{ id: 'archive', label: 'Archive' }];
    await page.getByRole('button', { name: 'Commands' }).click();
    const surface = page.getByRole('menu', { name: 'Message actions' });
    await expect.element(surface).toBeVisible();
    const style = getComputedStyle(surface.element());
    expect(style.backgroundColor).toBe(background);
    expect(style.color).toBe(foreground);

    menu.style.setProperty('--metro-menu-bg', 'rgba(12, 34, 56, 0.8)');
    menu.style.setProperty('--metro-menu-fg', '#f0f0f0');
    expect(style.backgroundColor).toBe('rgba(12, 34, 56, 0.8)');
    expect(style.color).toBe('rgb(240, 240, 240)');
  });

  it('moves focus off an item disabled while its menu is open', async () => {
    const host = fixture('<metro-menu-flyout label="Message actions" trigger-label="Commands"></metro-menu-flyout>');
    const menu = host.querySelector('metro-menu-flyout')!;
    const commands = [{ id: 'rename', label: 'Rename' }, { id: 'archive', label: 'Archive' }];
    const actions: string[] = [];
    menu.addEventListener('metro-command', event => actions.push(event.detail.id));
    menu.commands = commands;
    await page.getByRole('button', { name: 'Commands' }).click();
    const rename = page.getByRole('menuitem', { name: 'Rename' });
    const archive = page.getByRole('menuitem', { name: 'Archive' });
    await expectFocus(rename);
    menu.commands = [{ ...commands[0], disabled: true }, commands[1]];
    await menu.updateComplete;
    expect(menu.shadowRoot?.activeElement).toBe(archive.element());
    expect(menu.open).toBe(true);
    expect(actions).toEqual([]);
    await userEvent.keyboard('{Enter}');
    expect(actions).toEqual(['archive']);
  });

  it('returns focus through the menu host after a composed confirmation dialog', async () => {
    const host = fixture(`
      <metro-menu-flyout label="Message actions" trigger-label="Open commands"></metro-menu-flyout>
      <metro-dialog label="Delete message?">
        <button slot="actions" type="button" autofocus data-metro-value="cancel">Cancel</button>
        <button slot="actions" type="button" data-metro-value="delete">Delete message</button>
      </metro-dialog>
    `);
    const menu = host.querySelector('metro-menu-flyout')!;
    const dialog = host.querySelector('metro-dialog')!;
    menu.commands = [{ id: 'delete', label: 'Delete' }];
    menu.addEventListener('metro-command', () => dialog.show(menu));

    const trigger = page.getByRole('button', { name: 'Open commands' });
    const confirmation = page.getByRole('dialog', { name: 'Delete message?' });
    await menu.updateComplete;
    menu.focus();
    await expectFocus(trigger);
    await userEvent.keyboard('{Enter}');
    await expectFocus(page.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.keyboard('{Enter}');
    await expect.element(confirmation).toBeVisible();
    await expectFocus(page.getByRole('button', { name: 'Cancel' }));

    await userEvent.keyboard('{Escape}');
    await expect.element(confirmation).not.toBeInTheDocument();
    await expectFocus(trigger);
    expect(menu.open).toBe(false);
  });

  it('positions a context menu at the invocation and handles keyboard commands', async () => {
    const host = fixture(`
      <button type="button">Selected message</button>
      <metro-menu-flyout label="Message actions"></metro-menu-flyout>
    `);
    const anchor = host.querySelector('button')!;
    const menu = host.querySelector('metro-menu-flyout')!;
    menu.commands = [
      { id: 'pin', label: 'Pin' },
      { id: 'rename', label: 'Rename', disabled: true },
      { id: 'delete', label: 'Delete' },
    ];
    const selected: string[] = [];
    menu.addEventListener('metro-command', event => {
      expect(document.activeElement).toBe(anchor);
      selected.push((event as MetroCommandEvent).detail.id);
    });
    anchor.addEventListener('contextmenu', event => {
      event.preventDefault();
      menu.showAt(anchor, { x: event.clientX, y: event.clientY });
    });

    await page.getByRole('button', { name: 'Selected message' }).click({ button: 'right' });
    const surface = page.getByRole('menu', { name: 'Message actions' });
    await expect.element(surface).toBeVisible();
    const { right, bottom } = surface.element().getBoundingClientRect();
    expect(right).toBeLessThanOrEqual(window.innerWidth);
    expect(bottom).toBeLessThanOrEqual(window.innerHeight);

    await expectFocus(page.getByRole('menuitem', { name: 'Pin' }));
    await expect.element(page.getByRole('menuitem', { name: 'Rename' })).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}');
    await expectFocus(page.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.keyboard('{ArrowDown}');
    await expectFocus(page.getByRole('menuitem', { name: 'Pin' }));
    await userEvent.keyboard('{End}{Enter}');
    await expect.element(surface).not.toBeInTheDocument();
    expect(selected).toEqual(['delete']);
  });
});
