import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/context-menu.js';

function fixture() {
  const host = document.createElement('div');
  host.dataset.contextMenuTest = '';
  host.innerHTML = `
    <div id="records" style="block-size: 10rem; overflow: auto">
      <button id="record" type="button">Item 34</button>
      <div style="block-size: 40rem"></div>
    </div>
    <button type="button" id="fallback">Records</button>
    <metro-context-menu for="record" label="Item actions" trigger-label="Open actions"></metro-context-menu>
  `;
  document.body.append(host);
  const menu = host.querySelector('metro-context-menu')!;
  const target = host.querySelector<HTMLButtonElement>('#record')!;
  const fallback = host.querySelector<HTMLButtonElement>('#fallback')!;
  const list = host.querySelector<HTMLElement>('#records')!;
  menu.commands = [{ id: 'rename', label: 'Rename' }, { id: 'delete', label: 'Delete' }];
  const item = page.getByRole('button', { name: 'Item 34' });
  const surface = page.getByRole('menu', { name: 'Item actions' });
  return { menu, target, fallback, list, item, surface };
}

function coords(element: HTMLElement): { x: number; y: number } {
  const item = element.getBoundingClientRect();
  const frame = window.frameElement?.getBoundingClientRect();
  return { x: item.left + item.width / 2 + (frame?.left ?? 0), y: item.top + item.height / 2 + (frame?.top ?? 0) };
}

function touch(type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', point?: { x: number; y: number }) {
  return cdp().send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

afterEach(() => document.querySelectorAll('[data-context-menu-test]').forEach(host => host.remove()));

describe('metro-context-menu', () => {
  it('shares one command model for secondary click, keyboard and the visible trigger', async () => {
    const { menu, target, item, surface } = fixture();
    const invokers: (Element | null)[] = [];
    const ids: string[] = [];
    menu.addEventListener('metro-command', event => {
      ids.push(event.detail.id);
      invokers.push(document.activeElement);
    });

    await item.click({ button: 'right' });
    await expect.element(surface).toBeVisible();
    await userEvent.keyboard('{Enter}');
    expect(document.activeElement).toBe(target);

    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await expect.element(surface).toBeVisible();
    await userEvent.keyboard('{End}{Enter}');
    expect(document.activeElement).toBe(target);

    await userEvent.keyboard('{ContextMenu}');
    await expect.element(surface).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(target);

    const trigger = page.getByRole('button', { name: 'Open actions' });
    await trigger.click();
    await expect.element(surface).toBeVisible();
    await page.getByRole('menuitem', { name: 'Rename' }).click();

    expect(ids).toEqual(['rename', 'delete', 'rename']);
    expect(invokers).toEqual([target, target, menu]);
  });

  it('uses an explicit target and closes if that target is removed', async () => {
    const { menu, target, item, fallback, surface } = fixture();
    menu.target = fallback;
    menu.returnFocus = target;
    await menu.updateComplete;

    await item.click({ button: 'right' });
    expect(menu.open).toBe(false);

    await page.getByRole('button', { name: 'Records', exact: true }).click({ button: 'right' });
    await expect.element(surface).toBeVisible();
    fallback.remove();
    await expect.element(surface).not.toBeInTheDocument();
    expect(document.activeElement).toBe(target);
  });

  it('keeps a long command within the viewport and returns Escape focus to the clicked child', async () => {
    const host = document.createElement('div');
    host.dataset.contextMenuTest = '';
    host.innerHTML = `
      <style>metro-context-menu::part(surface) { max-inline-size: 280px; }</style>
      <div id="edge-record" style="position:fixed;inset:auto 12px 12px auto">
        <button type="button"><span>Open record</span></button>
      </div>
      <metro-context-menu for="edge-record" label="Edge commands"></metro-context-menu>
    `;
    document.body.append(host);
    const menu = host.querySelector('metro-context-menu')!;
    const label = 'Synchronisationseinstellungen'.repeat(3);
    menu.commands = [{ id: 'sync', label, iconName: 'sync' }];
    const action = page.getByRole('menuitem', { name: label });
    const surface = page.getByRole('menu', { name: 'Edge commands' });
    const target = host.querySelector('button')!;
    await menu.updateComplete;
    await page.getByText('Open record', { exact: true }).click({ button: 'right' });
    await expect.element(surface).toBeVisible();
    const panel = surface.element();
    const bounds = panel.getBoundingClientRect();
    expect(bounds.right).toBeLessThanOrEqual(innerWidth - 7);
    expect(bounds.bottom).toBeLessThan(target.getBoundingClientRect().bottom);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
    expect(menu.shadowRoot!.activeElement).toBe(action.element());

    await userEvent.keyboard('{Escape}');
    await expect.element(surface).not.toBeInTheDocument();
    expect(document.activeElement).toBe(target);
  });

  it.skipIf(server.browser !== 'chromium')('opens on trusted touch hold without activating the held button or dismissing on release', async () => {
    const { menu, target, list, surface } = fixture();
    menu.target = list;
    let targetClicks = 0;
    target.addEventListener('click', () => targetClicks++);
    const selected: string[] = [];
    menu.addEventListener('metro-command', event => selected.push(event.detail.id));
    await menu.updateComplete;

    await touch('touchStart', coords(target));
    try {
      await expect.element(surface).toBeVisible();
    } finally {
      await touch('touchEnd');
    }
    await expect.element(surface).toBeVisible();
    expect(targetClicks).toBe(0);
    expect(selected).toEqual([]);

    const rename = page.getByRole('menuitem', { name: 'Rename' }).element() as HTMLElement;
    await touch('touchStart', coords(rename));
    await touch('touchEnd');
    await expect.poll(() => selected).toEqual(['rename']);
    expect(document.activeElement).toBe(target);
  });

  it.skipIf(server.browser !== 'chromium').each(['motion', 'scroll', 'cancel', 'release'])('cancels the pending touch hold on %s', async reason => {
    const { menu, target, list } = fixture();
    let targetClicks = 0;
    target.addEventListener('click', () => targetClicks++);
    await menu.updateComplete;
    const point = coords(target);

    await touch('touchStart', point);
    try {
      if (reason === 'motion') await touch('touchMove', { x: point.x + 30, y: point.y });
      else if (reason === 'scroll') list.scrollTop = 20;
      else await touch(reason === 'cancel' ? 'touchCancel' : 'touchEnd');

      await wait(550);
      expect(menu.open).toBe(false);
      if (reason === 'release') expect(targetClicks).toBe(1);
    } finally {
      if (reason === 'motion' || reason === 'scroll') await touch('touchCancel');
    }
  });
});
