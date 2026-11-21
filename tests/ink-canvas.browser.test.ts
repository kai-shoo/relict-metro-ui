import { afterEach, describe, expect, test } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/ink-canvas.js';
import type { MetroInkChangeDetail, MetroInkStroke } from '../src/ink-canvas.js';

declare module 'vitest/browser' {
  interface BrowserCommands {
    inkCanvasTouch(): Promise<{
      scrollTop: number;
      strokesAfterScroll: number;
      startsAfterScroll: number;
      touchPressed: string | null;
      startsAfterDrawing: number;
      strokesAfterDrawing: number;
      scrollAfterDrawing: number;
      changeReason: string | null;
    }>;
    inkCanvasPen(): Promise<{ pixelRatio: number; backingScale: number; strokes: MetroInkStroke[] }>;
  }
}

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

function location(canvas: HTMLCanvasElement, x: number, y: number) {
  const box = canvas.getBoundingClientRect();
  return { x: box.left + box.width * x, y: box.top + box.height * y };
}

async function draw(canvas: HTMLCanvasElement, start: [number, number], end: [number, number]) {
  await userEvent.pointer([
    { keys: '[MouseLeft>]', coords: location(canvas, ...start) },
    { coords: location(canvas, ...end) },
    '[/MouseLeft]',
  ]);
}

function centerAlpha(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3];
}

