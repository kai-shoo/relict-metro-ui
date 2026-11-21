import { beforeEach, expect, test, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/border.js';
import '../src/canvas.js';
import '../src/content-control.js';
import '../src/content-presenter.js';
import '../src/grid.js';
import '../src/image-brush.js';
import '../src/label.js';
import '../src/rich-text-block.js';
import '../src/shape.js';
import '../src/text-block.js';
import '../src/title-bar.js';
import '../src/web-view.js';
import '../src/wrap-panel.js';
import { brokenImage, testImage } from './media/browser-fixture.js';

interface WebTimeoutState {
  state: string;
  hasFrame: boolean;
  title: string | null;
  errors: number;
  loads: number;
  canGoBack: boolean;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    webViewTimeout(): Promise<{ afterTimeout: WebTimeoutState; afterRetry: WebTimeoutState; requests: number }>;
  }
}

beforeEach(() => { document.body.replaceChildren(); });

test('ContentPresenter preserves native actions and restores its slot after explicit content', async () => {
  document.body.innerHTML = '<metro-content-presenter><button>Open route</button></metro-content-presenter>';
  const presenter = document.querySelector('metro-content-presenter')!;
  const action = page.getByRole('button', { name: 'Open route' });
  const click = vi.fn();
  presenter.querySelector('button')!.addEventListener('click', click);
  await action.click();
  expect(click).toHaveBeenCalledTimes(1);

  presenter.content = '<strong>Route</strong>';
  await expect.element(page.getByText('<strong>Route</strong>', { exact: true })).toBeVisible();
  expect(presenter.shadowRoot?.querySelector('strong')).toBeNull();
  presenter.content = 0;
  await expect.element(page.getByText('0', { exact: true })).toBeVisible();
  presenter.content = null;
  await action.click();
  expect(click).toHaveBeenCalledTimes(2);
});

test('text variants preserve heading semantics, native label association and rich slotted links', async () => {
  document.body.innerHTML = `
    <metro-text-block variant="title2" level="2" trim="ellipsis" style="width:70px">
      Semantically complete heading
    </metro-text-block>
    <metro-label><label for="route">Route name</label></metro-label>
    <input id="route">
    <metro-rich-text-block><p>About the <a href="#demo">record</a>.</p></metro-rich-text-block>
  `;
  const heading = page.getByRole('heading', { level: 2, name: 'Semantically complete heading' });
  await expect.element(heading).toBeVisible();
  const rendered = heading.element();
  expect(getComputedStyle(rendered).fontSize).toBe('32px');
  expect(getComputedStyle(rendered).textOverflow).toBe('ellipsis');
  await page.getByText('Route name', { exact: true }).click();
  await expect.element(page.getByRole('textbox', { name: 'Route name' })).toHaveFocus();
  await expect.element(page.getByRole('link', { name: 'record' })).toHaveAttribute('href', '#demo');
});

test('long plain text and rich links wrap at 200% while the native link remains keyboard operable', async () => {
  const word = '0123456789'.repeat(12);
  const root = document.documentElement;
  const originalSize = root.style.fontSize;
  root.style.fontSize = '200%';
  document.body.innerHTML = `
    <main style="width:320px">
      <metro-text-block level="2" variant="title2">${word}</metro-text-block>
      <metro-rich-text-block><p>Read <a href="#record">${word}</a></p></metro-rich-text-block>
    </main>
  `;
  try {
    const heading = page.getByRole('heading', { name: word, level: 2 });
    const link = page.getByRole('link', { name: word });
    await expect.element(heading).toBeVisible();
    const bounds = document.querySelector('main')!.getBoundingClientRect();
    const range = document.createRange();
    for (const node of [document.querySelector('metro-text-block')!, link.element()]) {
      range.selectNodeContents(node);
      const lines = [...range.getClientRects()];
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every(line => line.left >= bounds.left && line.right <= bounds.right + 1)).toBe(true);
    }
    const activate = vi.fn((event: Event) => event.preventDefault());
    link.element().addEventListener('click', activate);
    await userEvent.tab();
    await expect.element(link).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(activate).toHaveBeenCalledOnce();
  } finally {
    root.style.fontSize = originalSize;
  }
});

