import { LitElement, css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { observeAncestorDirection } from './ancestor-direction.js';
import { defineElement } from './define.js';
import './hub-section.js';
import type { MetroHubSection } from './hub-section.js';
import type { MetroChangeEvent } from './pivot.js';
import { metroTheme } from './theme.js';

export type MetroHubProfile = 'phone' | 'desktop';
export type MetroHubLoop = 'auto' | 'always' | 'never';
export interface MetroSectionsInViewDetail { readonly values: readonly string[]; readonly first: string; }
export type MetroSectionsInViewEvent = CustomEvent<MetroSectionsInViewDetail>;

type Axis = 'horizontal' | 'vertical';

interface Section {
  readonly value: string;
  readonly item: MetroHubSection;
  wrapper?: HTMLElement;
}

interface Move {
  readonly value: string;
  readonly axis: Axis;
  readonly offset: number;
  readonly user: boolean;
  readonly focus: boolean;
}

interface Drag {
  readonly id: number;
  readonly value: string;
  readonly x: number;
  readonly y: number;
  readonly offset: number;
  readonly width: number;
  active: boolean;
}

export class MetroHub extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  static override properties = {
    heading: { type: String },
    label: { type: String },
    value: { type: String, reflect: true },
    profile: { type: String, reflect: true },
    loop: { type: String, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; container-type: inline-size; }

    .scene {
      display: flow-root;
      position: relative;
      isolation: isolate;
      overflow: clip;
      background: var(--_metro-bg);
      color: var(--_metro-fg);
    }

    .background {
      position: absolute;
      z-index: -1;
      inset-block: 0;
      inset-inline: -12%;
      background: var(--metro-hub-background, transparent) center / cover no-repeat;
      transform: translateX(var(--_metro-hub-background-shift, 0px));
      pointer-events: none;
    }

    ::slotted([slot="background"]) {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }

    .title {
      inline-size: max-content;
      margin: .0625rem 0 0;
      padding-inline-start: .9375rem;
      font-size: clamp(2.5rem, 16.25cqi, 4.875rem);
      font-weight: 300;
      letter-spacing: -.022em;
      line-height: 1.1;
      transform: translateX(var(--_metro-hub-title-shift, 0px));
    }

    [data-presentation="panorama"] .title {
      margin-block-start: -0.18em;
      padding-inline-start: .625rem;
      font-size: clamp(4.5rem, 35.4cqi, 10.625rem);
      letter-spacing: -.035em;
    }

    [data-presentation="panorama"] {
      --_metro-hub-section-inset: .75rem;
      --_metro-hub-section-header-size: clamp(2.3rem, 13.75cqi, 4.125rem);
      --_metro-hub-section-header-weight: 300;
      --_metro-hub-section-header-tracking: -.035em;
      --_metro-hub-section-header-top: 0rem;
      --_metro-hub-section-header-gap: clamp(1.25rem, 8cqi, 2.375rem);
    }

    .viewport {
      --_metro-hub-touch-action: pan-y pinch-zoom;
      min-block-size: var(--metro-hub-min-block-size, 12rem);
      overflow: auto hidden;
      overflow-anchor: none;
      scrollbar-width: none;
      touch-action: pan-y pinch-zoom;
    }

    .track { display: flex; align-items: start; }
    .track::after {
      content: '';
      flex: 0 0 var(--_metro-hub-end-pad, 0px);
      align-self: stretch;
      min-block-size: 1px;
      min-inline-size: 1px;
    }

    .section {
      box-sizing: border-box;
      flex: 0 0 var(--metro-hub-section-width, 90%);
      min-inline-size: 0;
    }

    .viewport[data-dragging] { cursor: grabbing; user-select: none; }

    [data-presentation="desktop"] {
      --_metro-hub-section-header-size: 1.625rem;
      --_metro-hub-section-header-weight: 300;
      --_metro-hub-section-header-gap: 1rem;
    }

    [data-presentation="desktop"] .title { font-size: clamp(2.75rem, 9cqi, 4.875rem); }
    [data-presentation="desktop"] .viewport { scrollbar-width: thin; }
    [data-presentation="desktop"] .section { flex-basis: var(--metro-hub-section-width, clamp(17rem, 42cqi, 27rem)); }
    [data-presentation="desktop"] .section[data-hero] { flex-basis: var(--metro-hub-hero-width, min(74cqi, 48rem)); }

    @container (max-width: 42rem) {
      [data-presentation="desktop"] .viewport {
        --_metro-hub-touch-action: auto;
        max-block-size: var(--metro-hub-desktop-height, 65dvh);
        overflow: hidden auto;
        touch-action: auto;
      }

      [data-presentation="desktop"] .track { flex-direction: column; align-items: stretch; }
      [data-presentation="desktop"] .section { flex: none; padding-block-end: 1.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .title, .background { transform: none; }
    }
  `];

  declare heading: string;
  declare label: string;
  declare value: string;
  declare profile: MetroHubProfile;
  declare loop: MetroHubLoop;

  #sections: Section[] = [];
  #inView: readonly string[] = Object.freeze([]);
  #geometry = '';
  #positionedValue = '';
  #focusValue = '';
  #move: Move | null = null;
  #settleTimer: number | undefined;
  #ignoreScroll?: { axis: Axis; offset: number };
  #drag: Drag | null = null;
  #blockClick = false;

  #mutations = new MutationObserver(records => {
    if (records.some(record => record.target === this || record.target.parentNode === this
      || (record.attributeName === 'dir' && !this.contains(record.target)))) this.requestUpdate();
  });
  #sizes = new ResizeObserver(() => this.#layout());

  constructor() {
    super();
    this.heading = '';
    this.label = '';
    this.value = '';
    this.profile = 'phone';
    this.loop = 'auto';
  }

  protected get panorama(): boolean { return false; }
  get #desktop(): boolean { return !this.panorama && this.profile === 'desktop'; }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#mutations.observe(this, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'hero', 'hidden', 'slot', 'dir'],
    });
    observeAncestorDirection(this.#mutations, this);
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#mutations.disconnect();
    this.#sizes.disconnect();
    this.#resetDrag();
    this.#clearSettleTimer();
    this.#move = null;
    this.#geometry = '';
    this.#inView = Object.freeze([]);
    super.disconnectedCallback();
  }

  focusSection(value = this.value): void {
    this.#focusValue = value;
    this.value = value;
    this.requestUpdate();
  }

  get sectionsInView(): readonly string[] { return this.#inView; }
  get firstVisible(): string { return this.#inView[0] ?? ''; }

  override focus(options?: FocusOptions): void {
    this.#sections.find(section => section.value === this.value)?.item.headerElement?.focus(options);
  }

  protected override willUpdate(): void {
    const previousFocus = this.#sections.find(section => section.item.matches(':focus-within'));
    const values = new Set<string>();
    this.#sections = Array.from(this.children).flatMap(child => {
      if (child.localName !== 'metro-hub-section' || child.slot === 'background') return [];
      const item = child as MetroHubSection;
      if (item.hidden || !item.value || values.has(item.value)) return [];
      values.add(item.value);
      return [{ value: item.value, item }];
    });

    if (!values.has(this.value)) this.value = this.#sections[0]?.value ?? '';
    if (this.#focusValue && !values.has(this.#focusValue)) this.#focusValue = this.value;
    if (previousFocus && !this.#desktop && previousFocus.value !== this.value) this.#focusValue ||= this.value;
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
    const wrappers = this.shadowRoot?.querySelectorAll<HTMLElement>('.section');
    this.#sections.forEach((section, index) => {
      section.wrapper = wrappers?.[index];
      const slot = section.wrapper?.querySelector('slot');
      if (slot && slot.assignedElements()[0] !== section.item) slot.assign(section.item);
      section.item.setHeaderTabIndex(section.value === this.value ? 0 : -1);
    });

    const background = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="background"]');
    const decorations = Array.from(this.children).filter(child => child.slot === 'background');
    if (background) background.assign(...decorations);

    const viewport = this.#viewport;
    const track = this.#track;
    if (this.isConnected && viewport && track) {
      this.#sizes.disconnect();
      this.#sizes.observe(viewport);
      this.#sizes.observe(track);
      for (const { wrapper } of this.#sections) if (wrapper) this.#sizes.observe(wrapper);
    }
    this.#layout();

    const focus = this.#sections.find(section => section.value === this.#focusValue);
    if (focus) {
      const value = this.#focusValue;
      this.#focusValue = '';
      if (focus.item.headerElement) focus.item.headerElement.focus({ preventScroll: true });
      else void focus.item.updateComplete.then(() => {
        if (this.isConnected && this.value === value) focus.item.headerElement?.focus({ preventScroll: true });
      });
    }
  }

  get #viewport(): HTMLElement | null | undefined { return this.shadowRoot?.querySelector('.viewport'); }
  get #track(): HTMLElement | null | undefined { return this.shadowRoot?.querySelector('.track'); }

  #axis(): Axis {
    const track = this.#track;
    return this.#desktop && track && getComputedStyle(track).flexDirection === 'column' ? 'vertical' : 'horizontal';
  }

  #rtl(): boolean { return getComputedStyle(this).direction === 'rtl'; }

  #offset(viewport: HTMLElement, axis: Axis): number {
    return axis === 'vertical' ? viewport.scrollTop : viewport.scrollLeft;
  }

  #sectionOffset(wrapper: HTMLElement, viewport: HTMLElement, axis: Axis): number {
    const bounds = viewport.getBoundingClientRect();
    const rect = wrapper.getBoundingClientRect();
    if (axis === 'vertical') return viewport.scrollTop + rect.top - bounds.top;
    return viewport.scrollLeft + (this.#rtl() ? rect.right - bounds.right : rect.left - bounds.left);
  }

  #layout(): void {
    const viewport = this.#viewport;
    const track = this.#track;
    if (!this.isConnected || !track || !viewport || !viewport.clientWidth || !viewport.clientHeight) {
      this.#setInView([]);
      return;
    }

    const axis = this.#axis();
    const vertical = axis === 'vertical';
    const extent = vertical ? viewport.clientHeight : viewport.clientWidth;
    const sizes = this.#sections.map(({ value, wrapper }) => [value, vertical ? wrapper?.offsetHeight : wrapper?.offsetWidth]);
    const key = JSON.stringify([axis, this.#rtl(), extent, sizes]);
    if (key !== this.#geometry) {
      this.#geometry = key;
      const last = this.#sections.at(-1)?.wrapper;
      const tail = last ? Math.max(0, extent - (vertical ? last.offsetHeight : last.offsetWidth)) : 0;
      track.style.setProperty('--_metro-hub-end-pad', `${tail}px`);
      this.#positionedValue = '';
      this.#move = null;
      this.#ignoreScroll = undefined;
      this.#resetDrag();
    }

    if (this.value !== this.#positionedValue) {
      this.#positionedValue = this.value;
      this.#resetDrag();
      this.#goTo(this.value, false);
    }
    this.#motion();
  }

  #goTo(value: string, user: boolean, focus = false, instant = !user, targetOffset?: number): void {
    const viewport = this.#viewport;
    const wrapper = this.#sections.find(section => section.value === value)?.wrapper;
    this.#move = null;
    if (!viewport || !wrapper) return;

    const axis = this.#axis();
    const rawOffset = targetOffset ?? this.#sectionOffset(wrapper, viewport, axis);
    const limit = axis === 'vertical' ? viewport.scrollHeight - viewport.clientHeight : viewport.scrollWidth - viewport.clientWidth;
    const offset = Math.max(-limit, Math.min(limit, rawOffset));
    const current = this.#offset(viewport, axis);
    const reduce = this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smooth = !instant && !reduce && Math.abs(current - offset) > 1;
    this.#ignoreScroll = undefined;
    this.#move = { value, axis, offset, user, focus };
    viewport.scrollTo({ [axis === 'vertical' ? 'top' : 'left']: offset, behavior: smooth ? 'smooth' : 'instant' });
    if (!smooth) this.#finishMove(this.#move);
  }

  #finishMove(move: Move): void {
    this.#move = null;
    this.#ignoreScroll = { axis: move.axis, offset: move.offset };
    if (move.user) this.#commit(move.value, move.focus);
  }

  #commit(value: string, focus = false): void {
    if (focus) {
      this.#focusValue = value;
      this.requestUpdate();
    }
    if (value === this.value) return;
    this.#positionedValue = value;
    this.value = value;
    this.dispatchEvent(new CustomEvent('metro-change', { detail: { value }, bubbles: true, composed: true }) satisfies MetroChangeEvent);
  }

  #clearSettleTimer(): void {
    this.ownerDocument.defaultView?.clearTimeout(this.#settleTimer);
    this.#settleTimer = undefined;
  }

  #onScroll = () => {
    this.#motion();
    this.#clearSettleTimer();
    this.#settleTimer = this.ownerDocument.defaultView?.setTimeout(this.#settle, 120);
  };

  #onScrollEnd = () => {
    // A trackpad can send multiple completed scrolls during one gesture.
    if (this.panorama && !this.#move && this.#settleTimer !== undefined) return;
    this.#settle();
  };

  #settle = () => {
    this.#clearSettleTimer();
    const viewport = this.#viewport;
    if (!viewport || this.#drag) return;
    const geometry = this.#geometry;
    this.#layout();
    if (this.#geometry !== geometry) return;
    const axis = this.#axis();
    const offset = this.#offset(viewport, axis);
    if (this.#move) {
      if (this.#move.axis === axis && Math.abs(this.#move.offset - offset) <= 2) this.#finishMove(this.#move);
      return;
    }
    if (this.#ignoreScroll?.axis === axis && Math.abs(this.#ignoreScroll.offset - offset) <= 2) return;
    this.#ignoreScroll = undefined;

    if (this.panorama) this.#snapPanorama(viewport, offset);
    else if (this.firstVisible) this.#commit(this.firstVisible);
  };

  #snapPanorama(viewport: HTMLElement, offset: number): void {
    const anchor = this.#nearestPanorama(viewport, offset);
    if (anchor) this.#goTo(anchor.value, true, false, false, anchor.position);
  }

  #nearestPanorama(viewport: HTMLElement, offset: number): { value: string; position: number } | undefined {
    let distance = Infinity;
    let nearest: { value: string; position: number } | undefined;
    const direction = this.#rtl() ? -1 : 1;
    for (const section of this.#sections) {
      if (!section.wrapper) continue;
      const start = this.#sectionOffset(section.wrapper, viewport, 'horizontal');
      // Within an oversized section the reader may stop anywhere with content on both edges.
      const extra = Math.max(0, section.wrapper.getBoundingClientRect().width - viewport.clientWidth);
      const within = Math.max(0, Math.min(extra, (offset - start) * direction));
      const target = start + within * direction;
      const gap = Math.abs(offset - target);
      if (gap < distance) {
        distance = gap;
        nearest = { value: section.value, position: target };
      }
    }
    return nearest;
  }

  #interruptPanorama(viewport: HTMLElement): boolean {
    if (!this.panorama || !this.#move) return false;
    this.#move = null;
    viewport.scrollTo({ left: viewport.scrollLeft, behavior: 'instant' });
    return true;
  }

  #onWheel = (event: WheelEvent) => {
    if (event.deltaX || event.shiftKey) this.#interruptPanorama(event.currentTarget as HTMLElement);
  };

  #setInView(values: string[]): void {
    if (values.length === this.#inView.length && values.every((value, index) => value === this.#inView[index])) return;
    this.#inView = Object.freeze(values);
    this.dispatchEvent(new CustomEvent('metro-sections-in-view-change', {
      detail: { values: this.#inView, first: this.firstVisible }, bubbles: true, composed: true,
    }) satisfies MetroSectionsInViewEvent);
  }

  #motion(): void {
    const viewport = this.#viewport;
    const scene = viewport?.parentElement;
    if (!viewport || !scene) return;
    const offset = this.#desktop ? 0 : viewport.scrollLeft;
    const width = viewport.clientWidth;
    const bounded = (value: number, edge: number) => Math.max(-edge, Math.min(edge, value));
    scene.style.setProperty('--_metro-hub-background-shift', `${bounded(-offset * .08, width * .1)}px`);
    scene.style.setProperty('--_metro-hub-title-shift', `${bounded(-offset * (this.panorama ? .32 : .2), width * .16)}px`);

    const bounds = viewport.getBoundingClientRect();
    const rtl = this.#rtl();
    const vertical = this.#axis() === 'vertical';
    const values: string[] = [];
    const shifts = this.#sections.map(({ value, wrapper }) => {
      const rect = wrapper?.getBoundingClientRect();
      if (rect && bounds.width && bounds.height && (vertical
        ? rect.bottom > bounds.top + 1 && rect.top < bounds.bottom - 1
        : rect.right > bounds.left + 1 && rect.left < bounds.right - 1)) values.push(value);
      const start = rect ? (rtl ? rect.right - bounds.right : rect.left - bounds.left) : 0;
      return this.#desktop ? 0 : bounded(start * -.095, 24);
    });
    this.#sections.forEach(({ wrapper }, index) => wrapper?.style.setProperty('--_metro-hub-section-shift', `${shifts[index]}px`));
    this.#setInView(values);
  }

  #next(value: string, step: number): string {
    const count = this.#sections.length;
    const index = this.#sections.findIndex(section => section.value === value);
    if (index < 0) return value;
    const cycle = this.loop === 'always' || (this.loop !== 'never' && !this.#desktop && count >= (this.panorama ? 2 : 3));
    const next = cycle ? (index + step + count) % count : Math.min(count - 1, Math.max(0, index + step));
    return this.#sections[next].value;
  }

  #wraps(from: string, to: string, step: number): boolean {
    const previous = this.#sections.findIndex(section => section.value === from);
    const next = this.#sections.findIndex(section => section.value === to);
    return (next - previous) * step < 0;
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const origin = event.composedPath()[0];
    const section = this.#sections.find(entry => entry.item.headerElement === origin);
    if (!section) return;

    const horizontal = this.#axis() === 'horizontal';
    const reverse = horizontal && this.#rtl() ? -1 : 1;
    const current = this.#move?.value ?? section.value;
    let step = 0;
    let value: string;
    if (event.key === 'Home') value = this.#sections[0].value;
    else if (event.key === 'End') value = this.#sections.at(-1)!.value;
    else {
      if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) step = -reverse;
      else if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) step = reverse;
      else return;
      value = this.#next(current, step);
    }

    event.preventDefault();
    this.#goTo(value, true, true, this.#wraps(current, value, step));
  };

  #onPointerDown = (event: PointerEvent) => {
    this.#blockClick = false;
    if (!event.isTrusted || !event.isPrimary || event.button !== 0 || event.defaultPrevented || this.#drag
      || this.#sections.length < 2 || this.#axis() !== 'horizontal') return;
    const path = event.composedPath();
    const owner = path.find(node => node instanceof Element && node.matches('metro-pivot, metro-hub, metro-panorama, metro-flip-view'));
    if (owner !== this || path.some(node => node instanceof Element && node.matches(
      '[data-metro-no-swipe], input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], audio, video',
    ))) return;

    const viewport = event.currentTarget as HTMLElement;
    const interrupted = this.#interruptPanorama(viewport);
    const offset = viewport.scrollLeft;
    const anchor = interrupted ? this.#nearestPanorama(viewport, offset) : undefined;
    this.#drag = { id: event.pointerId, value: anchor?.value ?? this.value, x: event.clientX, y: event.clientY,
      offset, width: viewport.clientWidth, active: false };
  };

  #onPointerMove = (event: PointerEvent) => {
    const drag = this.#drag;
    const viewport = event.currentTarget as HTMLElement;
    if (drag?.id !== event.pointerId) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(y) > 8 && Math.abs(y) > Math.abs(x)) { this.#resetDrag(); return; }
      if (Math.abs(x) <= 8 || Math.abs(x) <= Math.abs(y) * 1.25) return;
      drag.active = true;
      this.#move = null;
      viewport.setPointerCapture(event.pointerId);
      viewport.setAttribute('data-dragging', '');
    }
    if (event.cancelable) event.preventDefault();
    if (!this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) viewport.scrollLeft = drag.offset - x;
  };

  #onPointerUp = (event: PointerEvent) => {
    const drag = this.#drag;
    if (drag?.id !== event.pointerId) return;
    this.#resetDrag();
    if (!drag.active) { this.#onScrollEnd(); return; }

    this.#blockClick = true;
    const delta = event.clientX - drag.x;
    const step = (delta < 0 ? 1 : -1) * (this.#rtl() ? -1 : 1);
    const next = Math.abs(delta) >= Math.min(72, drag.width * .2) ? this.#next(drag.value, step) : drag.value;
    this.#goTo(next, true, false, this.#wraps(drag.value, next, step));
  };

  #onPointerCancel = (event: PointerEvent) => {
    const drag = this.#drag;
    if (drag?.id !== event.pointerId) return;
    this.#resetDrag();
    if (drag.active) this.#goTo(this.value, false);
  };

  #onLostCapture = (event: PointerEvent) => {
    if (event.target === event.currentTarget) this.#onPointerCancel(event);
  };

  #onPointerLeave = (event: PointerEvent) => {
    if (!this.#drag?.active) this.#onPointerCancel(event);
  };

  #resetDrag(): void {
    const drag = this.#drag;
    this.#drag = null;
    const viewport = this.#viewport;
    if (!drag?.active || !viewport) return;
    viewport.removeAttribute('data-dragging');
    if (viewport.hasPointerCapture(drag.id)) viewport.releasePointerCapture(drag.id);
  }

  protected override render() {
    const presentation = this.panorama ? 'panorama' : this.#desktop ? 'desktop' : 'phone';
    return html`
      <section class="scene" part="container" aria-label=${this.label || this.heading || 'Sections'} data-presentation=${presentation}>
        <div class="background" part="background" aria-hidden="true" inert><slot name="background"></slot></div>
        ${this.heading ? html`<h1 class="title" part="heading">${this.heading}</h1>` : null}
        <div class="viewport" part="viewport" @scroll=${this.#onScroll} @scrollend=${this.#onScrollEnd} @wheel=${this.#onWheel}
          @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
          @pointercancel=${this.#onPointerCancel} @pointerleave=${this.#onPointerLeave} @lostpointercapture=${this.#onLostCapture}>
          <div class="track" part="track" @keydown=${this.#onKeyDown}>
            ${repeat(this.#sections, section => section.item, section => html`
              <div class="section" part="section" ?data-hero=${section.item.hero}
                ?inert=${!this.#desktop && section.value !== this.value}><slot></slot></div>
            `)}
          </div>
        </div>
      </section>
    `;
  }
}

defineElement('metro-hub', MetroHub);

declare global {
  interface HTMLElementTagNameMap { 'metro-hub': MetroHub; }
  interface HTMLElementEventMap { 'metro-sections-in-view-change': MetroSectionsInViewEvent; }
}
