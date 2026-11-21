import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/context-menu.js';
import '../src/page.js';

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

afterEach(async () => {
  document.querySelectorAll('[data-context-menu-test]').forEach(host => host.remove());
  if (innerWidth !== 980 || innerHeight !== 760) await page.viewport(980, 760);
});

describe('WP8 context menu layout', () => {
  it('spans the page in portrait and opens below or above the owner', async () => {
    await page.viewport(400, 680);
    const { menu, target } = fixture();
    const ownerPage = document.createElement('metro-page');
    ownerPage.style.cssText = 'position:fixed;left:24px;width:352px';
    target.parentElement!.parentElement!.append(ownerPage);
    ownerPage.append(target, menu);
    await ownerPage.updateComplete;

    for (const reversed of [false, true]) {
      ownerPage.style.top = reversed ? '600px' : '40px';
      const owner = target.getBoundingClientRect();
      menu.showAt(target, { x: 112, y: owner.top + 5 });
      await menu.updateComplete;
      const frame = menu.shadowRoot!.querySelector<HTMLElement>('.menu-frame')!;
      const panel = menu.shadowRoot!.getElementById('surface')!;
      await checkOpening(frame, panel, false, reversed);
      const bounds = frame.getBoundingClientRect();
      expect(bounds.left).toBe(24);
      expect(bounds.width).toBe(352);
      expect(reversed ? bounds.bottom : bounds.top).toBeCloseTo(reversed ? owner.top : owner.bottom);
      expect(getComputedStyle(frame).transformOrigin).toBe('88px 0px');
      menu.close();
      await menu.updateComplete;
    }
  });

  it('opens against the opposite landscape edge and accounts for each visible bar', async () => {
    await page.viewport(800, 480);
    const { menu, target } = fixture();
    const cases = [
      { x: 760, tray: false, bar: true, left: 0, width: 480 },
      { x: 760, tray: true, bar: true, left: 72, width: 408 },
      { x: 40, tray: true, bar: false, left: 320, width: 480 },
      { x: 40, tray: true, bar: true, left: 320, width: 408 },
    ];
    for (const { x, tray, bar, left, width } of cases) {
      menu.toggleAttribute('system-tray-visible', tray);
      menu.toggleAttribute('application-bar-visible', bar);
      menu.showAt(target, { x, y: 240 });
      await menu.updateComplete;
      const frame = menu.shadowRoot!.querySelector<HTMLElement>('.menu-frame')!;
      const panel = menu.shadowRoot!.getElementById('surface')!;
      await checkOpening(frame, panel, true, x > 400);
      const bounds = frame.getBoundingClientRect();
      expect([bounds.left, bounds.top, bounds.width, bounds.height]).toEqual([left, 0, width, 480]);
      expect(panel.getBoundingClientRect().width).toBe(width - 8);
      menu.close();
      await menu.updateComplete;
    }
  });

  it('fits between both bars when landscape space is limited', async () => {
    await page.viewport(520, 360);
    const { menu, target } = fixture();
    menu.showAt(target, { x: 510, y: 180 });
    await menu.updateComplete;
    const frame = menu.shadowRoot!.querySelector<HTMLElement>('.menu-frame')!;
    menu.systemTrayVisible = true;
    menu.applicationBarVisible = true;
    await menu.updateComplete;
    await Promise.all(frame.getAnimations({ subtree: true }).map(animation => animation.finished));
    const bounds = frame.getBoundingClientRect();
    expect([bounds.left, bounds.right]).toEqual([72, 448]);
  });

  it.skipIf(server.browser !== 'chromium')('skips both opening axes with reduced motion and closes on Escape', async () => {
    await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      const { menu, target, surface } = fixture();
      menu.show(target);
      await menu.updateComplete;
      await expect.element(surface).toBeVisible();
      expect(menu.shadowRoot!.getElementById('layer')!.getAnimations({ subtree: true })).toHaveLength(0);
      await userEvent.keyboard('{Escape}');
      await expect.element(surface).not.toBeInTheDocument();
      expect(document.activeElement).toBe(target);
    } finally {
      await cdp().send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});

async function checkOpening(frame: HTMLElement, panel: HTMLElement, landscape: boolean, reversed: boolean) {
  const animations = frame.getAnimations({ subtree: true });
  expect(animations).toHaveLength(3);
  for (const animation of animations) animation.pause();
  await Promise.all(animations.map(animation => animation.ready));
  const seek = (time: number) => {
    for (const animation of animations) animation.currentTime = time;
  };
  const scale = (element: HTMLElement, xAxis: boolean) => {
    const transform = getComputedStyle(element).transform;
    const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    return xAxis ? matrix.a : matrix.d;
  };
  const leading = reversed ? '::after' : '::before';
  const trailing = reversed ? '::before' : '::after';
  for (const [time, first, second, opacity] of [
    [0, 0, 0, '0'],
    [150, 0.5, 0, '0'],
    [300, 1, 0, '0'],
    [360, 1, 0.5, '0'],
    [410, 1, 110 / 120, '1'],
    [420, 1, 1, '1'],
  ] as const) {
    seek(time);
    expect(scale(frame, !landscape)).toBeCloseTo(first);
    expect(scale(panel, landscape)).toBeCloseTo(second);
    expect(getComputedStyle(frame, leading).opacity).toBe('1');
    expect(getComputedStyle(frame, trailing).opacity).toBe(opacity);
  }
  const origin = getComputedStyle(panel).transformOrigin.split(' ').map(parseFloat);
  expect(landscape ? origin[0] : origin[1]).toBe(reversed ? (landscape ? panel.offsetWidth : panel.offsetHeight) : 0);
}

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
    await page.viewport(460, 680);
    const host = document.createElement('div');
    host.dataset.contextMenuTest = '';
    host.innerHTML = `
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
    expect(bounds.right).toBe(innerWidth);
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

    await Promise.all(menu.shadowRoot!.getElementById('layer')!.getAnimations({ subtree: true })
      .map(animation => animation.finished));
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