test('Label hides with its host and retains its native field association when shown again', async () => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }</style>
    <div style="width:240px">
      <metro-label hidden><label for="caption">Dokumenteneigenschaften</label></metro-label>
      <input id="caption">
    </div>`;
  const host = document.querySelector('metro-label')!;
  await host.updateComplete;
  expect(host.getClientRects()).toHaveLength(0);
  host.hidden = false;
  const label = host.querySelector('label')!;
  const text = document.createRange();
  text.selectNodeContents(label);
  for (const line of text.getClientRects()) {
    expect(line.right).toBeLessThanOrEqual(host.parentElement!.getBoundingClientRect().right);
  }
  expect(text.getClientRects().length).toBeGreaterThan(1);
  await page.getByText('Dokumenteneigenschaften', { exact: true }).click();
  await expect.element(page.getByRole('textbox', { name: 'Dokumenteneigenschaften' })).toHaveFocus();
});

test('grid, stack, wrap and canvas lay out ordinary slotted elements', async () => {
  document.body.innerHTML = `
    <metro-grid columns="2" style="width:300px"><button>Grid A</button><button>Grid B</button></metro-grid>
    <metro-stack-panel><button>Stack A</button><button>Stack B</button></metro-stack-panel>
    <metro-wrap-panel style="width:100px">
      <button style="width:80px">Wrap A</button><button style="width:80px">Wrap B</button>
    </metro-wrap-panel>
    <metro-canvas style="--metro-canvas-height:100px">
      <button style="--metro-canvas-x:26px; --metro-canvas-y:18px">Canvas item</button>
    </metro-canvas>
  `;
  const box = (name: string) => page.getByRole('button', { name }).element().getBoundingClientRect();
  await expect.element(page.getByRole('button', { name: 'Canvas item' })).toBeVisible();
  expect(box('Grid A').top).toBe(box('Grid B').top);
  expect(box('Grid B').left).toBeGreaterThan(box('Grid A').right);
  expect(box('Stack B').top).toBeGreaterThan(box('Stack A').bottom);
  expect(box('Wrap B').top).toBeGreaterThan(box('Wrap A').bottom);
  const canvasBox = document.querySelector('metro-canvas')!.getBoundingClientRect();
  expect(box('Canvas item').left - canvasBox.left).toBe(26);
  expect(box('Canvas item').top - canvasBox.top).toBe(18);
});

test.each(['ltr', 'rtl'])('Grid keeps enlarged form controls within their tracks in %s', async direction => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }
    metro-grid > :is(button, input) { font: inherit; }</style>
    <metro-grid columns="2" dir="${direction}" style="width:320px; --metro-layout-gap: .5rem">
      <button type="button">Dokumenteneigenschaften</button>
      <input aria-label="Caption" size="40">
      <button type="button" style="--metro-grid-column: 1 / -1">Save</button>
    </metro-grid>`;
  const grid = document.querySelector('metro-grid')!;
  const tools = page.getByRole('button', { name: 'Dokumenteneigenschaften' });
  const field = page.getByRole('textbox', { name: 'Caption' });
  const submit = page.getByRole('button', { name: 'Save' });
  await expect.element(field).toBeVisible();
  const bounds = grid.getBoundingClientRect();
  const toolsRect = tools.element().getBoundingClientRect();
  const fieldRect = field.element().getBoundingClientRect();
  expect(fieldRect.left).toBeGreaterThanOrEqual(bounds.left);
  expect(fieldRect.right).toBeLessThanOrEqual(bounds.right);
  expect(toolsRect.width).toBe(fieldRect.width);
  expect(direction === 'rtl' ? fieldRect.right : toolsRect.right).toBeLessThan(direction === 'rtl' ? toolsRect.left : fieldRect.left);
  expect(submit.element().getBoundingClientRect().width).toBe(bounds.width);
  const text = document.createRange();
  text.selectNodeContents(tools.element());
  expect(text.getClientRects().length).toBeGreaterThan(1);
  for (const line of text.getClientRects()) {
    expect(line.left).toBeGreaterThanOrEqual(toolsRect.left);
    expect(line.right).toBeLessThanOrEqual(toolsRect.right);
  }

  (tools.element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}x');
  await expect.element(field).toHaveFocus();
  await expect.element(field).toHaveValue('x');
  await userEvent.keyboard('{Tab}');
  await expect.element(submit).toHaveFocus();
});

