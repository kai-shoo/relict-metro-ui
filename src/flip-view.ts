import { LitElement, css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { formatPositionLabel } from './position-label.js';
import type { MetroChangeEvent } from './pivot.js';
import { metroTheme } from './theme.js';

interface Slide {
  readonly value: string;
  readonly item: HTMLElement;
  wrapper?: HTMLElement;
}

interface Swipe {
  readonly id: number;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly offset: number;
  readonly width: number;
  active: boolean;
}

export class MetroFlipView extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    positionLabel: { type: String, attribute: 'position-label' },
    carouselDescription: { type: String, attribute: 'carousel-description' },
    slideDescription: { type: String, attribute: 'slide-description' },
    swipeDisabled: { type: Boolean, attribute: 'swipe-disabled', reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; }
    section { color: var(--_metro-fg); background: var(--_metro-bg); }

    .viewport {
      overflow: auto hidden;
      overflow-anchor: none;
      scrollbar-width: none;
      scroll-snap-type: inline mandatory;
      overscroll-behavior-inline: contain;
      touch-action: pan-y pinch-zoom;
    }

    :host([swipe-disabled]) .viewport { overflow-x: hidden; }
    .viewport[data-dragging] { scroll-snap-type: none; }
    .track { display: flex; align-items: start; }
    .slide { flex: 0 0 100%; min-inline-size: 0; min-block-size: 1px; scroll-snap-align: start; scroll-snap-stop: always; }
    ::slotted(:not([data-metro-no-swipe])) { touch-action: pan-y pinch-zoom; }

    .controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: min(var(--_metro-space), 4%);
    }

    [part="status"] {
      flex: none;
      max-inline-size: 52%;
      text-align: center;
      overflow-wrap: anywhere;
    }

    button {
      display: grid;
      place-items: center;
      inline-size: 2.75rem;
      min-inline-size: min(44px, 20%);
      block-size: 2.75rem;
      padding: 0;
      border: 0;
      border-radius: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
    }

    button[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }
    button:not([aria-disabled="true"]):active { color: var(--_metro-accent); }
    button:focus-visible, .viewport:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }

    .arrow {
      inline-size: .7rem;
      block-size: .7rem;
      border: solid currentColor;
      border-width: 0 2px 2px 0;
    }

    .previous .arrow, .next:dir(rtl) .arrow { transform: rotate(135deg); }
    .next .arrow, .previous:dir(rtl) .arrow { transform: rotate(-45deg); }
  `];

  declare value: string;
  declare label: string;
  declare previousLabel: string;
  declare nextLabel: string;
  declare positionLabel: string;
  declare carouselDescription: string;
  declare slideDescription: string;
  declare swipeDisabled: boolean;

  #slides: Slide[] = [];
  #positioned = '';
  #geometry = '';
  #pending = '';
  #ignoreOffset: number | undefined;
  #settleTimer: number | undefined;
  #lastFocus?: Element;
  #restoreFocus = false;
  #swipe: Swipe | null = null;
  #blockClick = false;
  #resize = new ResizeObserver(() => this.#align());
  #mutations = new MutationObserver(records => {
    if (records.some(record => record.target === this || record.target.parentNode === this)) this.requestUpdate();
  });

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.previousLabel = 'Previous item';
    this.nextLabel = 'Next item';
    this.positionLabel = '';
    this.carouselDescription = '';
    this.slideDescription = '';
    this.swipeDisabled = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#mutations.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-value', 'slot', 'hidden'] });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#mutations.disconnect();
    this.#resize.disconnect();
    this.#clearSettle();
    this.#resetSwipe();
    this.#geometry = '';
    this.#pending = '';
    this.#lastFocus = undefined;
    super.disconnectedCallback();
  }

  override focus(options?: FocusOptions): void { this.#viewport?.focus(options); }

  get #viewport(): HTMLElement | null | undefined { return this.shadowRoot?.querySelector('.viewport'); }

  #onFocusIn = (event: FocusEvent) => {
    const target = event.composedPath()[0];
    this.#lastFocus = target instanceof Element ? target : undefined;
  };

  #onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node) {
      if (!this.contains(next) && !this.shadowRoot?.contains(next)) this.#lastFocus = undefined;
      return;
    }
    const previous = this.#lastFocus;
    queueMicrotask(() => {
      if (this.#lastFocus === previous && previous?.isConnected && !this.matches(':focus-within')) this.#lastFocus = undefined;
    });
  };

  protected override willUpdate(): void {
    if (this.swipeDisabled && this.#swipe) {
      this.#resetSwipe();
      this.#geometry = '';
    }
    const previousIndex = this.#slides.findIndex(slide => slide.value === this.value);
    const focused = this.#slides.find(slide => slide.item.matches(':focus-within'));
    const keys = new Set<string>();
    this.#slides = Array.from(this.children).flatMap(item => {
      if (!(item instanceof HTMLElement) || item.hidden || item.slot) return [];
      const value = item.dataset.value;
      if (!value || keys.has(value)) return [];
      keys.add(value);
      return [{ item, value }];
    });

    if (!keys.has(this.value)) {
      const successor = Math.max(0, Math.min(previousIndex, this.#slides.length - 1));
      this.value = this.#slides[successor]?.value ?? '';
    }
    const last = this.#lastFocus;
    const removedFocus = last && !last.isConnected;
    const removedControls = !this.#slides.length && this.shadowRoot?.activeElement?.matches('.controls button');
    this.#restoreFocus = Boolean((focused && focused.value !== this.value) || removedFocus || removedControls);
    if (removedFocus) this.#lastFocus = undefined;
  }

  protected override firstUpdated(): void {
    this.#viewport?.addEventListener('click', event => {
      if (!this.#blockClick || !event.detail) return;
      this.#blockClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
  }

  protected override updated(): void {
    const empty = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="empty"]');
    if (empty) empty.assign(...Array.from(this.children).filter(child => child.slot === 'empty'));

    const wrappers = this.shadowRoot?.querySelectorAll<HTMLElement>('.slide');
    this.#slides.forEach((slide, index) => {
      slide.wrapper = wrappers?.[index];
      const slot = slide.wrapper?.querySelector('slot');
      if (slot && slot.assignedElements()[0] !== slide.item) slot.assign(slide.item);
    });
    if (this.isConnected && this.#viewport) this.#resize.observe(this.#viewport);
    this.#align();
    if (this.#restoreFocus) {
      const active = (this.getRootNode() as Document | ShadowRoot).activeElement ?? this.ownerDocument.activeElement;
      if (!active || active === this.ownerDocument.body || active === this.ownerDocument.documentElement
        || this.matches(':focus-within')) this.focus({ preventScroll: true });
    }
  }

  #align(): boolean {
    const viewport = this.#viewport;
    if (!viewport || !this.isConnected || !viewport.clientWidth) return false;
    const geometry = JSON.stringify([viewport.clientWidth, viewport.scrollWidth, getComputedStyle(this).direction, this.#slides.map(slide => slide.value)]);
    if (geometry === this.#geometry && this.#positioned === this.value) return false;

    this.#geometry = geometry;
    this.#positioned = this.value;
    this.#pending = '';
    this.#resetSwipe();
    const slide = this.#slides.find(item => item.value === this.value);
    if (slide?.wrapper) {
      this.#ignoreOffset = this.#offset(slide.wrapper, viewport);
      viewport.scrollTo({ left: this.#ignoreOffset, behavior: 'instant' });
    } else {
      this.#ignoreOffset = undefined;
    }
    return true;
  }

  #offset(wrapper: HTMLElement, viewport: HTMLElement): number {
    const frame = viewport.getBoundingClientRect();
    const rect = wrapper.getBoundingClientRect();
    return viewport.scrollLeft + (getComputedStyle(this).direction === 'rtl' ? rect.right - frame.right : rect.left - frame.left);
  }

  #show(index: number): void {
    const viewport = this.#viewport;
    const slide = this.#slides[Math.max(0, Math.min(this.#slides.length - 1, index))];
    if (!viewport || !slide?.wrapper) return;
    const interrupted = this.#swipe?.active === true;
    this.#resetSwipe();
    const offset = this.#offset(slide.wrapper, viewport);
    const reduceMotion = this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Restoring snap after a drag can queue a scrollend for the intermediate slide.
    const smooth = !interrupted && !reduceMotion && Math.abs(viewport.scrollLeft - offset) > 1;
    this.#pending = slide.value;
    this.#ignoreOffset = undefined;
    viewport.scrollTo({ left: offset, behavior: smooth ? 'smooth' : 'instant' });
    if (!smooth) this.#onScrollEnd();
  }

  #clearSettle(): void {
    this.ownerDocument.defaultView?.clearTimeout(this.#settleTimer);
    this.#settleTimer = undefined;
  }

  #onScroll = () => {
    const viewport = this.#viewport;
    if (!viewport || 'onscrollend' in viewport) return;
    this.#clearSettle();
    this.#settleTimer = this.ownerDocument.defaultView?.setTimeout(this.#onScrollEnd, 140);
  };

  #onScrollEnd = () => {
    this.#clearSettle();
    const viewport = this.#viewport;
    if (!viewport || this.#swipe?.active || this.#align()) return;
    const offset = viewport.scrollLeft;
    if (this.#ignoreOffset !== undefined && Math.abs(offset - this.#ignoreOffset) <= 1) return;
    this.#ignoreOffset = undefined;
    this.#pending = '';

    let nearest: Slide | undefined;
    let distance = Infinity;
    for (const slide of this.#slides) {
      if (!slide.wrapper) continue;
      const delta = Math.abs(offset - this.#offset(slide.wrapper, viewport));
      if (delta < distance) { distance = delta; nearest = slide; }
    }
    if (!nearest || this.value === nearest.value) return;

    this.#positioned = nearest.value;
    this.value = nearest.value;
    this.dispatchEvent(new CustomEvent('metro-change', {
      bubbles: true, composed: true, detail: { value: nearest.value },
    }) satisfies MetroChangeEvent);
  };

  #relative(step: number): void {
    const current = this.#slides.findIndex(slide => slide.value === (this.#pending || this.value));
    this.#show(current + step);
  }

  #onPointerDown = (event: PointerEvent) => {
    this.#blockClick = false;
    if (this.swipeDisabled || this.#swipe || this.#slides.length < 2 || !event.isTrusted || !event.isPrimary
      || event.pointerType !== 'touch' || event.defaultPrevented) return;
    const path = event.composedPath();
    const owner = path.find(node => node instanceof Element && node.matches('metro-pivot, metro-hub, metro-panorama, metro-flip-view'));
    if (owner !== this || path.some(node => node instanceof Element && node.matches(
      '[data-metro-no-swipe], input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], audio, video',
    ))) return;
    const viewport = event.currentTarget as HTMLElement;
    this.#swipe = { id: event.pointerId, index: this.#slides.findIndex(slide => slide.value === this.value),
      x: event.clientX, y: event.clientY, offset: viewport.scrollLeft, width: viewport.clientWidth, active: false };
  };

  #onPointerMove = (event: PointerEvent) => {
    const swipe = this.#swipe;
    if (swipe?.id !== event.pointerId) return;
    const viewport = event.currentTarget as HTMLElement;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    if (!swipe.active) {
      if (Math.abs(y) > 8 && Math.abs(y) > Math.abs(x)) { this.#resetSwipe(); return; }
      if (Math.abs(x) <= 8 || Math.abs(x) <= Math.abs(y) * 1.25) return;
      swipe.active = true;
      this.#pending = '';
      viewport.setPointerCapture(event.pointerId);
      viewport.setAttribute('data-dragging', '');
    }
    if (!this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      viewport.scrollLeft = swipe.offset - x;
    }
  };

  #onPointerUp = (event: PointerEvent) => {
    const swipe = this.#swipe;
    if (swipe?.id !== event.pointerId) return;
    this.#resetSwipe();
    if (!swipe.active) return;
    const delta = event.clientX - swipe.x;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = Math.abs(delta) >= Math.min(72, swipe.width * .2) ? (delta < 0 ? 1 : -1) * (rtl ? -1 : 1) : 0;
    this.#show(swipe.index + step);
  };

  #onPointerCancel = (event: PointerEvent) => {
    const swipe = this.#swipe;
    if (swipe?.id !== event.pointerId) return;
    this.#resetSwipe();
    if (swipe.active) this.#show(swipe.index);
  };

  #onLostCapture = (event: PointerEvent) => {
    if (event.target === event.currentTarget) this.#onPointerCancel(event);
  };

  #resetSwipe(): void {
    const swipe = this.#swipe;
    this.#swipe = null;
    const viewport = this.#viewport;
    if (!swipe?.active || !viewport) return;
    this.#blockClick = true;
    viewport.removeAttribute('data-dragging');
    if (viewport.hasPointerCapture(swipe.id)) viewport.releasePointerCapture(swipe.id);
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (!this.#slides.length || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.composedPath()[0];
    if (target !== this.#viewport && !(target instanceof HTMLButtonElement && target.getRootNode() === this.shadowRoot)) return;
    const reverse = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    switch (event.key) {
      case 'ArrowLeft': this.#relative(-reverse); break;
      case 'ArrowRight': this.#relative(reverse); break;
      case 'Home': this.#show(0); break;
      case 'End': this.#show(this.#slides.length - 1); break;
      default: return;
    }
    event.preventDefault();
  };

  protected override render() {
    const index = this.#slides.findIndex(slide => slide.value === this.value);
    const positionLabel = (position: number) =>
      formatPositionLabel(this.positionLabel || '{current} of {total}', position, this.#slides.length);
    return html`
      <section part="container" aria-label=${this.label || 'Items'} aria-roledescription=${this.carouselDescription || 'carousel'}
        @keydown=${this.#onKeyDown} @focusin=${this.#onFocusIn} @focusout=${this.#onFocusOut}>
        <div class="viewport" part="viewport" tabindex=${index < 0 ? -1 : 0}
          @scroll=${this.#onScroll} @scrollend=${this.#onScrollEnd} @pointerdown=${this.#onPointerDown}
          @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
          @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onLostCapture}>
          <div class="track" part="track">
            ${repeat(this.#slides, slide => slide.item, (slide, position) => html`
              <div class="slide" part="slide" ?inert=${slide.value !== this.value}
                role="group" aria-roledescription=${this.slideDescription || 'slide'}
                aria-label=${positionLabel(position + 1)}><slot></slot></div>
            `)}
          </div>
          ${index < 0 ? html`<slot name="empty"></slot>` : null}
        </div>
        ${index >= 0 ? html`
          <div class="controls" part="controls">
            <button type="button" part="previous" class="previous" aria-label=${this.previousLabel}
              aria-disabled=${String(index <= 0)} @click=${() => { if (index > 0) this.#relative(-1); }}><span class="arrow" aria-hidden="true"></span></button>
            <span role="status" part="status">${positionLabel(index + 1)}</span>
            <button type="button" part="next" class="next" aria-label=${this.nextLabel}
              aria-disabled=${String(index >= this.#slides.length - 1)} @click=${() => { if (index < this.#slides.length - 1) this.#relative(1); }}><span class="arrow" aria-hidden="true"></span></button>
          </div>
        ` : null}
      </section>
    `;
  }
}

defineElement('metro-flip-view', MetroFlipView);

declare global {
  interface HTMLElementTagNameMap { 'metro-flip-view': MetroFlipView; }
}
