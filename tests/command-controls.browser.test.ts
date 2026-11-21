import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent, type Locator } from 'vitest/browser';
import type { MetroCommandEvent } from '../src/command-bar.js';
import '../src/drop-down-button.js';
import '../src/split-button.js';
import '../src/tooltip.js';

function fixture(markup: string) {
  const host = document.createElement('div');
  host.dataset.commandTest = '';
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
  document.querySelectorAll('[data-command-test]').forEach(host => host.remove());
});

describe('metro-drop-down-button', () => {
  it('opens named commands by keyboard and restores the trigger after selection', async () => {
    const host = fixture(`
      <metro-drop-down-button menu-label="Sort messages">Sort by</metro-drop-down-button>
    `);
    const control = host.querySelector('metro-drop-down-button')!;
    control.commands = [{ id: 'name', label: 'Name' }, { id: 'newest', label: 'Newest' }];
    const commands: string[] = [];
    control.addEventListener('metro-command', event => commands.push((event as MetroCommandEvent).detail.id));

    const trigger = page.getByRole('button', { name: 'Sort by' });
    await control.updateComplete;
    control.focus();
    await expectFocus(trigger);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('menu', { name: 'Sort messages' })).toBeVisible();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expectFocus(page.getByRole('menuitem', { name: 'Name' }));
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expectFocus(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(commands).toEqual(['newest']);
    expect(control.open).toBe(false);
  });
});

describe('metro-split-button', () => {
  it('keeps the primary action and menu button independent', async () => {
    const host = fixture(`
      <metro-split-button label="Send now" menu-label="Send options" primary-command="send"></metro-split-button>
    `);
    const control = host.querySelector('metro-split-button')!;
    control.commands = [{ id: 'schedule', label: 'Schedule' }];
    const commands: string[] = [];
    control.addEventListener('metro-command', event => commands.push((event as MetroCommandEvent).detail.id));

    const primary = page.getByRole('button', { name: 'Send now' });
    const trigger = page.getByRole('button', { name: 'Send options' });
    await primary.click();
    expect(commands).toEqual(['send']);
    expect(control.open).toBe(false);

    await trigger.click();
    await expectFocus(page.getByRole('menuitem', { name: 'Schedule' }));
    await userEvent.keyboard('{Escape}');
    await expectFocus(trigger);
    expect(commands).toEqual(['send']);

    await trigger.click();
    await page.getByRole('menuitem', { name: 'Schedule' }).click();
    expect(commands).toEqual(['send', 'schedule']);

    control.commands = [];
    await expect.element(trigger).toBeDisabled();
    await expect.element(primary).toBeEnabled();
    control.disabled = true;
    await expect.element(primary).toBeDisabled();
  });
});

describe('metro-tooltip', () => {
  it('adds a description, shows on focus, and dismisses without moving focus', async () => {
    const host = fixture(`
      <p id="save-tip-existing">Current draft</p>
      <metro-tooltip text="Save without sending">
        <button type="button" aria-describedby="save-tip-existing">Save</button>
      </metro-tooltip>
    `);
    const tooltip = host.querySelector('metro-tooltip')!;
    const trigger = page.getByRole('button', { name: 'Save' });
    const visibleTip = page.getByRole('tooltip');
    await expect.element(trigger).toHaveAccessibleDescription('Current draft Save without sending');
    await expect.element(visibleTip).not.toBeInTheDocument();
    await userEvent.keyboard('{Tab}');
    await expectFocus(trigger);
    await expect.element(visibleTip).toBeVisible();
    await expect.element(visibleTip).toHaveTextContent('Save without sending');

    await userEvent.keyboard('{Escape}');
    await expectFocus(trigger);
    await expect.element(visibleTip).not.toBeInTheDocument();
    tooltip.text = 'Save offline';
    await expect.element(trigger).toHaveAccessibleDescription('Current draft Save offline');
    tooltip.text = '';
    await expect.element(trigger).toHaveAttribute('aria-describedby', 'save-tip-existing');

    tooltip.text = 'Copy the draft';
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Copy';
    tooltip.replaceChildren(next);
    await expect.element(page.getByRole('button', { name: 'Copy' })).toHaveAccessibleDescription('Copy the draft');
  });

  it('stays visible while hovered and dismisses when the pointer leaves', async () => {
    fixture(`
      <metro-tooltip text="Copy message URL"><button type="button">Copy link</button></metro-tooltip>
      <button type="button" style="position:fixed;top:2rem;left:16rem">Outside</button>
    `);

    const tooltip = page.getByRole('tooltip');
    await page.getByRole('button', { name: 'Copy link' }).hover();
    await expect.element(tooltip).toBeVisible();
    await tooltip.hover();
    await expect.element(tooltip).toBeVisible();
    await page.getByRole('button', { name: 'Outside' }).hover();
    await expect.element(tooltip).not.toBeInTheDocument();
  });

  it('keeps the open tooltip aligned when the trigger or the tooltip changes size', async () => {
    const host = fixture(`
      <style>metro-tooltip.enlarged::part(surface) { font-size: 32px; }</style>
      <metro-tooltip text="Record actions">
        <button type="button" style="position:fixed;top:calc(100% - 100px);left:100px;width:120px;height:32px">
          Record
        </button>
      </metro-tooltip>
    `);
    const control = host.querySelector('metro-tooltip')!;
    const trigger = host.querySelector('button')!;
    const tooltip = page.getByRole('tooltip');
    await control.updateComplete;
    trigger.focus();
    await expect.element(tooltip).toBeVisible();
    const surface = tooltip.element();
    const center = (rect: DOMRect) => rect.left + rect.width / 2;
    expect(surface.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom).toBeCloseTo(4, 0);

    trigger.style.width = '240px';
    trigger.style.height = '80px';
    await expect.poll(() => trigger.getBoundingClientRect().top - surface.getBoundingClientRect().bottom).toBeCloseTo(4, 0);
    expect(center(surface.getBoundingClientRect())).toBeCloseTo(center(trigger.getBoundingClientRect()), 0);

    const originalHeight = surface.getBoundingClientRect().height;
    control.classList.add('enlarged');
    await expect.poll(() => trigger.getBoundingClientRect().top - surface.getBoundingClientRect().bottom).toBeCloseTo(4, 0);
    expect(surface.getBoundingClientRect().height).toBeGreaterThan(originalHeight);
    expect(center(surface.getBoundingClientRect())).toBeCloseTo(center(trigger.getBoundingClientRect()), 0);
    await userEvent.keyboard('{Escape}');
    await expect.element(tooltip).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