test('WrapPanel moves a wide child to the next row and keeps its caption within the line', async () => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }
    metro-wrap-panel > button { font: inherit; }</style>
    <metro-wrap-panel style="width:240px">
      <button type="button">Open</button>
      <button type="button">Dokumenteneigenschaften</button>
      <button type="button">Save</button>
    </metro-wrap-panel>`;
  const panel = document.querySelector('metro-wrap-panel')!;
  const open = page.getByRole('button', { name: 'Open' });
  const wide = page.getByRole('button', { name: 'Dokumenteneigenschaften' });
  await expect.element(wide).toBeVisible();
  const bounds = panel.getBoundingClientRect();
  const box = wide.element().getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(bounds.left);
  expect(box.right).toBeLessThanOrEqual(bounds.right);
  expect(box.top).toBeGreaterThan(open.element().getBoundingClientRect().bottom);
  const text = document.createRange();
  text.selectNodeContents(wide.element());
  expect(text.getClientRects().length).toBeGreaterThan(1);
  for (const line of text.getClientRects()) expect(line.right).toBeLessThanOrEqual(box.right);
  (open.element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(wide).toHaveFocus();
});

test.each(['ltr', 'rtl'])('vertical WrapPanel respects block size and keeps DOM tab order in %s', async direction => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }
    metro-wrap-panel > button { font: inherit; min-block-size:54px; }</style>
    <metro-wrap-panel orientation="vertical" dir="${direction}" style="inline-size:240px;block-size:144px">
      <button>Open</button><button>Edit</button><button>Save</button>
    </metro-wrap-panel>`;
  const panel = document.querySelector('metro-wrap-panel')!;
  await panel.updateComplete;
  const [open, edit, save] = panel.querySelectorAll('button');
  const verifyColumns = () => {
    const [first, second, third] = [open, edit, save].map(button => button.getBoundingClientRect());
    const host = panel.getBoundingClientRect();
    expect(third.top).toBeCloseTo(first.top, 0);
    expect(second.top).toBeGreaterThan(first.bottom);
    expect(second.bottom).toBeLessThanOrEqual(host.bottom);
    expect(third.left).toBeGreaterThanOrEqual(host.left);
    expect(third.right).toBeLessThanOrEqual(host.right);
    if (direction === 'rtl') expect(third.right).toBeLessThan(first.left);
    else expect(third.left).toBeGreaterThan(first.right);
  };
  verifyColumns();
  panel.style.blockSize = '';
  panel.style.maxBlockSize = '144px';
  verifyColumns();
  open.focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'Edit' })).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();
  panel.style.maxBlockSize = '';
  expect(save.getBoundingClientRect().top).toBeGreaterThan(edit.getBoundingClientRect().bottom);
  await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();
});

