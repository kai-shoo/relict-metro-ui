import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroMapCoordinates { latitude: number; longitude: number }
export interface MetroMapViewport extends MetroMapCoordinates { zoom: number }
export interface MetroMapBounds { north: number; south: number; west: number; east: number }
export interface MetroMapMarker extends MetroMapCoordinates { id: string; label: string; description?: string }
export interface MetroMapLocation extends MetroMapCoordinates { label?: string; accuracy?: number }
export interface MetroMapTile { x: number; y: number; z: number }
export type MetroMapTileSource = (tile: MetroMapTile) => string | undefined | null;
export interface MetroMapViewChangeDetail {
  view: MetroMapViewport;
  bounds: MetroMapBounds;
  reason: 'pan' | 'zoom';
}
export interface MetroMapSelectDetail { id: string; marker: MetroMapMarker }

const size = 256;
const latitudeLimit = 85.05112878;
const zoomLimit = 19;
const finite = (value: number) => Number.isFinite(value) ? value : 0;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const wrap = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;
const zoomOf = (value: number) => clamp(Math.round(finite(value)), 0, zoomLimit);

function normalized(point: MetroMapCoordinates): MetroMapCoordinates {
  return {
    latitude: clamp(finite(point.latitude), -latitudeLimit, latitudeLimit),
    longitude: wrap(finite(point.longitude) + 180, 360) - 180,
  };
}

function coordinate(value: MetroMapCoordinates | null | undefined): value is MetroMapCoordinates {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
}

function project(point: MetroMapCoordinates) {
  const { latitude, longitude } = normalized(point);
  const sin = Math.sin(latitude * Math.PI / 180);
  return { x: (longitude + 180) / 360, y: .5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI) };
}

function unproject(x: number, y: number): MetroMapCoordinates {
  return {
    latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * clamp(y, 0, 1)))) * 180 / Math.PI,
    longitude: wrap(x, 1) * 360 - 180,
  };
}

function moved(view: MetroMapViewport, x: number, y: number): MetroMapViewport {
  const point = project(view);
  const scale = size * 2 ** view.zoom;
  return { ...unproject(point.x + x / scale, point.y + y / scale), zoom: view.zoom };
}

interface PanGesture { pointer: number; x: number; y: number; view: MetroMapViewport }

