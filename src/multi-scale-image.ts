import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import './image.js';
import './icon.js';
import type { MetroImageLoadDetail } from './image.js';
import { metroTheme } from './theme.js';

interface Point { x: number; y: number; }
type Size = { width: number; height: number };

/** Pan coordinates are fractions of the available travel, from -1 to 1. */
export interface MetroImageView extends Point { zoom: number; }

const bounded = (number: number, min: number, max: number) =>
  Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;

export class MetroMultiScaleImage extends LitElement {
  static override properties = {
    src: { type: String },
    alt: { type: String },
    label: { type: String },
    maxZoom: { type: Number, attribute: 'max-zoom' },
    zoom: { type: Number, reflect: true, noAccessor: true },
    zoomInLabel: { type: String, attribute: 'zoom-in-label' },
    zoomOutLabel: { type: String, attribute: 'zoom-out-label' },
    resetLabel: { type: String, attribute: 'reset-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }
    .viewport {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: var(--metro-image-aspect, 16 / 10);
      background: var(--metro-image-surround, var(--_metro-chrome));
      overflow: clip;
      touch-action: pan-y;
    }
    .viewport[data-metro-no-swipe] { cursor: grab; touch-action: none; }
    .viewport[data-metro-no-swipe]:active { cursor: grabbing; }
    metro-image {
      --metro-image-width: 100%;
      --metro-image-height: 100%;
      position: absolute;
      inset: 0;
      user-select: none;
      pointer-events: none;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .5rem min(.5rem, 2%);
      padding-block-start: .4rem;
    }
    button {
      display: grid;
      place-items: center;
      min-inline-size: 44px;
      min-block-size: 44px;
      padding: .125em;
      border: 2px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button metro-icon { --metro-icon-size: min(1.25em, 32px); }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .viewport:focus-visible::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      border: 2px solid var(--_metro-focus);
      box-shadow: inset 0 0 0 1px var(--_metro-bg);
    }
    output {
      min-inline-size: 4ch;
      padding-inline: min(.3rem, 1%);
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    @media (forced-colors: active) {
      button:focus-visible { outline-color: Highlight; }
      .viewport:focus-visible::after { border-color: Highlight; }
    }
  `];

  declare src: string;
  declare alt: string;
  declare label: string;
  declare maxZoom: number;
  declare zoomInLabel: string;
  declare zoomOutLabel: string;
  declare resetLabel: string;

  #pan: Point = { x: 0, y: 0 };
  #zoom = NaN;
  #viewport: Size = { width: 0, height: 0 };
  #image?: Size;
  #failed = false;
  #points = new Map<number, Point>();
  #initial?: MetroImageView;
  #dragging = false;
  #focusedButton?: HTMLButtonElement;
  #resize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (width === this.#viewport.width && height === this.#viewport.height) return;
    this.#rollbackGesture();
    this.#viewport = { width, height };
    this.requestUpdate();
  });

  constructor() {
    super();
    this.src = '';
    this.alt = '';
    this.label = 'Image viewer';
    this.maxZoom = 4;
    this.zoom = 1;
    this.zoomInLabel = 'Zoom in';
    this.zoomOutLabel = 'Zoom out';
    this.resetLabel = 'Reset zoom';
  }

  get zoom(): number { return this.#zoom; }
  set zoom(value: number) {
    this.#rollbackGesture();
    this.#setZoom(value);
    if (this.#scale === 1) this.#pan = { x: 0, y: 0 };
  }

  #setZoom(value: number): void {
    const previous = this.#zoom;
    this.#zoom = value;
    this.requestUpdate('zoom', previous);
  }

  get view(): MetroImageView { return { zoom: this.#scale, x: this.#pan.x, y: this.#pan.y }; }
  set view(view: MetroImageView) {
    this.#cancelGesture();
    this.#setZoom(bounded(view.zoom, 1, this.#limit));
    const fraction = (value: number) => Number.isFinite(value) ? bounded(value, -1, 1) : 0;
    this.#pan = this.zoom === 1 ? { x: 0, y: 0 } : { x: fraction(view.x), y: fraction(view.y) };
    this.requestUpdate();
  }

  get #limit() { return Number.isFinite(this.maxZoom) ? Math.max(1, this.maxZoom) : 4; }
  get #scale() { return bounded(this.zoom, 1, this.#limit); }

  override connectedCallback(): void {
    super.connectedCallback();
    const viewport = this.shadowRoot?.querySelector('.viewport');
    if (viewport) this.#resize.observe(viewport);
  }

  override disconnectedCallback(): void {
    this.#resize.disconnect();
    this.#rollbackGesture();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    const viewport = this.shadowRoot?.querySelector('.viewport');
    if (viewport && this.isConnected) this.#resize.observe(viewport);
  }

  protected override willUpdate(changes: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedButton = active instanceof HTMLButtonElement ? active : undefined;
    if (changes.has('src')) {
      this.#image = undefined;
      if (!this.src) this.#failed = false;
    }
    if (changes.has('src') || changes.has('maxZoom')) this.#rollbackGesture();
  }

  protected override updated(): void {
    const button = this.#focusedButton;
    if (!button?.disabled) return;
    const root = this.shadowRoot;
    const owner = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (owner && owner !== this && owner !== this.ownerDocument.body) return;
    if (!root?.activeElement || root.activeElement === button) {
      root?.querySelector<HTMLElement>('.viewport')?.focus({ preventScroll: true });
    }
  }

  #cancelGesture(): void {
    if (!this.#points.size && !this.#initial) return;
    const captured = Array.from(this.#points.keys());
    this.#points.clear();
    this.#initial = undefined;
    this.#dragging = false;
    const viewport = this.renderRoot.querySelector('.viewport');
    for (const pointer of captured) {
      if (viewport?.hasPointerCapture(pointer)) viewport.releasePointerCapture(pointer);
    }
  }

  #rollbackGesture(): void {
    if (this.#initial) this.view = this.#initial;
  }

  #bounds(scale = this.#scale): Point {
    const { width, height } = this.#viewport;
    const image = this.#image;
    const fit = image ? Math.min(width / image.width, height / image.height) : 1;
    return {
      x: Math.max(0, ((image ? image.width * fit : width) * scale - width) / 2),
      y: Math.max(0, ((image ? image.height * fit : height) * scale - height) / 2),
    };
  }

  #px(): Point {
    const bounds = this.#bounds();
    return { x: this.#pan.x * bounds.x, y: this.#pan.y * bounds.y };
  }

  #place(x: number, y: number): void {
    const bounds = this.#bounds();
    this.#pan = {
      x: bounds.x ? bounded(x / bounds.x, -1, 1) : 0,
      y: bounds.y ? bounded(y / bounds.y, -1, 1) : 0,
    };
    this.requestUpdate();
  }

  #setScale(zoom: number, point: Point = { x: 0, y: 0 }, shift: Point = { x: 0, y: 0 }) {
    const offset = this.#px();
    const next = bounded(zoom, 1, this.#limit);
    const ratio = next / this.#scale;
    this.#setZoom(next);
    this.#place(point.x + (offset.x - point.x) * ratio + shift.x, point.y + (offset.y - point.y) * ratio + shift.y);
  }

  #commit(before: MetroImageView): void {
    const after = this.view;
    if (after.zoom === before.zoom && after.x === before.x && after.y === before.y) return;
    this.dispatchEvent(new CustomEvent('metro-image-view-change', {
      detail: after, bubbles: true, composed: true,
    }));
  }

  #step(factor: number | 'reset', point?: Point) {
    if (this.#failed) return;
    this.#rollbackGesture();
    const previous = this.view;
    this.#setScale(factor === 'reset' ? 1 : this.#scale * factor, point);
    this.#commit(previous);
  }

  #position(event: PointerEvent | MouseEvent): Point {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: event.clientX - (box.left + box.width / 2), y: event.clientY - (box.top + box.height / 2) };
  }

  #start = (event: PointerEvent) => {
    if (this.#failed || this.#limit === 1 || (event.pointerType !== 'touch' && (event.button !== 0 || this.#scale === 1))
      || this.#points.size >= 2) return;
    if (!this.#points.size) this.#initial = this.view;
    this.#points.set(event.pointerId, this.#position(event));
    if (this.#scale > 1 || this.#points.size === 2) {
      event.stopPropagation();
      if (event.isTrusted) (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
  };

  #move = (event: PointerEvent) => {
    const start = this.#points.get(event.pointerId);
    if (!start) return;
    const end = this.#position(event);
    this.#points.set(event.pointerId, end);
    if (this.#points.size === 2) {
      const other = Array.from(this.#points).find(([id]) => id !== event.pointerId)![1];
      const before = Math.hypot(start.x - other.x, start.y - other.y);
      const after = Math.hypot(end.x - other.x, end.y - other.y);
      const center = { x: (start.x + other.x) / 2, y: (start.y + other.y) / 2 };
      this.#setScale(this.#scale * (before > 0 ? after / before : 1), center, {
        x: (end.x - start.x) / 2, y: (end.y - start.y) / 2,
      });
    } else if (this.#scale > 1) {
      const offset = this.#px();
      this.#place(offset.x + end.x - start.x, offset.y + end.y - start.y);
    } else return;
    this.#dragging = true;
    event.stopPropagation();
  };

  #finish = (event: PointerEvent) => {
    if (!this.#points.has(event.pointerId)) return;
    if (this.#dragging) event.stopPropagation();
    if (event.type !== 'pointerup') {
      this.#rollbackGesture();
      return;
    }
    this.#points.delete(event.pointerId);
    if (this.#points.size) return;
    const initial = this.#initial;
    this.#initial = undefined;
    this.#dragging = false;
    if (initial) this.#commit(initial);
  };

  #keydown = (event: KeyboardEvent) => {
    if (this.#failed || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case '+':
      case '=': this.#step(1.5); break;
      case '-': this.#step(1 / 1.5); break;
      case 'Home':
        if (this.#scale === 1) return;
        this.#step('reset');
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (this.#scale === 1) return;
        this.#rollbackGesture();
        const before = this.view;
        const offset = this.#px();
        this.#place(offset.x + (event.key === 'ArrowLeft' ? 32 : event.key === 'ArrowRight' ? -32 : 0),
          offset.y + (event.key === 'ArrowUp' ? 32 : event.key === 'ArrowDown' ? -32 : 0));
        this.#commit(before);
        break;
      }
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  #loaded = (event: CustomEvent<MetroImageLoadDetail>) => {
    this.#failed = false;
    this.#image = event.detail.width && event.detail.height ? event.detail : undefined;
    this.requestUpdate();
  };

  #onImageError = () => {
    this.#rollbackGesture();
    this.#image = undefined;
    this.#failed = true;
    this.requestUpdate();
  };

  protected override render() {
    const zoom = this.#scale;
    const { x, y } = this.#px();
    const transform = this.#failed || !this.src ? 'none' : `translate(${x}px, ${y}px) scale(${zoom})`;
    return html`
      <div class="viewport" part="viewport" tabindex="0" role="region" aria-label=${this.label || 'Image viewer'}
        ?data-metro-no-swipe=${!this.#failed && zoom > 1} @keydown=${this.#keydown} @pointerdown=${this.#start} @pointermove=${this.#move}
        @pointerup=${this.#finish} @pointercancel=${this.#finish} @lostpointercapture=${this.#finish}
        @dblclick=${(event: MouseEvent) => this.#step(zoom > 1 ? 'reset' : 2, this.#position(event))}>
        <metro-image part="surface" exportparts="image, fallback" .src=${this.src} .alt=${this.alt}
          @metro-image-load=${this.#loaded} @metro-image-error=${this.#onImageError}
          style=${`transform: ${transform}`}></metro-image>
      </div>
      <div class="controls" part="controls">
        <button type="button" part="zoom-out" aria-label=${this.zoomOutLabel} ?disabled=${this.#failed || zoom === 1}
          @click=${() => this.#step(1 / 1.5)}><metro-icon name="minus"></metro-icon></button>
        <output part="position">${this.#failed ? '—' : `${Math.round(zoom * 100)}%`}</output>
        <button type="button" part="zoom-in" aria-label=${this.zoomInLabel} ?disabled=${this.#failed || zoom === this.#limit}
          @click=${() => this.#step(1.5)}><metro-icon name="add"></metro-icon></button>
        <button type="button" part="reset" aria-label=${this.resetLabel} ?disabled=${this.#failed || zoom === 1}
          @click=${() => this.#step('reset')}><metro-icon name="refresh"></metro-icon></button>
      </div>
    `;
  }
}

defineElement('metro-multi-scale-image', MetroMultiScaleImage);

declare global {
  interface HTMLElementTagNameMap { 'metro-multi-scale-image': MetroMultiScaleImage; }
  interface HTMLElementEventMap { 'metro-image-view-change': CustomEvent<MetroImageView>; }
}