describe('Metro ink canvas', () => {
  test.each(['ltr', 'rtl'])('keeps enlarged tool labels in the toolbar and supports Tab and Space in %s', async direction => {
    const container = mount(`
      <style>:root { font-size: 200%; }</style>
      <metro-ink-canvas dir="${direction}" style="width: 320px" tools-label="Инструменты"
        pen-label="Перо для аннотаций" eraser-label="Ластик для аннотаций"
        touch-label="Fingerzeichnungsmodus">
        <span slot="description">Аннотации</span>
      </metro-ink-canvas>`);
    const ink = container.querySelector('metro-ink-canvas')!;
    const tools = page.getByRole('group', { name: 'Инструменты' });
    await expect.element(tools).toBeVisible();
    const toolbar = tools.element();
    const bounds = toolbar.getBoundingClientRect();
    for (const button of toolbar.querySelectorAll('button')) {
      const rect = button.getBoundingClientRect();
      const text = document.createRange();
      text.selectNodeContents(button);
      const label = text.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
      expect(label.left).toBeGreaterThanOrEqual(rect.left - 1);
      expect(label.right).toBeLessThanOrEqual(rect.right + 1);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }

    const pen = page.getByRole('button', { name: 'Перо для аннотаций' });
    const eraser = page.getByRole('button', { name: 'Ластик для аннотаций' });
    const touch = page.getByRole('button', { name: 'Fingerzeichnungsmodus' });
    (pen.element() as HTMLElement).focus();
    await userEvent.keyboard('{Tab} ');
    expect(ink.shadowRoot?.activeElement).toBe(eraser.element());
    const focus = getComputedStyle(eraser.element());
    expect(focus.outlineStyle).toBe('solid');
    expect(focus.outlineOffset).toBe('-7px');
    await expect.element(eraser).toHaveAttribute('aria-pressed', 'true');
    expect(focus.outlineColor).toBe(focus.color);
    expect(focus.outlineColor).not.toBe(focus.backgroundColor);
    await expect.element(pen).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Tab} ');
    expect(ink.shadowRoot?.activeElement).toBe(touch.element());
    await expect.element(touch).toHaveAttribute('aria-pressed', 'true');
  });

  test('paints captured strokes, erases, undoes with the keyboard and restores normalized data', async () => {
    const container = mount('<metro-ink-canvas label="Sketch" style="width: 320px; --metro-ink-height: 160px"></metro-ink-canvas>');
    const ink = container.querySelector('metro-ink-canvas')!;
    const image = page.getByRole('img', { name: 'Sketch' });
    await expect.element(image).toBeVisible();
    const canvas = image.element() as HTMLCanvasElement;
    await expect.poll(() => canvas.width).toBe(Math.round(canvas.clientWidth * window.devicePixelRatio));
    const changes: MetroInkChangeDetail[] = [];
    ink.addEventListener('metro-ink-change', event => changes.push(event.detail));

    await draw(canvas, [.2, .5], [.8, .5]);
    expect(ink.strokes).toHaveLength(1);
    expect(ink.strokes[0].points.at(-1)?.x).toBeCloseTo(.8, 1);
    await expect.poll(() => centerAlpha(canvas)).toBeGreaterThan(0);

    const eraser = page.getByRole('button', { name: 'Eraser' });
    await userEvent.click(eraser);
    await expect.element(eraser).toHaveAttribute('aria-pressed', 'true');
    await draw(canvas, [.5, .25], [.5, .75]);
    expect(ink.strokes[1]?.tool).toBe('eraser');
    await expect.poll(() => centerAlpha(canvas)).toBe(0);
    (eraser.element() as HTMLElement).focus();
    await userEvent.keyboard('{Control>}z{/Control}');
    await expect.poll(() => centerAlpha(canvas)).toBeGreaterThan(0);

    const saved = ink.serialize();
    await userEvent.click(page.getByRole('button', { name: 'Clear' }));
    await expect.poll(() => centerAlpha(canvas)).toBe(0);
    expect(ink.restore('{"version":2,"strokes":[]}')).toBe(false);
    expect(ink.restore(saved)).toBe(true);
    ink.style.width = '460px';
    await expect.poll(() => canvas.width).toBe(Math.round(canvas.clientWidth * window.devicePixelRatio));
    await expect.poll(() => centerAlpha(canvas)).toBeGreaterThan(0);
    expect(changes.map(event => event.reason)).toEqual(['draw', 'erase', 'undo', 'clear']);
    expect(changes[0].strokes).toHaveLength(1);
  });

  test('discards a cancelled pointer and leaves the previously saved drawing intact', async () => {
    const container = mount('<metro-ink-canvas label="Notes" style="width: 320px"></metro-ink-canvas>');
    const ink = container.querySelector('metro-ink-canvas')!;
    const image = page.getByRole('img', { name: 'Notes' });
    await expect.element(image).toBeVisible();
    const canvas = image.element() as HTMLCanvasElement;
    await draw(canvas, [.2, .25], [.6, .25]);
    let pointerId = 0;
    canvas.addEventListener('pointerdown', event => { pointerId = event.pointerId; });
    const changes: string[] = [];
    ink.addEventListener('metro-ink-change', event => changes.push(event.detail.reason));
    await userEvent.pointer([
      { keys: '[MouseLeft>]', coords: location(canvas, .2, .75) },
      { coords: location(canvas, .6, .75) },
    ]);
    expect(canvas.hasPointerCapture(pointerId)).toBe(true);
    canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId, pointerType: 'mouse', bubbles: true }));
    await userEvent.pointer('[/MouseLeft]');
    expect(ink.strokes).toHaveLength(1);
    expect(changes).toEqual([]);
    ink.disabled = true;
    await expect.element(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(ink.clear()).toBe(false);
  });

  test('retains a stroke’s original tool and discards the next stroke when the surface resizes', async () => {
    const container = mount('<metro-ink-canvas label="Sketch" style="width: 320px; --metro-ink-height: 160px"></metro-ink-canvas>');
    const ink = container.querySelector('metro-ink-canvas')!;
    const image = page.getByRole('img', { name: 'Sketch' });
    await expect.element(image).toBeVisible();
    const canvas = image.element() as HTMLCanvasElement;
    const changes: string[] = [];
    let pointerId = 0;
    canvas.addEventListener('pointerdown', event => { pointerId = event.pointerId; });
    ink.addEventListener('metro-ink-change', event => changes.push(event.detail.reason));
    await userEvent.pointer([{ keys: '[MouseLeft>]', coords: location(canvas, .2, .4) }]);
    ink.tool = 'eraser';
    ink.color = '#f00000';
    await ink.updateComplete;
    await userEvent.pointer([{ coords: location(canvas, .8, .4) }, '[/MouseLeft]']);
    expect(ink.strokes[0]).toMatchObject({ tool: 'pen', color: '#0050ef' });
    const saved = ink.serialize();

    await userEvent.pointer([
      { keys: '[MouseLeft>]', coords: location(canvas, .3, .7) },
      { coords: location(canvas, .5, .7) },
    ]);
    expect(canvas.hasPointerCapture(pointerId)).toBe(true);
    ink.style.width = '460px';
    ink.style.setProperty('--metro-ink-height', '220px');
    await expect.poll(() => canvas.hasPointerCapture(pointerId)).toBe(false);
    await userEvent.pointer([{ coords: location(canvas, .8, .7) }, '[/MouseLeft]']);
    expect(ink.serialize()).toBe(saved);
    expect(changes).toEqual(['draw']);
    expect(canvas.hasPointerCapture(pointerId)).toBe(false);

    await draw(canvas, [.5, .25], [.5, .75]);
    expect(ink.strokes[1]?.tool).toBe('eraser');
    expect(changes).toEqual(['draw', 'erase']);
  });

  test('gives native text undo to the slotted editor and keeps focus when ink undo removes the last stroke', async () => {
    const container = mount(`<metro-ink-canvas>
      <label slot="description">Caption <input type="text"></label>
    </metro-ink-canvas>`);
    const ink = container.querySelector('metro-ink-canvas')!;
    const history: string[] = [];
    ink.addEventListener('metro-ink-change', event => history.push(event.detail.reason));
    const stroke = { tool: 'pen' as const, color: '#0050ef', width: 3, points: [{ x: .5, y: .5 }] };
    ink.strokes = [stroke];
    ink.tool = 'eraser';
    const caption = page.getByRole('textbox', { name: 'Caption' });
    await caption.click();
    await userEvent.keyboard('x');
    await userEvent.keyboard('{Control>}z{/Control}');
    expect((caption.element() as HTMLInputElement).value).toBe('');
    expect(ink.strokes).toHaveLength(1);
    expect(history).toEqual([]);

    const undo = page.getByRole('button', { name: 'Undo' });
    (undo.element() as HTMLElement).focus();
    await userEvent.keyboard('{Control>}z{/Control}');
    await expect.element(undo).toBeDisabled();
    expect(ink.strokes).toHaveLength(0);
    expect(history).toEqual(['undo']);
    expect(ink.shadowRoot?.activeElement).toBe(page.getByRole('button', { name: 'Eraser' }).element());

    ink.strokes = [stroke];
    const clear = page.getByRole('button', { name: 'Clear' });
    await expect.element(clear).toBeEnabled();
    (clear.element() as HTMLElement).focus();
    ink.addEventListener('metro-ink-change', () => (caption.element() as HTMLElement).focus(), { once: true });
    await userEvent.keyboard(' ');
    await expect.element(clear).toBeDisabled();
    await expect.element(caption).toHaveFocus();
    expect(history).toEqual(['undo', 'clear']);
  });

  test.skipIf(server.browser !== 'chromium')('lets touch scroll by default and draws only when explicitly enabled', async () => {
    const result = await commands.inkCanvasTouch();
    expect(result.scrollTop).toBeGreaterThan(20);
    expect(result.strokesAfterScroll).toBe(0);
    expect(result.startsAfterScroll).toBe(1);
    expect(result.touchPressed).toBe('true');
    expect(result.startsAfterDrawing).toBe(2);
    expect(result.strokesAfterDrawing).toBe(1);
    expect(result.scrollAfterDrawing).toBe(0);
    expect(result.changeReason).toBe('draw');
  });

  test.skipIf(server.browser !== 'chromium')('records a pressure-sensitive emulated pen stroke', async () => {
    const result = await commands.inkCanvasPen();
    expect(result.pixelRatio).toBe(2);
    expect(result.backingScale).toBe(2);
    expect(result.strokes).toHaveLength(1);
    expect(result.strokes[0].points[0].pressure).toBeCloseTo(.35, 2);
    expect(result.strokes[0].points[1].pressure).toBeCloseTo(.8, 2);
  });
});
