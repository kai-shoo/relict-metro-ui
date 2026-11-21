import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export { MetroSelectionSet } from './selection-set.js';
export type MetroCrossSlideAxis = 'horizontal' | 'vertical';
export type MetroCrossSlideChangeEvent = CustomEvent<{ value: string; selected: boolean; source: 'slide' | 'button' }>;
export interface MetroCrossSlideTransferDetail {
  readonly phase: 'start' | 'move' | 'drop' | 'cancel';
  readonly pointerId: number;
  readonly value: string;
  readonly clientX: number;
  readonly clientY: number;
}
export type MetroCrossSlideTransferEvent = CustomEvent<MetroCrossSlideTransferDetail>;

interface Slide {
  pointer: number;
  value: string;
  selected: boolean;
  axis: MetroCrossSlideAxis;
  x: number;
  y: number;
  width: number;
  height: number;
  dragging: boolean;
  exceeded: boolean;
  transferring: boolean;
}

export class MetroCrossSlide extends LitElement {
  static override properties: PropertyDeclarations = {
    axis: { type: String, reflect: true },
    value: { type: String },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    selectLabel: { type: String, attribute: 'select-label' },
    threshold: { type: Number },
    maxDistance: { type: Number, attribute: 'max-distance' },
    transferGesture: { type: Boolean, attribute: 'transfer-gesture' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    :host([hidden]) { display: none; }
    .surface { overflow: hidden; background: var(--_metro-chrome); touch-action: pan-y pinch-zoom; }
    :host([axis="vertical"]) .surface { touch-action: pan-x pinch-zoom; }
    :host([disabled]) .surface { touch-action: auto; }
    .row {
      display: flex;
      align-items: stretch;
      background: var(--metro-cross-slide-background, var(--_metro-bg));
      transform: translate(var(--_slide-x, 0px), var(--_slide-y, 0px));
      transition: transform var(--_metro-motion) ease-out;
    }
    .surface[data-dragging] .row { transition: none; user-select: none; }
    .surface[data-armed] .row { box-shadow: inset 0 0 0 2px var(--_metro-accent); }
    .surface[data-transferring] .row { opacity: .65; }
    .content { flex: 1; min-inline-size: 0; }
    button {
      min-block-size: 2.75rem;
      padding-inline: .75rem;
      border: 2px solid transparent;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button[aria-pressed="true"] { border-color: var(--_metro-accent); color: var(--_metro-accent); }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    @media (forced-colors: active) { button[aria-pressed="true"], button:focus-visible { border-color: Highlight; outline-color: Highlight; } }
  `];

  declare axis: MetroCrossSlideAxis;
  declare value: string;
  declare selected: boolean;
  declare disabled: boolean;
  declare label: string;
  declare selectLabel: string;
  declare threshold: number;
  declare maxDistance: number;
  declare transferGesture: boolean;
  #slide?: Slide;
  #suppressTap = false;

  constructor() {
    super();
    this.axis = 'horizontal';
    this.value = '';
    this.selected = false;
    this.disabled = false;
    this.label = '';
    this.selectLabel = 'Select';
    this.threshold = 12;
    this.maxDistance = 72;
    this.transferGesture = false;
  }

  override disconnectedCallback(): void { this.#reset(); super.disconnectedCallback(); }

  protected override firstUpdated(): void {
    this.#surface?.addEventListener('click', event => {
      if (!this.#suppressTap || event.detail === 0) return;
      this.#suppressTap = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.#slide && (this.disabled || changed.has('value') || changed.has('axis') ||
      changed.has('selected') || changed.has('transferGesture'))) this.#reset();
  }

  get #surface() { return this.shadowRoot?.querySelector<HTMLElement>('.surface'); }
  get #axis(): MetroCrossSlideAxis { return this.axis === 'vertical' ? 'vertical' : 'horizontal'; }
  get #min() { return Number.isFinite(this.threshold) && this.threshold > 8 ? this.threshold : 12; }
  get #max() { return Number.isFinite(this.maxDistance) && this.maxDistance > this.#min ? this.maxDistance : Math.max(72, this.#min + 20); }

  #toggle(source: 'slide' | 'button'): void {
    if (!this.value || this.disabled) return;
    this.selected = !this.selected;
    this.dispatchEvent(new CustomEvent('metro-cross-slide-change', {
      detail: { value: this.value, selected: this.selected, source }, bubbles: true, composed: true,
    }) satisfies MetroCrossSlideChangeEvent);
  }

  #start(event: PointerEvent): void {
    this.#suppressTap = false;
    const surface = this.#surface;
    if (!surface || !this.value || this.disabled || this.#slide || !event.isPrimary || event.pointerType !== 'touch') return;
    const path = event.composedPath();
    const owner = path.find(node => node instanceof HTMLElement && node.localName === 'metro-cross-slide');
    if (owner !== this || path.slice(0, path.indexOf(surface)).some(node => node instanceof Element && node.matches(
      'button,input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="slider"],[data-metro-no-swipe]',
    ))) return;
    this.#slide = { pointer: event.pointerId, value: this.value, selected: this.selected, axis: this.#axis,
      x: event.clientX, y: event.clientY, width: surface.clientWidth, height: surface.clientHeight,
      dragging: false, exceeded: false, transferring: false };
  }

  #dimensions(slide: Slide, surface: HTMLElement) {
    return slide.width === surface.clientWidth && slide.height === surface.clientHeight && slide.value === this.value
      && slide.axis === this.#axis && slide.selected === this.selected && !this.disabled;
  }

  #offset(slide: Slide, event: PointerEvent): [number, number] {
    const x = event.clientX - slide.x;
    const y = event.clientY - slide.y;
    return slide.axis === 'horizontal' ? [x, y] : [y, x];
  }

  #move(event: PointerEvent): void {
    const slide = this.#slide;
    const surface = this.#surface;
    if (!surface || slide?.pointer !== event.pointerId) return;
    if (!this.#dimensions(slide, surface)) { this.#reset(); return; }
    const [primary, secondary] = this.#offset(slide, event);
    const distance = Math.abs(primary);
    if (!slide.dragging) {
      if (Math.abs(secondary) > 8 && Math.abs(secondary) >= distance) { this.#reset(); return; }
      if (distance <= 8 || distance <= Math.abs(secondary) * 1.25) return;
      slide.dragging = true;
      this.#suppressTap = true;
      if (event.isTrusted) surface.setPointerCapture(event.pointerId);
      surface.setAttribute('data-dragging', '');
    }
    const shift = Math.sign(primary) * Math.min(distance * .65, 32);
    const crossTransfer = this.transferGesture && !slide.exceeded && distance >= this.#max;
    slide.exceeded ||= distance >= this.#max;
    surface.style.setProperty(slide.axis === 'horizontal' ? '--_slide-x' : '--_slide-y', `${shift}px`);
    surface.toggleAttribute('data-armed', !slide.exceeded && distance >= this.#min);
    if (crossTransfer) {
      slide.transferring = true;
      surface.setAttribute('data-transferring', '');
      this.#sendTransfer('start', slide, event);
    } else if (slide.transferring) {
      this.#sendTransfer('move', slide, event);
    }
  }

  #finish(event: PointerEvent): void {
    const slide = this.#slide;
    const surface = this.#surface;
    if (!surface || slide?.pointer !== event.pointerId) return;
    const [offset] = this.#offset(slide, event);
    const distance = Math.abs(offset);
    const valid = this.#dimensions(slide, surface);
    const eligible = slide.dragging && !slide.exceeded && valid && distance >= this.#min && distance < this.#max;
    this.#reset(slide.transferring && valid ? event : undefined);
    if (eligible) this.#toggle('slide');
  }

  #cancel(event: PointerEvent): void { if (this.#slide?.pointer === event.pointerId) this.#reset(); }

  #lostCapture(event: PointerEvent): void { if (event.target === event.currentTarget) this.#cancel(event); }

  #sendTransfer(phase: MetroCrossSlideTransferDetail['phase'], slide: Slide, event?: PointerEvent): void {
    this.dispatchEvent(new CustomEvent('metro-cross-slide-transfer', {
      detail: { phase, value: slide.value, pointerId: slide.pointer,
        clientX: event?.clientX ?? slide.x, clientY: event?.clientY ?? slide.y },
      bubbles: true, composed: true,
    }) satisfies MetroCrossSlideTransferEvent);
  }

  #reset(drop?: PointerEvent): void {
    const slide = this.#slide;
    this.#slide = undefined;
    const surface = this.#surface;
    surface?.removeAttribute('data-dragging');
    surface?.removeAttribute('data-armed');
    surface?.removeAttribute('data-transferring');
    surface?.style.removeProperty('--_slide-x');
    surface?.style.removeProperty('--_slide-y');
    if (surface && slide && surface.hasPointerCapture(slide.pointer)) surface.releasePointerCapture(slide.pointer);
    if (slide?.transferring) this.#sendTransfer(drop ? 'drop' : 'cancel', slide, drop);
  }

  protected override render() {
    return html`<div class="surface" part="surface" data-metro-no-swipe=${this.#axis === 'horizontal' && !this.disabled ? '' : nothing}
      @pointerdown=${this.#start} @pointermove=${this.#move} @pointerup=${this.#finish} @pointercancel=${this.#cancel}
      @lostpointercapture=${this.#lostCapture}>
      <div class="row" part="row">
        <div class="content" part="content"><slot></slot></div>
        <button type="button" part="select" aria-pressed=${this.selected} ?disabled=${this.disabled || !this.value}
          aria-label=${this.label ? `${this.selectLabel} ${this.label}` : this.selectLabel}
          @click=${() => this.#toggle('button')}>${this.selectLabel}</button>
      </div>
    </div>`;
  }
}

defineElement('metro-cross-slide', MetroCrossSlide);

declare global {
  interface HTMLElementTagNameMap { 'metro-cross-slide': MetroCrossSlide; }
  interface HTMLElementEventMap {
    'metro-cross-slide-change': MetroCrossSlideChangeEvent;
    'metro-cross-slide-transfer': MetroCrossSlideTransferEvent;
  }
}
