import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroInkTool = 'pen' | 'eraser';
export interface MetroInkPoint { x: number; y: number; pressure?: number }
export interface MetroInkStroke {
  tool: MetroInkTool;
  color: string;
  width: number;
  points: readonly MetroInkPoint[];
}

export interface MetroInkChangeDetail {
  reason: 'draw' | 'erase' | 'undo' | 'clear' | 'remove';
  strokes: readonly MetroInkStroke[];
}

interface PendingStroke {
  pointer: number;
  width: number;
  height: number;
  stroke: MetroInkStroke & { points: MetroInkPoint[] };
}

const defaultColor = '#0050ef';

function inkColor(color: unknown): color is string {
  return typeof color === 'string' && /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color);
}

function widthOf(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(96, Math.max(.5, value)) : fallback;
}

function unit(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function copyStrokes(value: unknown): MetroInkStroke[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strokes: MetroInkStroke[] = [];
  for (const stroke of value) {
    if (!stroke || (stroke.tool !== 'pen' && stroke.tool !== 'eraser') || !inkColor(stroke.color)
      || typeof stroke.width !== 'number' || !Number.isFinite(stroke.width) || stroke.width < .5 || stroke.width > 96
      || !Array.isArray(stroke.points) || !stroke.points.length) return undefined;
    const points: MetroInkPoint[] = [];
    for (const point of stroke.points) {
      if (!point || !unit(point.x) || !unit(point.y) || (point.pressure !== undefined && !unit(point.pressure))) {
        return undefined;
      }
      points.push({ x: point.x, y: point.y, ...(point.pressure !== undefined && { pressure: point.pressure }) });
    }
    strokes.push({ tool: stroke.tool, color: stroke.color, width: stroke.width, points });
  }
  return strokes;
}

export class MetroInkCanvas extends LitElement {
  static override properties = {
    strokes: { attribute: false, noAccessor: true },
    tool: { type: String, reflect: true },
    color: { type: String },
    strokeWidth: { type: Number, attribute: 'stroke-width' },
    eraserWidth: { type: Number, attribute: 'eraser-width' },
    drawTouch: { type: Boolean, reflect: true, attribute: 'draw-touch' },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    toolsLabel: { type: String, attribute: 'tools-label' },
    penLabel: { type: String, attribute: 'pen-label' },
    eraserLabel: { type: String, attribute: 'eraser-label' },
    touchLabel: { type: String, attribute: 'touch-label' },
    undoLabel: { type: String, attribute: 'undo-label' },
    clearLabel: { type: String, attribute: 'clear-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .tools { display: flex; align-items: center; flex-wrap: wrap; gap: .375rem; margin-block-end: .5rem; }
    button {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem .5rem;
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 600 1.125rem / 1.2 var(--_metro-font);
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button[aria-pressed="true"], button:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -7px; }
    button[aria-pressed="true"]:focus-visible { outline-color: var(--_metro-on-accent); }

    .surface {
      border: 3px solid var(--metro-ink-border, var(--_metro-border));
      background: var(--metro-ink-bg, var(--_metro-bg));
    }
    canvas {
      display: block;
      inline-size: 100%;
      block-size: var(--metro-ink-height, 12rem);
      touch-action: pan-y pinch-zoom;
      cursor: crosshair;
      user-select: none;
    }
    :host([draw-touch]:not([disabled])) canvas { touch-action: none; }
    :host([disabled]) canvas { cursor: default; }
    .description { color: var(--_metro-muted); margin-block: .5rem 0; font-size: 1rem; }
    .status { position: absolute; inline-size: 1px; block-size: 1px; clip-path: inset(50%); overflow: hidden; }

    @media (forced-colors: active) {
      .surface { border-color: CanvasText; }
      button[aria-pressed="true"] { forced-color-adjust: none; background: Highlight; color: HighlightText; }
      button:focus-visible { outline-color: Highlight; }
      button[aria-pressed="true"]:focus-visible { outline-color: HighlightText; }
    }
  `];

  declare tool: MetroInkTool;
  declare color: string;
  declare strokeWidth: number;
  declare eraserWidth: number;
  declare drawTouch: boolean;
  declare disabled: boolean;
  declare label: string;
  declare toolsLabel: string;
  declare penLabel: string;
  declare eraserLabel: string;
  declare touchLabel: string;
  declare undoLabel: string;
  declare clearLabel: string;

  #strokes: MetroInkStroke[] = [];
  #pending: PendingStroke | undefined;
  #resize: ResizeObserver | undefined;
  #listeners: AbortController | undefined;
  #frame: number | undefined;
  #restoreToolFocus = false;

  constructor() {
    super();
    this.tool = 'pen';
    this.color = defaultColor;
    this.strokeWidth = 3;
    this.eraserWidth = 24;
    this.drawTouch = false;
    this.disabled = false;
    this.label = 'Ink canvas';
    this.toolsLabel = 'Ink tools';
    this.penLabel = 'Pen';
    this.eraserLabel = 'Eraser';
    this.touchLabel = 'Draw with touch';
    this.undoLabel = 'Undo';
    this.clearLabel = 'Clear';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#listeners = new AbortController();
    this.ownerDocument.defaultView?.addEventListener('resize', this.#onResize, { signal: this.#listeners.signal });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#listeners?.abort();
    this.#resize?.disconnect();
    this.#resize = undefined;
    this.#cancelStroke();
    if (this.#frame !== undefined) this.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    this.#restoreToolFocus = !this.disabled && !this.#strokes.length
      && this.shadowRoot?.activeElement?.matches('[part="undo"], [part="clear"]') === true;
  }

  protected override updated(): void {
    const canvas = this.#canvas;
    if (canvas && !this.#resize && this.isConnected) {
      this.#resize = new ResizeObserver(this.#onResize);
      this.#resize.observe(canvas);
    }
    if (this.disabled) this.#cancelStroke();
    if (this.#restoreToolFocus) {
      this.shadowRoot?.querySelector<HTMLButtonElement>(`[part="${this.#tool}"]`)?.focus({ preventScroll: true });
    }
    this.#queuePaint();
  }

  get strokes(): readonly MetroInkStroke[] {
    return this.#strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ ...point })) }));
  }

  set strokes(value: readonly MetroInkStroke[]) {
    const copy = copyStrokes(value);
    if (copy) this.#replace(copy);
  }

  serialize(): string { return JSON.stringify({ version: 1, strokes: this.#strokes }); }

  restore(json: string): boolean {
    try {
      const value = JSON.parse(json);
      const strokes = value?.version === 1 ? copyStrokes(value.strokes) : undefined;
      if (!strokes) return false;
      this.#replace(strokes);
      return true;
    } catch {
      return false;
    }
  }

  undo(): boolean {
    if (this.disabled || !this.#strokes.length) return false;
    this.#replace(this.#strokes.slice(0, -1));
    this.#emit('undo');
    return true;
  }

  clear(): boolean {
    if (this.disabled || !this.#strokes.length) return false;
    this.#replace([]);
    this.#emit('clear');
    return true;
  }

  removeStroke(index: number): boolean {
    if (this.disabled || !Number.isInteger(index) || index < 0 || index >= this.#strokes.length) return false;
    this.#replace(this.#strokes.filter((_, position) => position !== index));
    this.#emit('remove');
    return true;
  }

  #replace(strokes: MetroInkStroke[]): void {
    this.#cancelStroke();
    this.#strokes = strokes;
    this.requestUpdate();
  }

  #emit(reason: MetroInkChangeDetail['reason']): void {
    this.dispatchEvent(new CustomEvent<MetroInkChangeDetail>('metro-ink-change', {
      detail: { reason, strokes: this.strokes }, bubbles: true, composed: true,
    }));
  }

  get #canvas() { return this.shadowRoot?.querySelector('canvas') ?? null; }
  get #tool(): MetroInkTool { return this.tool === 'eraser' ? 'eraser' : 'pen'; }

  #onPointerDown(event: PointerEvent): void {
    if (this.disabled || this.#pending || !event.isPrimary || event.button !== 0
      || (event.pointerType === 'touch' && !this.drawTouch)) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    try { canvas.setPointerCapture(event.pointerId); } catch { return; }
    event.preventDefault();
    const tool = this.#tool;
    this.#pending = {
      pointer: event.pointerId,
      width: bounds.width,
      height: bounds.height,
      stroke: {
        tool,
        color: inkColor(this.color) ? this.color : defaultColor,
        width: tool === 'pen' ? widthOf(this.strokeWidth, 3) : widthOf(this.eraserWidth, 24),
        points: [this.#point(event, bounds)],
      },
    };
    this.#queuePaint();
  }

  #onPointerMove(event: PointerEvent): void {
    const pending = this.#pending;
    if (!pending || pending.pointer !== event.pointerId || this.disabled) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (bounds.width !== pending.width || bounds.height !== pending.height) {
      this.#cancelStroke();
      return;
    }
    const samples = event.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [event]) this.#appendPoint(pending, sample, bounds);
    this.#queuePaint();
  }

  #onPointerUp(event: PointerEvent): void {
    const pending = this.#pending;
    if (!pending || pending.pointer !== event.pointerId) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.#cancelStroke();
    if (this.disabled || bounds.width !== pending.width || bounds.height !== pending.height) return;
    this.#appendPoint(pending, event, bounds);
    this.#strokes = [...this.#strokes, pending.stroke];
    this.requestUpdate();
    this.#emit(pending.stroke.tool === 'pen' ? 'draw' : 'erase');
  }

  #onPointerCancel(event: PointerEvent): void {
    if (event.pointerId === this.#pending?.pointer) this.#cancelStroke();
  }

  #onResize = (): void => {
    const pending = this.#pending;
    const bounds = pending && this.#canvas?.getBoundingClientRect();
    if (bounds && (bounds.width !== pending.width || bounds.height !== pending.height)) this.#cancelStroke();
    this.#queuePaint();
  };

  #cancelStroke(): void {
    const pending = this.#pending;
    if (!pending) return;
    this.#pending = undefined;
    const canvas = this.#canvas;
    if (canvas?.hasPointerCapture(pending.pointer)) canvas.releasePointerCapture(pending.pointer);
    this.#queuePaint();
  }

  #point(event: PointerEvent, bounds: DOMRect): MetroInkPoint {
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
      ...(event.pointerType === 'pen' && event.pressure > 0 && { pressure: event.pressure }),
    };
  }

  #appendPoint(pending: PendingStroke, event: PointerEvent, bounds: DOMRect): void {
    const next = this.#point(event, bounds);
    const previous = pending.stroke.points.at(-1)!;
    if (next.x !== previous.x || next.y !== previous.y) pending.stroke.points.push(next);
  }

  #queuePaint = (): void => {
    const view = this.ownerDocument.defaultView;
    if (!view || !this.isConnected || this.#frame !== undefined) return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#paint();
    });
  };

  #paint(): void {
    const canvas = this.#canvas;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = this.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const pixelsWide = Math.max(1, Math.min(8192, Math.round(width * ratio)));
    const pixelsHigh = Math.max(1, Math.min(8192, Math.round(height * ratio)));
    if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
    if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const stroke of this.#strokes) this.#paintStroke(context, stroke, width, height);
    if (this.#pending) this.#paintStroke(context, this.#pending.stroke, width, height);
  }

  #paintStroke(context: CanvasRenderingContext2D, stroke: MetroInkStroke, width: number, height: number): void {
    context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const first = stroke.points[0];
    const pressure = (point: MetroInkPoint) => point.pressure === undefined ? 1 : .5 + point.pressure;
    context.beginPath();
    context.arc(first.x * width, first.y * height, stroke.width * pressure(first) / 2, 0, Math.PI * 2);
    context.fill();
    for (let index = 1; index < stroke.points.length; index++) {
      const previous = stroke.points[index - 1];
      const next = stroke.points[index];
      context.lineWidth = stroke.width * (pressure(previous) + pressure(next)) / 2;
      context.beginPath();
      context.moveTo(previous.x * width, previous.y * height);
      context.lineTo(next.x * width, next.y * height);
      context.stroke();
    }
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey)
      || event.key.toLowerCase() !== 'z') return;
    if (this.undo()) event.preventDefault();
  }

  protected override render() {
    return html`
      <div>
        <div class="tools" part="tools" role="group" aria-label=${this.toolsLabel} @keydown=${this.#onKeydown}>
          <button type="button" part="pen" aria-pressed=${String(this.#tool === 'pen')}
            ?disabled=${this.disabled} @click=${() => { this.tool = 'pen'; }}>${this.penLabel}</button>
          <button type="button" part="eraser" aria-pressed=${String(this.#tool === 'eraser')}
            ?disabled=${this.disabled} @click=${() => { this.tool = 'eraser'; }}>${this.eraserLabel}</button>
          <button type="button" part="touch" aria-pressed=${String(this.drawTouch)}
            ?disabled=${this.disabled} @click=${() => { this.drawTouch = !this.drawTouch; }}>${this.touchLabel}</button>
          <button type="button" part="undo" ?disabled=${this.disabled || !this.#strokes.length} @click=${this.undo}>${this.undoLabel}</button>
          <button type="button" part="clear" ?disabled=${this.disabled || !this.#strokes.length} @click=${this.clear}>${this.clearLabel}</button>
        </div>
        <div class="surface" part="surface">
          <canvas part="canvas" role="img" aria-label=${this.label} aria-describedby="description"
            @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
            @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onPointerCancel}></canvas>
        </div>
        <p id="description" class="description" part="description"><slot name="description">Draw with a pen or mouse.</slot></p>
        <div class="status" part="status" role="status" aria-atomic="true">${this.#strokes.length} ${this.#strokes.length === 1 ? 'stroke' : 'strokes'}</div>
      </div>
    `;
  }
}

defineElement('metro-ink-canvas', MetroInkCanvas);

declare global {
  interface HTMLElementTagNameMap { 'metro-ink-canvas': MetroInkCanvas }
  interface HTMLElementEventMap { 'metro-ink-change': CustomEvent<MetroInkChangeDetail> }
}