test('Border wraps enlarged text within its padded surface and native hidden removes its slot', async () => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }</style>
    <metro-border style="width:240px; --metro-border-padding: 16px">
      <a href="#record">Dokumenteneigenschaften</a>
    </metro-border>`;
  const border = document.querySelector('metro-border')!;
  const link = page.getByRole('link', { name: 'Dokumenteneigenschaften' });
  await expect.element(link).toBeVisible();
  const bounds = border.getBoundingClientRect();
  const label = document.createRange();
  label.selectNodeContents(link.element());
  expect(label.getClientRects().length).toBeGreaterThan(1);
  for (const line of label.getClientRects()) {
    expect(line.left).toBeGreaterThanOrEqual(bounds.left + 17);
    expect(line.right).toBeLessThanOrEqual(bounds.right - 17);
  }
  border.hidden = true;
  await expect.element(link).not.toBeInTheDocument();
  expect(border.getClientRects()).toHaveLength(0);
  border.hidden = false;
  await expect.element(link).toBeVisible();
});

test('nested Canvas starts its children at a new origin and layer', async () => {
  document.body.innerHTML = `
    <metro-canvas id="outer" dir="rtl" style="width:240px;--metro-canvas-height:150px">
      <metro-canvas id="inner" style="width:165px;--metro-canvas-height:95px;
        --metro-canvas-x:36px;--metro-canvas-y:30px;--metro-canvas-layer:5">
        <button id="origin">Origin</button>
        <button id="marked" style="--metro-canvas-x:24px;--metro-canvas-y:38px;--metro-canvas-layer:2">Marked</button>
      </metro-canvas>
    </metro-canvas>`;
  const outer = document.querySelector<HTMLElement>('#outer')!;
  const inner = document.querySelector<HTMLElement>('#inner')!;
  const origin = page.getByRole('button', { name: 'Origin', exact: true });
  const marked = page.getByRole('button', { name: 'Marked', exact: true });
  await expect.element(origin).toBeVisible();
  const outerBounds = outer.getBoundingClientRect();
  const innerBounds = inner.getBoundingClientRect();
  const originBounds = origin.element().getBoundingClientRect();
  const markerBounds = marked.element().getBoundingClientRect();
  expect(outerBounds.right - innerBounds.right).toBe(36);
  expect(innerBounds.top - outerBounds.top).toBe(30);
  expect(getComputedStyle(inner).zIndex).toBe('5');
  expect(innerBounds.right - originBounds.right).toBe(0);
  expect(originBounds.top - innerBounds.top).toBe(0);
  expect(getComputedStyle(origin.element()).zIndex).toBe('auto');
  expect(innerBounds.right - markerBounds.right).toBe(24);
  expect(markerBounds.top - innerBounds.top).toBe(38);
  expect(getComputedStyle(marked.element()).zIndex).toBe('2');
  (origin.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(marked).toHaveFocus();
});

test('Canvas resolves logical coordinates in RTL and keeps marker layers below an external overlay', async () => {
  document.body.innerHTML = `
    <div style="position:relative; width:240px">
      <metro-canvas dir="rtl" style="--metro-canvas-height: 100px">
        <button id="first" style="--metro-canvas-x: 20px; --metro-canvas-y: 12px; --metro-canvas-layer: 1">First</button>
        <button id="marker" style="--metro-canvas-x: 20px; --metro-canvas-y: 12px; --metro-canvas-layer: 99">Marker</button>
      </metro-canvas>
      <button id="overlay" style="position:absolute; inset:0; z-index:2" hidden>Overlay</button>
    </div>`;
  const canvas = document.querySelector('metro-canvas')!;
  const marker = page.getByRole('button', { name: 'Marker' });
  await expect.element(marker).toBeVisible();
  const bounds = canvas.getBoundingClientRect();
  const box = marker.element().getBoundingClientRect();
  expect(bounds.right - box.right).toBe(20);
  expect(box.top - bounds.top).toBe(12);
  const x = box.right - 5;
  const y = box.top + 5;
  expect(document.elementFromPoint(x, y)).toBe(marker.element());
  const overlay = document.querySelector<HTMLButtonElement>('#overlay')!;
  overlay.hidden = false;
  expect(document.elementFromPoint(x, y)).toBe(overlay);
});

test('shape draws typed coordinates and uses an accessible name only when supplied', async () => {
  const shape = document.createElement('metro-shape');
  shape.kind = 'polygon';
  shape.points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 90 }];
  shape.label = 'Route marker';
  document.body.append(shape);
  await expect.element(page.getByRole('img', { name: 'Route marker' })).toBeVisible();
  expect(shape.shadowRoot?.querySelector('polygon')?.getAttribute('points')).toBe('0,0 100,0 50,90');
  shape.label = '';
  await expect.element(page.getByRole('img', { name: 'Route marker' })).not.toBeInTheDocument();
});

test('shape keeps its geometry and stroke in a rectangular themed box', async () => {
  document.body.innerHTML = `
    <metro-shape style="
      --metro-shape-width: 120px;
      --metro-shape-height: 60px;
      --metro-shape-fill: rgb(0, 90, 180);
      --metro-shape-stroke: rgb(255, 255, 255);
      --metro-shape-stroke-width: 3px;
    "></metro-shape>
  `;
  const shape = document.querySelector('metro-shape')!;
  await shape.updateComplete;
  const surface = shape.shadowRoot!.querySelector('svg')!;
  expect(surface.getBoundingClientRect().width).toBe(120);
  expect(surface.getBoundingClientRect().height).toBe(60);
  expect(surface.getAttribute('aria-hidden')).toBe('true');

  for (const [kind, tag] of [['rectangle', 'rect'], ['ellipse', 'ellipse'], ['line', 'line']] as const) {
    shape.kind = kind;
    await shape.updateComplete;
    const drawing = surface.querySelector(tag)!;
    const bounds = drawing.getBBox();
    const scale = surface.getScreenCTM()!;
    expect(bounds.x * scale.a).toBeCloseTo(6);
    expect(bounds.y * scale.d).toBeCloseTo(3);
    expect(bounds.width * scale.a).toBeCloseTo(108);
    expect(bounds.height * scale.d).toBeCloseTo(54);
    const style = getComputedStyle(drawing);
    expect(style.fill).toBe('rgb(0, 90, 180)');
    expect(style.stroke).toBe('rgb(255, 255, 255)');
    expect(style.strokeWidth).toBe('3px');
    expect(style.vectorEffect).toBe('non-scaling-stroke');
  }
});

test('the background image fits the brush surface even when the caption is only one line', async () => {
  document.body.innerHTML = `
    <metro-image-brush src="/examples/photos/assets/lake.svg">Lake</metro-image-brush>
    <details><summary>Example code</summary></details>
  `;
  const brush = document.querySelector('metro-image-brush')!;
  await brush.updateComplete;
  const layer = brush.shadowRoot!.querySelector('metro-image')!;
  await layer.updateComplete;
  const image = layer.shadowRoot!.querySelector('img')!;
  await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
  for (const width of [320, 840]) {
    brush.style.width = width + 'px';
    const bounds = brush.getBoundingClientRect();
    const background = image.getBoundingClientRect();
    expect(background.width).toBe(bounds.width);
    expect(background.height).toBe(bounds.height);
    expect(background.bottom).toBeLessThanOrEqual(document.querySelector('summary')!.getBoundingClientRect().top);
  }
});

test('ImageBrush keeps its fallback color, bounds and link focus when the decorative image changes', async () => {
  document.body.innerHTML = `<metro-image-brush style="width:320px; --metro-image-brush-height: 100px;
    --metro-image-brush-background: rgb(10, 20, 30)">
    <a href="#route">Open route</a>
  </metro-image-brush>`;
  const brush = document.querySelector('metro-image-brush')!;
  brush.src = testImage;
  await brush.updateComplete;
  const layer = brush.shadowRoot!.querySelector('metro-image')!;
  await expect.poll(() => layer.image?.naturalWidth).toBe(300);
  const surface = brush.shadowRoot!.querySelector('[part="surface"]')!;
  const link = page.getByRole('link', { name: 'Open route' });
  (link.element() as HTMLElement).focus();

  brush.src = brokenImage;
  await expect.poll(() => layer.image?.hidden).toBe(true);
  expect(getComputedStyle(surface).backgroundColor).toBe('rgb(10, 20, 30)');
  expect(surface.getBoundingClientRect().toJSON()).toMatchObject({ width: 320, height: 100 });
  expect(brush.getBoundingClientRect().height).toBe(100);
  expect(layer.getAttribute('aria-hidden')).toBe('true');
  await expect.element(link).toHaveFocus();

  brush.fit = 'contain';
  brush.src = testImage;
  await expect.poll(() => layer.image?.naturalWidth).toBe(300);
  expect(getComputedStyle(layer.image!).objectFit).toBe('contain');
  expect(layer.image!.getBoundingClientRect().toJSON()).toMatchObject({ width: 320, height: 100 });
  const activate = vi.fn(event => event.preventDefault());
  link.element().addEventListener('click', activate);
  await userEvent.keyboard('{Enter}');
  expect(activate).toHaveBeenCalledOnce();
});

test('content slots retain native actions while structured text is escaped', async () => {
  document.body.innerHTML = `
    <metro-content-control>
      <h2 slot="header">Profile</h2><p>Fallback body</p>
      <button slot="footer" type="button">Confirm</button>
    </metro-content-control>
    <metro-border>
      <metro-image-brush><a href="#outside">Go to record</a></metro-image-brush>
    </metro-border>
  `;
  const control = document.querySelector('metro-content-control')!;
  const brush = document.querySelector('metro-image-brush')!;
  brush.src = testImage;
  const footer = page.getByRole('button', { name: 'Confirm' });
  await expect.element(footer).toBeVisible();
  const button = footer.element();
  control.content = '<strong>literal</strong>';
  await expect.element(page.getByText('<strong>literal</strong>', { exact: true })).toBeVisible();
  expect(control.shadowRoot?.querySelector('strong')).toBeNull();
  expect(footer.element()).toBe(button);
  const link = page.getByRole('link', { name: 'Go to record' });
  const activating = vi.fn(event => event.preventDefault());
  link.element().addEventListener('click', activating);
  await link.click();
  expect(activating).toHaveBeenCalledOnce();
});

test('ContentControl wraps header and footer labels and keeps native actions focused during a content update', async () => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }
    metro-content-control > :is(input, button) { font: inherit; box-sizing: border-box; }</style>
    <metro-content-control style="width:240px; --metro-content-padding: 16px">
      <strong slot="header">Dokumenteneigenschaften</strong>
      <input aria-label="Caption" size="40">
      <button slot="footer" type="button">Änderungszusammenfassung</button>
    </metro-content-control>`;
  const control = document.querySelector('metro-content-control')!;
  const field = page.getByRole('textbox', { name: 'Caption' });
  const save = page.getByRole('button', { name: 'Änderungszusammenfassung' });
  await expect.element(save).toBeVisible();
  const bounds = control.getBoundingClientRect();
  const fits = (rect: DOMRect) => {
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left + 16 - 1);
    expect(rect.right).toBeLessThanOrEqual(bounds.right - 16 + 1);
  };
  fits(field.element().getBoundingClientRect());
  fits(save.element().getBoundingClientRect());
  for (const item of [control.querySelector('[slot="header"]')!, save.element()]) {
    const text = document.createRange();
    text.selectNodeContents(item);
    expect(text.getClientRects().length).toBeGreaterThan(1);
    for (const line of text.getClientRects()) fits(line);
  }
  const activate = vi.fn();
  save.element().addEventListener('click', activate);
  (field.element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(save).toHaveFocus();
  control.content = 'Dokumentenverarbeitungsstatus';
  await control.updateComplete;
  await expect.element(save).toHaveFocus();
  const text = document.createRange();
  text.selectNodeContents(control.shadowRoot!.querySelector('[part="content"]')!);
  expect(text.getClientRects().length).toBeGreaterThan(1);
  for (const line of text.getClientRects()) fits(line);
  await userEvent.keyboard('{Enter}');
  expect(activate).toHaveBeenCalledOnce();
});