export class MetroMapView extends LitElement {
  static override properties = {
    latitude: { type: Number },
    longitude: { type: Number },
    zoom: { type: Number },
    view: { attribute: false, noAccessor: true },
    markers: { attribute: false },
    selected: { type: String, reflect: true },
    userLocation: { attribute: false },
    tileSource: { attribute: false },
    locatable: { type: Boolean },
    label: { type: String },
    placesLabel: { type: String, attribute: 'places-label' },
    zoomInLabel: { type: String, attribute: 'zoom-in-label' },
    zoomOutLabel: { type: String, attribute: 'zoom-out-label' },
    locateLabel: { type: String, attribute: 'locate-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .tools { display: flex; flex-wrap: wrap; gap: .375rem; margin-block-end: .5rem; }
    button {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem .625rem;
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 600 1.125rem / 1.2 var(--_metro-font);
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    button:focus-visible, .viewport:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button[aria-pressed="true"], button:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .zoom { min-inline-size: 2.75rem; }

    .viewport {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      block-size: var(--metro-map-height, 21rem);
      border: 3px solid var(--metro-map-border, var(--_metro-border));
      background-color: var(--metro-map-bg, light-dark(#e6eae7, #283631));
      background-image: linear-gradient(to right, #80808033 1px, transparent 1px),
        linear-gradient(to bottom, #80808033 1px, transparent 1px);
      background-size: 48px 48px;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    .viewport[data-panning] { cursor: grabbing; }
    .tile, .pin, .location, .accuracy { position: absolute; inset: 0 auto auto 0; }
    .tile { inline-size: 256px; block-size: 256px; max-inline-size: none; pointer-events: none; }
    .pin {
      z-index: 2;
      display: grid;
      place-items: center;
      inline-size: 2.75rem;
      min-block-size: 2.75rem;
      padding: 0;
      border: 0;
      background: transparent;
      transform: translate(-50%, -50%);
    }
    .pin[aria-pressed="true"], .pin:active:enabled { background: transparent; }
    .pin-mark {
      box-sizing: border-box;
      inline-size: 1.625rem;
      block-size: 1.625rem;
      border: 3px solid var(--metro-map-marker-border, #fff);
      background: var(--metro-map-marker, var(--_metro-accent));
      box-shadow: 0 1px 3px #0008;
    }
    .pin[aria-pressed="true"] .pin-mark { outline: 2px solid var(--metro-map-marker, var(--_metro-accent)); }

    .location, .accuracy {
      z-index: 1;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .location {
      inline-size: .875rem;
      block-size: .875rem;
      border: 2px solid #fff;
      background: var(--metro-map-location, var(--_metro-accent));
    }
    .accuracy {
      background: color-mix(in srgb, var(--metro-map-location, var(--_metro-accent)) 18%, transparent);
      border: 1px solid var(--metro-map-location, var(--_metro-accent));
    }
    .places { display: flex; flex-wrap: wrap; gap: .375rem; margin: .5rem 0 0; padding: 0; list-style: none; }
    .places li { max-inline-size: 100%; min-inline-size: 0; }
    .place { font-weight: 400; }
    .details { margin: .5rem 0 0; overflow-wrap: anywhere; }
    .location-text { margin: .5rem 0 0; color: var(--_metro-muted); }
    .attribution { margin-block-start: .25rem; font-size: .875rem; }
    @media (forced-colors: active) {
      .viewport { border-color: CanvasText; }
      button:focus-visible, .viewport:focus-visible { outline-color: Highlight; }
      .pin-mark, .location { forced-color-adjust: none; background: Highlight; border-color: HighlightText; }
    }
  `];

  declare latitude: number;
  declare longitude: number;
  declare zoom: number;
  declare markers: readonly MetroMapMarker[];
  declare selected: string;
  declare userLocation: MetroMapLocation | null;
  declare tileSource: MetroMapTileSource | undefined;
  declare locatable: boolean;
  declare label: string;
  declare placesLabel: string;
  declare zoomInLabel: string;
  declare zoomOutLabel: string;
  declare locateLabel: string;

  #width = 0;
  #height = 0;
  #resize: ResizeObserver | undefined;
  #gesture: PanGesture | undefined;
  #preview: MetroMapViewport | undefined;
  #focusedControl?: HTMLButtonElement;

  constructor() {
    super();
    this.latitude = 0;
    this.longitude = 0;
    this.zoom = 2;
    this.markers = [];
    this.selected = '';
    this.userLocation = null;
    this.locatable = false;
    this.label = 'Map';
    this.placesLabel = 'Places';
    this.zoomInLabel = 'Zoom in';
    this.zoomOutLabel = 'Zoom out';
    this.locateLabel = 'My location';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = undefined;
    this.#cancelPan();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (this.#gesture && (changed.has('latitude') || changed.has('longitude') || changed.has('zoom'))) this.#cancelPan();
    const active = this.shadowRoot?.activeElement;
    this.#focusedControl = active instanceof HTMLButtonElement ? active : undefined;
  }

  protected override updated(): void {
    const viewport = this.#viewport;
    if (viewport && !this.#resize && this.isConnected) {
      this.#resize = new ResizeObserver(this.#measure);
      this.#resize.observe(viewport);
      this.#measure();
    }
    this.#restoreControlFocus();
  }

  #restoreControlFocus(): void {
    const control = this.#focusedControl;
    if (!control) return;
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (active && active !== this && active !== this.ownerDocument.body) return;
    const local = this.shadowRoot?.activeElement;
    if (local && (local !== control || !control.disabled)) return;
    if (control.isConnected && !control.disabled) control.focus({ preventScroll: true });
    else if (control.dataset.id) this.#focusMarker(control.dataset.id);
    else this.focus({ preventScroll: true });
  }
  get view(): MetroMapViewport { return { ...normalized(this), zoom: zoomOf(this.zoom) }; }
  set view(value: MetroMapViewport) {
    this.#cancelPan();
    const point = normalized(value);
    this.latitude = point.latitude;
    this.longitude = point.longitude;
    this.zoom = zoomOf(value.zoom);
  }

  get bounds(): MetroMapBounds {
    const view = this.view;
    const halfWidth = this.#width / 2;
    const halfHeight = this.#height / 2;
    const northwest = moved(view, -halfWidth, -halfHeight);
    const southeast = moved(view, halfWidth, halfHeight);
    const wraps = this.#width >= size * 2 ** view.zoom;
    return {
      north: northwest.latitude, south: southeast.latitude,
      west: wraps ? -180 : northwest.longitude, east: wraps ? 180 : southeast.longitude,
    };
  }

  override focus(options?: FocusOptions): void { this.#viewport?.focus(options); }

  focusSelectedMarker(): void { this.#focusMarker(this.selected); }

  #focusMarker(id: string): void {
    const buttons = Array.from(this.shadowRoot?.querySelectorAll<HTMLButtonElement>('.place') ?? []);
    (buttons.find(option => option.dataset.id === id)
      ?? buttons.find(option => option.dataset.id === this.selected) ?? buttons[0] ?? this.#viewport)
      ?.focus({ preventScroll: true });
  }

  get #viewport() { return this.shadowRoot?.querySelector<HTMLElement>('.viewport') ?? null; }

  #measure = (): void => {
    const viewport = this.#viewport;
    if (!viewport || (viewport.clientWidth === this.#width && viewport.clientHeight === this.#height)) return;
    this.#width = viewport.clientWidth;
    this.#height = viewport.clientHeight;
    this.requestUpdate();
  };

  #visiblePosition(location: MetroMapCoordinates, view: MetroMapViewport) {
    const base = project(view);
    const point = project(location);
    const scale = size * 2 ** view.zoom;
    return {
      x: this.#width / 2 + (wrap(point.x - base.x + .5, 1) - .5) * scale,
      y: this.#height / 2 + (point.y - base.y) * scale,
    };
  }

  #isVisible(point: { x: number; y: number }) {
    return point.x >= -22 && point.x <= this.#width + 22 && point.y >= -22 && point.y <= this.#height + 22;
  }

  #tiles(view: MetroMapViewport) {
    if (!this.tileSource || !this.#width || !this.#height) return [];
    const tiles: { key: string; x: number; y: number; url: string }[] = [];
    const count = 2 ** view.zoom;
    const center = project(view);
    const left = center.x * count * size - this.#width / 2;
    const top = center.y * count * size - this.#height / 2;
    for (let row = Math.max(0, Math.floor(top / size)); row < Math.min(count, Math.ceil((top + this.#height) / size)); row++) {
      for (let column = Math.floor(left / size); column < Math.ceil((left + this.#width) / size); column++) {
        try {
          const source = this.tileSource({ x: wrap(column, count), y: row, z: view.zoom });
          if (!source) continue;
          const url = new URL(source, this.ownerDocument.baseURI);
          if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'blob:'
            && !url.href.startsWith('data:image/')) continue;
          tiles.push({ key: `${view.zoom}:${column}:${row}`, x: column * size - left, y: row * size - top, url: url.href });
        } catch {
          // An unavailable tile leaves the grid background visible.
        }
      }
    }
    return tiles;
  }

  #selectableMarkers() {
    const ids = new Set<string>();
    return this.markers.filter(marker => {
      if (!coordinate(marker) || !marker.id || ids.has(marker.id)) return false;
      ids.add(marker.id);
      return true;
    });
  }

  #select(marker: MetroMapMarker): void {
    const current = this.#selectableMarkers().find(candidate => candidate.id === marker.id);
    if (!current || current.id === this.selected) return;
    this.selected = current.id;
    this.dispatchEvent(new CustomEvent<MetroMapSelectDetail>('metro-map-select', {
      detail: { id: current.id, marker: { ...current } }, bubbles: true, composed: true,
    }));
  }

  #commit(view: MetroMapViewport, reason: MetroMapViewChangeDetail['reason']): void {
    const current = this.view;
    if (Math.abs(view.latitude - current.latitude) < 1e-10
      && Math.abs(view.longitude - current.longitude) < 1e-10 && view.zoom === current.zoom) return;
    this.view = view;
    this.dispatchEvent(new CustomEvent<MetroMapViewChangeDetail>('metro-map-view-change', {
      detail: { view: this.view, bounds: this.bounds, reason }, bubbles: true, composed: true,
    }));
  }

  #zoom(offset: number): void {
    const view = this.view;
    this.#commit({ ...view, zoom: zoomOf(view.zoom + offset) }, 'zoom');
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.target !== this.#viewport || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const view = this.view;
    switch (event.key) {
      case 'ArrowLeft': this.#commit(moved(view, -64, 0), 'pan'); break;
      case 'ArrowRight': this.#commit(moved(view, 64, 0), 'pan'); break;
      case 'ArrowUp': this.#commit(moved(view, 0, -64), 'pan'); break;
      case 'ArrowDown': this.#commit(moved(view, 0, 64), 'pan'); break;
      case '+':
      case '=': this.#zoom(1); break;
      case '-': this.#zoom(-1); break;
      default: return;
    }
    event.preventDefault();
  }

  #onPointerDown(event: PointerEvent): void {
    if (this.#gesture || event.button !== 0 || !event.isPrimary
      || event.composedPath().some(element => element instanceof HTMLButtonElement)) return;
    const viewport = event.currentTarget as HTMLElement;
    try { viewport.setPointerCapture(event.pointerId); } catch { return; }
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    this.#gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view: this.view };
  }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    if (!this.#preview && Math.hypot(x, y) < 5) return;
    this.#preview = moved(gesture.view, -x, -y);
    this.requestUpdate();
  }

  #onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.#gesture?.pointer) return;
    this.#onPointerMove(event);
    const view = this.#preview;
    this.#cancelPan();
    if (view) this.#commit(view, 'pan');
  }

  #onPointerCancel(event: PointerEvent): void {
    if (event.pointerId === this.#gesture?.pointer) this.#cancelPan();
  }

  #cancelPan(): void {
    const id = this.#gesture?.pointer;
    this.#gesture = undefined;
    this.#preview = undefined;
    if (id === undefined) return;
    const viewport = this.#viewport;
    if (viewport?.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    this.requestUpdate();
  }

  #locate(): void { this.dispatchEvent(new CustomEvent('metro-map-locate', { bubbles: true, composed: true })); }

  protected override render() {
    const view = this.#preview ?? this.view;
    const markers = this.#selectableMarkers();
    const selected = markers.find(marker => marker.id === this.selected);
    const location = coordinate(this.userLocation) ? this.userLocation : undefined;
    const position = location ? this.#visiblePosition(location, view) : undefined;
    const accuracy = location?.accuracy;
    const latitudeRadians = location ? normalized(location).latitude * Math.PI / 180 : 0;
    const metersPerPixel = 156543.03392 * Math.cos(latitudeRadians) / (2 ** view.zoom);
    const diameter = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0
      ? Math.min(Math.max(this.#width, this.#height) * 4, 2 * accuracy / metersPerPixel) : 0;
    return html`
      <div class="tools" part="tools" role="group" aria-label=${this.label}>
        <button type="button" class="zoom" part="zoom-in" aria-label=${this.zoomInLabel}
          ?disabled=${view.zoom === zoomLimit} @click=${() => this.#zoom(1)}>+</button>
        <button type="button" class="zoom" part="zoom-out" aria-label=${this.zoomOutLabel}
          ?disabled=${view.zoom === 0} @click=${() => this.#zoom(-1)}>−</button>
        ${this.locatable ? html`<button type="button" part="locate" @click=${this.#locate}>${this.locateLabel}</button>` : nothing}
      </div>
      <div class="viewport" part="viewport" role="region" aria-label=${this.label} tabindex="0"
        ?data-panning=${Boolean(this.#preview)} @keydown=${this.#onKeydown}
        @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onPointerCancel}>
        ${repeat(this.#tiles(view), tile => tile.key, tile => html`
          <img class="tile" part="tile" alt="" draggable="false" decoding="async" src=${tile.url}
            style=${`left:${tile.x}px;top:${tile.y}px`}>
        `)}
        ${position && this.#isVisible(position) ? html`
          ${diameter ? html`<span class="accuracy" part="accuracy" aria-hidden="true"
            style=${`left:${position.x}px;top:${position.y}px;width:${diameter}px;height:${diameter}px`}></span>` : nothing}
          <span class="location" part="location" aria-hidden="true" style=${`left:${position.x}px;top:${position.y}px`}></span>
        ` : nothing}
        ${repeat(markers, marker => marker.id, marker => {
          const point = this.#visiblePosition(marker, view);
          if (!this.#isVisible(point)) return nothing;
          return html`<button class="pin" part="pin" type="button" tabindex="-1" data-id=${marker.id} aria-label=${marker.label || marker.id}
            aria-pressed=${String(this.selected === marker.id)} style=${`left:${point.x}px;top:${point.y}px`}
            @click=${() => this.#select(marker)}><span class="pin-mark" part="pin-mark" aria-hidden="true"></span></button>`;
        })}
      </div>
      <div class="attribution" part="attribution"><slot name="attribution"></slot></div>
      ${location ? html`<p class="location-text" part="location-label">${location.label || this.locateLabel}</p>` : nothing}
      ${markers.length ? html`
        <ul class="places" part="places" aria-label=${this.placesLabel}>
          ${repeat(markers, marker => marker.id, marker => html`
            <li><button class="place" part="place" data-id=${marker.id} type="button" aria-pressed=${String(this.selected === marker.id)}
              @click=${() => this.#select(marker)}>${marker.label || marker.id}</button></li>
          `)}
        </ul>
      ` : nothing}
      <div class="details" part="details" aria-live="polite"><slot name="details">
        ${selected?.description || ''}
      </slot></div>
    `;
  }
}

defineElement('metro-map-view', MetroMapView);

declare global {
  interface HTMLElementTagNameMap { 'metro-map-view': MetroMapView }
  interface HTMLElementEventMap {
    'metro-map-view-change': CustomEvent<MetroMapViewChangeDetail>;
    'metro-map-select': CustomEvent<MetroMapSelectDetail>;
    'metro-map-locate': CustomEvent<void>;
  }
}
