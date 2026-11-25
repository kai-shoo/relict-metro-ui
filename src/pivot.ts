import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { observeAncestorDirection } from './ancestor-direction.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';
import './pivot-item.js';
import type { MetroPivotItem } from './pivot-item.js';

export type MetroChangeEvent = CustomEvent<{ value: string }>;

interface Panel {
  item: MetroPivotItem;
  id: number;
  value: string;
  label: string;
  disabled: boolean;
}

interface Gesture {
  pointer: number;
  value: string;
  x: number;
  y: number;
  width: number;
  dragging: boolean;
}

interface HeaderMotion {
  value: string;
  viewportWidth: number;
  stripWidth: number;
  direction: string;
  frame: number;
}

export class MetroPivot extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-width: 0;
      container-type: inline-size;
      background: var(--_metro-bg);
      color: var(--_metro-fg);
    }

    .tabs {
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      overflow-anchor: none;
      scrollbar-width: none;
      padding-inline-start: var(--_metro-space);
      padding-block: 0.25rem;
      scroll-padding-inline: var(--_metro-space);
    }

    .tab-headers {
      display: flex;
      flex: none;
    }

    .tab {
      box-sizing: border-box;
      display: grid;
      align-content: center;
      flex: none;
      padding: 0;
      padding-inline: 0.13em 0.38em;
      padding-block-end: 0.06em;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--_metro-muted);
      font: inherit;
      font-size: clamp(2rem, 15cqi, 4.5rem);
      font-weight: 300;
      letter-spacing: -0.035em;
      line-height: 1.15;
      text-align: start;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }

    .tab[aria-selected="true"], .tab[data-current],
    .tab:hover:not(:disabled, [data-disabled]) {
      color: var(--_metro-fg);
    }

    .tab:active:not(:disabled, [data-disabled]) { color: var(--_metro-accent); }
    .tab:is(:disabled, [data-disabled]) { color: var(--_metro-disabled); cursor: default; }
    .tabs[data-locked] .tab { color: var(--_metro-fg); cursor: default; }

    .tabs:focus-visible,
    .tab:focus-visible,
    .panel:focus-visible {
      outline: 2px solid var(--_metro-focus);
      outline-offset: -2px;
    }
    .tabs[tabindex]:focus { min-block-size: 2.75rem; }

    .viewport {
      overflow-x: clip;
      touch-action: pan-y pinch-zoom;
    }

    .panel {
      min-width: 0;
      padding: calc(var(--_metro-space) * 1.25) var(--_metro-space) 0;
      transform: translateX(var(--_metro-pivot-drag, 0px));
      transition: transform var(--_metro-motion) ease-out;
    }

    .viewport[data-dragging] .panel {
      animation: none;
      transition: none;
    }

    .panel[data-enter] {
      animation: enter var(--_metro-motion) ease-out;
    }

    .panel[data-enter="left"] { --_metro-pivot-enter: -1.5rem; }
    .panel[data-enter="right"] { --_metro-pivot-enter: 1.5rem; }
    .panel[hidden] { display: none; }

    @keyframes enter {
      from { opacity: 0.68; transform: translateX(var(--_metro-pivot-enter)); }
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel { transform: none; animation: none; transition: none; }
    }

    @media (forced-colors: active) {
      .tab[aria-selected="true"], .tab[data-current] { border-block-end: 2px solid Highlight; }
    }
  `];

  declare value: string;
  declare label: string;

  #panels: Panel[] = [];
  #panelIds = new WeakMap<MetroPivotItem, number>();
  #nextPanelId = 0;
  #focusedValue = '';
  #restoreTabFocus = false;
  #entry?: { value: string; side: 'left' | 'right' };
  #gesture?: Gesture;
  #blockPointerClick = false;
  #lockedValue: string | null = null;
  #headersOverflow = false;
  #headerSizes = new ResizeObserver(() => this.#layoutHeaders());
  #headerMotion?: HeaderMotion;

  #observe = new MutationObserver(records => {
    if (records.some(record =>
      (record.type === 'childList' && record.target === this) ||
      (record.attributeName === 'dir' && (record.target === this || !this.contains(record.target))) ||
      (record.type === 'attributes' && record.target.parentNode === this),
    )) {
      this.requestUpdate();
    }
  });

  constructor() {
    super();
    this.value = '';
    this.label = '';
  }

  protected get selectionLocked(): boolean { return false; }

  protected rememberLockedSelection(locked: boolean): void {
    this.#lockedValue = locked && this.#panels.some(panel => !panel.disabled && panel.value === this.value)
      ? this.value : null;
    if (!locked) return;
    if (this.#gesture?.dragging) this.#blockPointerClick = true;
    this.#resetGesture();
    this.#cancelHeaderMotion();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observe.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'dir'],
    });
    observeAncestorDirection(this.#observe, this);
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observe.disconnect();
    this.#headerSizes.disconnect();
    this.#cancelHeaderMotion();
    this.#resetGesture();
    this.#focusedValue = '';
    this.#restoreTabFocus = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    const focusedElement = this.shadowRoot?.activeElement;
    const previouslyFocusedPanel = this.#panels.find(panel =>
      focusedElement?.id === `panel-${panel.id}` || panel.item.matches(':focus-within'),
    );
    const values = new Set<string>();
    const panels: Panel[] = [];

    for (const child of this.children) {
      if (child.localName !== 'metro-pivot-item') continue;

      const item = child as MetroPivotItem;
      const { value, label, disabled } = item;
      if (!value || values.has(value)) continue;

      values.add(value);
      let id = this.#panelIds.get(item);
      if (id === undefined) {
        id = ++this.#nextPanelId;
        this.#panelIds.set(item, id);
      }
      panels.push({ item, id, value, label: label || value, disabled });
    }

    const locked = this.selectionLocked;
    const requested = locked ? this.#lockedValue ?? this.value : this.value;
    const selected = panels.find(panel => !panel.disabled && panel.value === requested)
      ?? panels.find(panel => !panel.disabled);
    this.value = selected?.value ?? '';
    this.#panels = panels;
    this.#lockedValue = locked ? this.value : null;

    if ((locked && this.#focusedValue !== this.value)
      || !panels.some(panel => !panel.disabled && panel.value === this.#focusedValue)) {
      this.#restoreTabFocus ||= focusedElement?.getAttribute('role') === 'tab';
      this.#focusedValue = '';
    }

    if (previouslyFocusedPanel && previouslyFocusedPanel.item !== selected?.item) {
      this.#restoreTabFocus = true;
    }
    if (selected && focusedElement?.matches('.tabs')) this.#restoreTabFocus = true;

    if (this.#gesture && this.#gesture.value !== this.value) this.#resetGesture();
    if (locked || this.#entry?.value !== this.value) this.#entry = undefined;
  }

  protected override firstUpdated(): void {
    this.#viewport?.addEventListener('click', event => {
      if (!this.#blockPointerClick || event.detail === 0) return;
      this.#blockPointerClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
  }

  protected override updated(changed: PropertyValues<this>): void {
    for (const { item, id } of this.#panels) {
      const slot = this.shadowRoot?.getElementById(`slot-${id}`) as HTMLSlotElement;
      if (slot.assignedElements()[0] !== item) slot.assign(item);
    }

    const strip = this.shadowRoot?.querySelector<HTMLElement>('.tabs');
    if (this.#restoreTabFocus) {
      this.#restoreTabFocus = false;
      (this.#button(this.value) ?? strip)?.focus({ preventScroll: true });
    }
    const headers = strip?.querySelector<HTMLElement>('.tab-headers:not([aria-hidden])');
    if (!strip || !headers) return;
    this.#headerSizes.observe(strip);
    this.#headerSizes.observe(headers);
    this.#layoutHeaders(changed.has('value'));
  }

  #layoutHeaders(preferSelection = false): void {
    const strip = this.shadowRoot?.querySelector<HTMLElement>('.tabs');
    const headers = strip?.querySelector<HTMLElement>('.tab-headers:not([aria-hidden])');
    if (!strip?.clientWidth || !headers) return;

    const style = getComputedStyle(strip);
    const padding = parseFloat(style.paddingInlineStart);
    const overflow = !this.selectionLocked && this.#panels.length > 1
      && headers.getBoundingClientRect().width + padding + parseFloat(style.paddingInlineEnd) > strip.clientWidth + 1;
    if (this.#headersOverflow !== overflow) {
      this.#cancelHeaderMotion();
      this.#headersOverflow = overflow;
      this.requestUpdate();
      return;
    }

    const value = preferSelection ? this.value : this.#focusedValue || this.value;
    const motion = this.#headerMotion;
    if (motion && value === motion.value && strip.clientWidth === motion.viewportWidth
      && strip.scrollWidth === motion.stripWidth && style.direction === motion.direction) return;
    this.#cancelHeaderMotion();
    const button = this.#button(value);
    if (!button) return;

    const left = this.#headerDelta(strip, button, overflow && value === this.value, style);
    if (Math.abs(left) > 0.5) strip.scrollBy({ left, behavior: 'instant' });
  }

  #headerDelta(strip: HTMLElement, button: HTMLElement, align: boolean, style = getComputedStyle(strip)): number {
    const tab = button.getBoundingClientRect();
    const start = strip.getBoundingClientRect().left + strip.clientLeft;
    const end = start + strip.clientWidth;
    const rtl = style.direction === 'rtl';
    if (align) {
      const previous = button.previousElementSibling ?? button.parentElement?.previousElementSibling?.lastElementChild;
      const trailingSpace = previous ? parseFloat(getComputedStyle(previous).paddingInlineEnd) : 0;
      const peek = Math.max(parseFloat(style.paddingInlineStart), trailingSpace + 14);
      const inset = Math.max(0, Math.min(peek, strip.clientWidth - tab.width));
      return rtl ? tab.right - (end - inset) : tab.left - (start + inset);
    }
    if (tab.width > strip.clientWidth) return rtl ? tab.right - end : tab.left - start;
    if (tab.left < start) return tab.left - start;
    if (tab.right > end) return tab.right - end;
    return 0;
  }

  #cancelHeaderMotion = (): void => {
    if (!this.#headerMotion) return;
    this.ownerDocument.defaultView?.cancelAnimationFrame(this.#headerMotion.frame);
    this.#headerMotion = undefined;
  };

  #scrollTowardHeader(value: string, target: HTMLElement): void {
    const strip = target.closest<HTMLElement>('.tabs');
    const view = this.ownerDocument.defaultView;
    if (!strip || !view || !this.#headersOverflow || value !== this.value) return;
    const media = view.matchMedia('(prefers-reduced-motion: reduce)');
    const style = getComputedStyle(strip);
    const time = style.getPropertyValue('--_metro-motion').trim();
    const duration = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
    if (media.matches || !Number.isFinite(duration) || duration <= 0) return;
    const from = strip.scrollLeft;
    const delta = this.#headerDelta(strip, target, true, style);
    const extent = strip.scrollWidth - strip.clientWidth;
    const logicalOffset = (from + delta) * (style.direction === 'rtl' ? -1 : 1);
    if (Math.abs(delta) <= 1 || logicalOffset < 0 || logicalOffset > extent + 1) return;

    const motion: HeaderMotion = {
      value, direction: style.direction, viewportWidth: strip.clientWidth, stripWidth: strip.scrollWidth, frame: 0,
    };
    const started = view.performance.now();
    const advance = (now: number) => {
      if (this.#headerMotion !== motion) return;
      const progress = Math.max(0, Math.min(1, (now - started) / duration));
      const done = progress === 1 || media.matches;
      if (done) {
        strip.scrollTo({ left: from + delta, behavior: 'instant' });
        this.#headerMotion = undefined;
        // The original tab occupies the equivalent position across the cyclic seam.
        this.#layoutHeaders(true);
      } else {
        const eased = 1 - (1 - progress) ** 3;
        strip.scrollTo({ left: from + delta * eased, behavior: 'instant' });
        motion.frame = view.requestAnimationFrame(advance);
      }
    };
    this.#headerMotion = motion;
    motion.frame = view.requestAnimationFrame(advance);
  }

  #button(value: string): HTMLButtonElement | null {
    const panel = this.#panels.find(item => item.value === value);
    return panel ? this.shadowRoot?.querySelector<HTMLButtonElement>(`#tab-${panel.id}`) ?? null : null;
  }

  #activate(value: string, side?: 'left' | 'right'): void {
    if (this.selectionLocked || value === this.value) return;
    this.#entry = side ? { value, side } : undefined;
    this.value = value;
    this.dispatchEvent(new CustomEvent('metro-change', {
      detail: { value },
      bubbles: true,
      composed: true,
    }) satisfies MetroChangeEvent);
  }

  #onTabFocus(value: string): void {
    this.#focusedValue = value;
    this.requestUpdate();
  }

  #onTabMouseDown(event: MouseEvent): void {
    if (event.button === 0 && event.target instanceof Element && event.target.closest('.tab')) {
      // The pointer may be over a clipped tab. Wait for its click before moving the strip.
      event.preventDefault();
    }
  }

  #onTabClick(event: MouseEvent, value: string): void {
    const button = this.#button(value);
    if (!button || button.disabled || this.selectionLocked) return;
    this.#cancelHeaderMotion();
    const focusOptions = { preventScroll: true, focusVisible: event.detail > 0 ? false : undefined };
    button.focus(focusOptions);
    this.#activate(value);
    if (event.detail > 0) this.#scrollTowardHeader(value, event.currentTarget as HTMLElement);
    this.requestUpdate();
  }

  #onTabsBlur(event: FocusEvent): void {
    const strip = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && strip.contains(event.relatedTarget)) return;

    this.#focusedValue = '';
    this.requestUpdate();
  }

  #onTabKeyDown(event: KeyboardEvent, value: string): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    this.#cancelHeaderMotion();
    if (this.selectionLocked) { event.preventDefault(); return; }

    const enabled = this.#panels.filter(panel => !panel.disabled);
    const current = enabled.findIndex(panel => panel.value === value);
    if (current < 0) return;

    const direction = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    const step = event.key === 'ArrowRight' ? direction : -direction;
    let next = (current + step + enabled.length) % enabled.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = enabled.length - 1;
    event.preventDefault();
    this.#button(enabled[next].value)?.focus({ preventScroll: true });
  }

  get #viewport(): HTMLElement | null | undefined {
    return this.shadowRoot?.querySelector<HTMLElement>('.viewport');
  }

  #onPointerDown(event: PointerEvent): void {
    this.#blockPointerClick = false;
    if (this.selectionLocked || event.pointerType !== 'touch' || !event.isPrimary || this.#gesture || !this.value) return;

    const path = event.composedPath();
    const owner = path.find(target => target instanceof Element && target.matches(
      'metro-pivot, metro-lockable-pivot, metro-hub, metro-panorama, metro-flip-view',
    ));
    if (owner !== this || path.some(target => target instanceof Element && target.matches(
      '[data-metro-no-swipe]:not([data-metro-no-swipe="lockable-pivot"]), input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], audio, video',
    ))) return;

    const viewport = event.currentTarget as HTMLElement;
    this.#gesture = {
      pointer: event.pointerId, value: this.value, x: event.clientX, y: event.clientY,
      width: viewport.clientWidth, dragging: false,
    };
  }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (gesture?.pointer !== event.pointerId || this.selectionLocked) return;

    const viewport = event.currentTarget as HTMLElement;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    if (viewport.clientWidth !== gesture.width) {
      this.#resetGesture();
      return;
    }

    if (!gesture.dragging) {
      if (Math.abs(y) > 8 && Math.abs(y) > Math.abs(x)) {
        this.#resetGesture();
        return;
      }
      if (Math.abs(x) <= 8 || Math.abs(x) <= Math.abs(y) * 1.25) return;

      gesture.dragging = true;
      this.#entry = undefined;
      this.requestUpdate();
      viewport.setPointerCapture(event.pointerId);
      viewport.setAttribute('data-dragging', '');
    }

    const shift = Math.min(gesture.width, Math.abs(x)) * Math.sign(x);
    viewport.style.setProperty('--_metro-pivot-drag', `${shift}px`);
  }

  #onPointerUp(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (gesture?.pointer !== event.pointerId) return;
    this.#resetGesture();
    if (!gesture.dragging) return;

    this.#blockPointerClick = true;
    const viewport = event.currentTarget as HTMLElement;
    if (this.selectionLocked || viewport.clientWidth !== gesture.width) return;
    const delta = event.clientX - gesture.x;
    if (Math.abs(delta) < Math.min(72, gesture.width * 0.2)) return;

    const enabled = this.#panels.filter(panel => !panel.disabled);
    const current = enabled.findIndex(panel => panel.value === gesture.value);
    if (current < 0) return;

    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = (delta < 0 ? 1 : -1) * (rtl ? -1 : 1);
    const next = enabled[(current + step + enabled.length) % enabled.length];
    this.#activate(next.value, delta < 0 ? 'right' : 'left');
  }

  #onPointerCancel(event: PointerEvent): void {
    if (this.#gesture?.pointer === event.pointerId) this.#resetGesture();
  }

  #onLostPointerCapture(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.#onPointerCancel(event);
  }

  #resetGesture(): void {
    const gesture = this.#gesture;
    this.#gesture = undefined;
    const viewport = this.#viewport;
    if (!gesture?.dragging || !viewport) return;

    viewport.removeAttribute('data-dragging');
    viewport.style.removeProperty('--_metro-pivot-drag');
    if (viewport.hasPointerCapture(gesture.pointer)) viewport.releasePointerCapture(gesture.pointer);
  }

  #renderHeaderCopy(panel: Panel) {
    return html`<span class="tab tab-copy" part="tab" aria-hidden="true" ?data-disabled=${panel.disabled}
      ?data-current=${panel.value === this.value} @click=${(event: MouseEvent) => this.#onTabClick(event, panel.value)}>${panel.label}</span>`;
  }

  #renderHeaderCopies(headers: Panel[]) {
    return html`<div class="tab-headers" aria-hidden="true">
      ${repeat(headers, panel => panel.id, panel => this.#renderHeaderCopy(panel))}
    </div>`;
  }

  protected override render() {
    const locked = this.selectionLocked;
    const headers = locked ? this.#panels.filter(panel => panel.value === this.value) : this.#panels;
    const cyclic = this.#headersOverflow && !locked && headers.length > 1;
    return html`
      <div class="tabs" part="tablist" role="tablist" aria-label=${this.label || 'Sections'}
        tabindex=${this.value ? nothing : -1}
        ?data-locked=${locked} @mousedown=${this.#onTabMouseDown} @focusout=${this.#onTabsBlur}
        @pointerdown=${this.#cancelHeaderMotion} @wheel=${this.#cancelHeaderMotion}>
        ${cyclic ? this.#renderHeaderCopies(headers) : nothing}
        <div class="tab-headers" role="presentation">
          ${repeat(headers, panel => panel.id, panel => html`
            <button class="tab" part="tab" role="tab" type="button" id="tab-${panel.id}"
              aria-controls="panel-${panel.id}" aria-selected=${String(panel.value === this.value)}
              tabindex=${!panel.disabled && panel.value === (this.#focusedValue || this.value) ? 0 : -1}
              ?disabled=${panel.disabled}
              @focus=${() => this.#onTabFocus(panel.value)}
              @click=${(event: MouseEvent) => this.#onTabClick(event, panel.value)}
              @keydown=${(event: KeyboardEvent) => this.#onTabKeyDown(event, panel.value)}>
              ${panel.label}
            </button>
          `)}
        </div>
        ${cyclic ? this.#renderHeaderCopies(headers) : nothing}
      </div>
      <div class="viewport" part="viewport"
        data-metro-no-swipe=${this.localName === 'metro-lockable-pivot' ? 'lockable-pivot' : nothing}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel}
        @lostpointercapture=${this.#onLostPointerCapture}>
        ${repeat(this.#panels, panel => panel.id, panel => html`
          <section class="panel" part="panel" role="tabpanel" id="panel-${panel.id}"
            aria-labelledby="tab-${panel.id}" tabindex="0" ?hidden=${panel.value !== this.value}
            data-enter=${this.#entry?.value === panel.value ? this.#entry.side : nothing}>
            <slot id="slot-${panel.id}"></slot>
          </section>
        `)}
      </div>
    `;
  }
}

defineElement('metro-pivot', MetroPivot);

declare global {
  interface HTMLElementTagNameMap {
    'metro-pivot': MetroPivot;
  }
  interface HTMLElementEventMap {
    'metro-change': MetroChangeEvent;
  }
}