test('title bar exposes only implemented host actions and supports cancelable requests', async () => {
  const bar = document.createElement('metro-title-bar');
  bar.heading = 'Photo workspace';
  bar.overlay = true;
  const minimize = vi.fn();
  const error = new Error('Host refused to close');
  bar.windowAdapter = { minimize, close: async () => { throw error; } };
  document.body.append(bar);
  await expect.element(page.getByText('Photo workspace')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Maximize' })).not.toBeInTheDocument();
  expect(bar.overlayVisible).toBe(false);
  bar.addEventListener('metro-window-action', event => event.preventDefault(), { once: true });
  await expect(bar.invoke('minimize')).resolves.toBe(false);
  expect(minimize).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Minimize' }).click();
  expect(minimize).toHaveBeenCalledOnce();
  let received: unknown;
  bar.addEventListener('metro-window-action-error', event => { received = event.detail.error; });
  await page.getByRole('button', { name: 'Close window' }).click();
  await expect.poll(() => received).toBe(error);
});

test('TitleBar keeps keyboard focus and blocks conflicting window actions while the host is pending', async () => {
  const bar = document.createElement('metro-title-bar');
  const restored = vi.fn();
  let complete!: () => void;
  const maximize = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  bar.windowAdapter = { maximize, restore: restored };
  document.body.append(bar);
  const button = page.getByRole('button', { name: 'Maximize' });
  await expect.element(button).toBeVisible();
  (button.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(button).toBeDisabled();
  expect(bar.shadowRoot?.activeElement).toBe(button.element());
  await userEvent.keyboard('{Enter}');
  expect(maximize).toHaveBeenCalledOnce();

  bar.maximized = true;
  const restore = page.getByRole('button', { name: 'Restore' });
  await expect.element(restore).toBeDisabled();
  expect(bar.shadowRoot?.activeElement).toBe(restore.element());
  await userEvent.keyboard('{Enter}');
  expect(restored).not.toHaveBeenCalled();
  complete();
  await expect.element(restore).toBeEnabled();
  expect(bar.shadowRoot?.activeElement).toBe(restore.element());
  await userEvent.keyboard('{Enter}');
  expect(restored).toHaveBeenCalledOnce();
});

test.each(['ltr', 'rtl'])('TitleBar keeps the title and controls visible at 320 px and 200%% text in %s', async direction => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }
    metro-title-bar > button { font: inherit; }</style>
    <metro-title-bar heading="Маршрут" dir="${direction}" style="width:320px">
      <button type="button" slot="start">Menu</button>
      <button type="button" slot="actions">Inspect</button>
    </metro-title-bar>`;
  const bar = document.querySelector('metro-title-bar')!;
  const close = vi.fn();
  bar.windowAdapter = { minimize() {}, maximize() {}, close };
  await bar.updateComplete;
  const root = bar.shadowRoot!;
  await expect.element(page.getByRole('button', { name: 'Close window' })).toBeVisible();
  const heading = root.querySelector<HTMLElement>('[part="title"]')!;
  const bounds = bar.getBoundingClientRect();
  expect(heading.clientWidth).toBeGreaterThan(0);
  expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth + 1);
  const actions = [...root.querySelectorAll<HTMLButtonElement>('button')];
  for (const control of [...actions, ...bar.querySelectorAll('button')]) {
    const rect = control.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
    expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
    expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
  }
  for (const action of actions) expect(action.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  const [minimize, , closeButton] = actions;
  expect(direction === 'rtl' ? closeButton.offsetLeft : minimize.offsetLeft)
    .toBeLessThan(direction === 'rtl' ? minimize.offsetLeft : closeButton.offsetLeft);
  bar.querySelector<HTMLButtonElement>('[slot="actions"]')!.focus();
  await userEvent.keyboard('{Tab}{Tab}{Tab}{Enter}');
  expect(root.activeElement).toBe(closeButton);
  expect(close).toHaveBeenCalledOnce();
});

test('embedded local documents navigate inside the viewer, then Back and retry preserve the host route', async () => {
  const view = document.createElement('metro-web-view');
  view.historyEnabled = true;
  view.src = '/tests/fixtures/web-view/first.html';
  document.body.append(view);
  await expect.poll(() => view.frame?.contentDocument?.title).toBe('Field notes');
  await expect.poll(() => view.state).toBe('ready');
  expect(view.frame?.sandbox.contains('allow-scripts')).toBe(false);
  const hostLocation = location.href;
  const first = view.frame!;
  const embedded = first.contentDocument!;
  const draft = embedded.querySelector('input')!;
  draft.value = 'unsaved edit';
  embedded.querySelector<HTMLAnchorElement>('a[href="#draft"]')!.click();
  await expect.poll(() => new URL(view.url).hash).toBe('#draft');
  expect(new URL(embedded.URL).hash).toBe('#draft');
  expect(view.frame).toBe(first);
  expect(first.contentDocument).toBe(embedded);
  expect(draft.value).toBe('unsaved edit');
  await page.getByRole('button', { name: 'Back' }).click();
  expect(view.frame).toBe(first);
  expect(first.contentDocument).toBe(embedded);
  expect(draft.value).toBe('unsaved edit');
  expect(new URL(view.url).hash).toBe('');
  expect(new URL(embedded.URL).hash).toBe('');
  await page.getByRole('button', { name: 'Forward' }).click();
  expect(view.frame?.contentDocument).toBe(embedded);
  expect(new URL(embedded.URL).hash).toBe('#draft');
  expect(draft.value).toBe('unsaved edit');
  await page.getByRole('button', { name: 'Back' }).click();
  embedded.querySelector('a')!.click();
  await expect.poll(() => view.frame?.contentDocument?.title).toBe('Second note');
  await expect.poll(() => view.canGoBack).toBe(true);
  expect(view.frame?.contentDocument).not.toBe(embedded);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect.poll(() => view.frame?.contentDocument?.title).toBe('Field notes');
  expect(view.canGoForward).toBe(true);
  expect(location.href).toBe(hostLocation);
  view.reportError('Host could not read document');
  await expect.element(page.getByRole('alert')).toHaveTextContent('Host could not read document');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect.poll(() => view.state).toBe('ready');
  expect(view.navigate('javascript:void(0)')).toBe(false);
});

test('WebView keeps keyboard focus within history controls and returns Retry focus to the document', async () => {
  const view = document.createElement('metro-web-view');
  view.historyEnabled = true;
  view.src = '/tests/fixtures/web-view/first.html';
  document.body.append(view);
  const back = page.getByRole('button', { name: 'Back' });
  const forward = page.getByRole('button', { name: 'Forward' });
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect.poll(() => view.state).toBe('ready');
  expect(view.navigate('#draft')).toBe(true);
  await expect.element(back).toBeEnabled();
  (back.element() as HTMLElement).focus();

  await userEvent.keyboard('{Enter}');
  await expect.element(back).toBeDisabled();
  expect(view.shadowRoot?.activeElement).toBe(forward.element());
  await userEvent.keyboard('{Enter}');
  await expect.element(forward).toBeDisabled();
  expect(view.shadowRoot?.activeElement).toBe(back.element());

  view.frame?.focus();
  view.reportError('Please retry');
  await expect.element(retry).toBeVisible();
  expect(view.shadowRoot?.activeElement).toBe(retry.element());
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => view.state).toBe('ready');
  expect(view.shadowRoot?.activeElement).toBe(view.frame);
  expect(new URL(view.url).hash).toBe('#draft');
});

test('WebView wraps enlarged navigation labels and an unbroken error detail at 320 pixels', async () => {
  document.body.innerHTML = `<style>:root { font-size: 200%; }</style>
    <metro-web-view style="width: 320px" history-enabled
      src="/tests/fixtures/web-view/first.html"
      back-label="Dokumentennavigationsverlauf"
      retry-label="Dokumentenerneutladen"></metro-web-view>`;
  const view = document.querySelector('metro-web-view')!;
  await expect.poll(() => view.state).toBe('ready');
  view.reportError('Fileserververbindungsunterbrechung');
  await expect.element(page.getByRole('alert')).toBeVisible();
  const bounds = view.getBoundingClientRect();
  for (const element of view.shadowRoot!.querySelectorAll('button, [role="alert"]')) {
    const rect = element.getBoundingClientRect();
    const text = document.createRange();
    text.selectNodeContents(element);
    const textBounds = text.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
    expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
    expect(textBounds.right).toBeLessThanOrEqual(rect.right + 1);
  }
});

test('WebView cancels a timed-out document and Retry loads it once without adding history', async () => {
  expect(await commands.webViewTimeout()).toEqual({
    afterTimeout: { state: 'error', hasFrame: false, title: null, errors: 1, loads: 0, canGoBack: false },
    afterRetry: { state: 'ready', hasFrame: true, title: 'Retried document', errors: 1, loads: 1, canGoBack: false },
    requests: 2,
  });
});
