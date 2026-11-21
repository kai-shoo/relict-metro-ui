import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { restorableAnchorOffset } from './collection-anchor.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import './progress-ring.js';
import type { MetroScrollAnchor } from './scroll-viewer.js';
import { metroTheme } from './theme.js';

export type MetroRefreshSource = 'pull' | 'button' | 'programmatic';
export type MetroRefreshEvent = CustomEvent<{ source: MetroRefreshSource }>;

interface PullGesture {
  pointer: number;
  x: number;
  y: number;
  width: number;
  dragging: boolean;
}

export class MetroRefreshContainer extends LitElement {
  static override properties: PropertyDeclarations = {
    refreshing: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    refreshLabel: { type: String, attribute: 'refresh-label' },
    refreshingLabel: { type: String, attribute: 'refreshing-label' },
    pullLabel: { type: String, attribute: 'pull-label' },
    releaseLabel: { type: String, attribute: 'release-label' },
    status: { type: String },
    threshold: { type: Number },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .body { position: relative; }
    .viewport {
      block-size: var(--metro-refresh-height, min(65dvh, 30rem));
      min-block-size: 0;
      overflow: hidden auto;
      overflow-anchor: none;
      overscroll-behavior-y: contain;
      touch-action: pan-x pan-y pinch-zoom;
      scrollbar-color: var(--_metro-border) transparent;
      scrollbar-width: thin;
    }
    .viewport[data-pull-enabled] { touch-action: pan-x pan-down pinch-zoom; }
    .viewport:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .controls { display: flex; gap: var(--_metro-space); align-items: center; margin-block-end: .5rem; }
    .trigger {
      min-block-size: 2.75rem;
      padding: .25rem var(--_metro-space);
      border: 2px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .trigger:disabled { color: var(--_metro-disabled); cursor: default; }
    .trigger:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .indicator {
      position: absolute;
      inset-block-start: 0;
      inset-inline: 0;
      z-index: 1;
      padding: .35rem var(--_metro-space);
      background: var(--metro-refresh-indicator-background, var(--_metro-chrome));
      opacity: 0;
      transform: translateY(calc(-100% + var(--_pull, 0px)));
      transition: transform var(--_metro-motion) ease, opacity var(--_metro-motion) ease;
      pointer-events: none;
      text-align: center;
    }
    .body[data-pulling] .indicator { opacity: 1; transition: none; }
    .body[data-ready] .indicator { color: var(--_metro-accent); }
    .body .release, .body[data-ready] .pull { display: none; }
    .body[data-ready] .release { display: inline; }
    @media (forced-colors: active) { :is(.trigger, .viewport):focus-visible { outline-color: Highlight; } }
  `];

  declare refreshing: boolean;
  declare disabled: boolean;
  declare label: string;
  declare refreshLabel: string;
  declare refreshingLabel: string;
  declare pullLabel: string;
  declare releaseLabel: string;
  declare status: string;
  declare threshold: number;

  #atTop = true;
  #pending = false;
  #pull?: PullGesture;
  #suppressTap = false;
  #anchor: MetroScrollAnchor | null = null;
  #focus?: { element: HTMLElement; key?: string };

  constructor() {
    super();
    this.refreshing = false;
    this.disabled = false;
    this.label = '';
    this.refreshLabel = 'Refresh';
    this.refreshingLabel = 'Refreshing';
    this.pullLabel = 'Pull to refresh';
    this.releaseLabel = 'Release to refresh';
    this.status = '';
    this.threshold = 64;
  }

  get scrollViewport(): HTMLElement | null { return this.shadowRoot?.querySelector<HTMLElement>('.viewport') ?? null; }

  requestRefresh(): boolean { return this.#request('programmatic'); }

  getAnchor(): MetroScrollAnchor | null {
    const viewport = this.scrollViewport;
    if (!viewport) return null;
    const top = viewport.getBoundingClientRect().top + viewport.clientTop;
    const bottom = top + viewport.clientHeight;
    let anchor: MetroScrollAnchor | null = null;
    for (const row of this.#rows()) {
      const rect = row.getBoundingClientRect();
      if (!rect.height || rect.bottom <= top || rect.top >= bottom) continue;
      const offset = rect.top - top;
      if (!anchor || offset < anchor.offset) anchor = { key: row.dataset.metroKey!, offset, axis: 'vertical' };
    }
    return anchor;
  }

  restoreAnchor(anchor: MetroScrollAnchor): boolean {
    const viewport = this.scrollViewport;
    const row = this.#rows().find(element => element.dataset.metroKey === anchor.key);
    if (!row || !viewport || anchor.axis !== 'vertical' || !Number.isFinite(anchor.offset)) return false;
    const rect = row.getBoundingClientRect();
    if (!rect.height) return false;
    const delta = rect.top - viewport.getBoundingClientRect().top - viewport.clientTop
      - restorableAnchorOffset(anchor.offset, rect.height);
    viewport.scrollBy({ top: delta, behavior: 'instant' });
    return true;
  }

  override disconnectedCallback(): void {
    this.#resetPull();
    this.#anchor = null;
    this.#focus = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.scrollViewport?.addEventListener('click', this.#guardClick, true);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.disabled || this.refreshing) this.#resetPull();
    if (changed.has('refreshing') && this.refreshing && !this.#pending) this.#remember();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('refreshing') && changed.get('refreshing') === true && !this.refreshing) {
      const anchor = this.#anchor;
      this.#anchor = null;
      if (anchor) this.restoreAnchor(anchor);
      this.#restoreFocus();
    }
  }

  #rows(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[data-metro-key]')).filter(row =>
      row.dataset.metroKey && row.closest('metro-refresh-container') === this && row.getClientRects().length,
    );
  }

  #remember(): void {
    this.#anchor = this.getAnchor();
    const root = this.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    this.#focus = active instanceof HTMLElement && this.contains(active) ? { element: active,
      key: active.closest<HTMLElement>('[data-metro-focus]')?.dataset.metroFocus } : undefined;
  }

  #restoreFocus(): void {
    const snapshot = this.#focus;
    this.#focus = undefined;
    if (!snapshot) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    const { element, key } = snapshot;
    const originalAvailable = this.#available(element);
    if (active && active !== this.ownerDocument.body && active !== this.ownerDocument.documentElement
      && (active !== element || !this.contains(element) || originalAvailable)) return;
    if (originalAvailable && tryFocus(element)) return;
    if (key) {
      for (const replacement of this.querySelectorAll<HTMLElement>('[data-metro-focus]')) {
        if (replacement !== element && replacement.dataset.metroFocus === key
          && replacement.closest('metro-refresh-container') === this && this.#available(replacement)
          && tryFocus(replacement)) return;
      }
    }
    tryFocus(this.scrollViewport);
  }

  #available(element: HTMLElement): boolean {
    return this.contains(element) && !element.matches(':disabled') && !element.closest('[inert]')
      && element.getClientRects().length > 0;
  }

  #request(source: MetroRefreshSource): boolean {
    if (this.disabled || this.refreshing || this.#pending) return false;
    this.#pending = true;
    this.#remember();
    this.dispatchEvent(new CustomEvent('metro-refresh', {
      detail: { source }, bubbles: true, composed: true,
    }) satisfies MetroRefreshEvent);
    queueMicrotask(() => {
      this.#pending = false;
      if (!this.refreshing) { this.#anchor = null; this.#focus = undefined; }
    });
    return true;
  }

  #onScroll(): void {
    const top = (this.scrollViewport?.scrollTop ?? 0) <= 1;
    if (top !== this.#atTop) {
      this.#atTop = top;
      this.requestUpdate();
    }
    if (this.refreshing) this.#anchor = this.getAnchor();
  }

  #guardClick = (event: MouseEvent): void => {
    if (!this.#suppressTap || event.detail === 0) return;
    this.#suppressTap = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onPointerDown(event: PointerEvent): void {
    this.#suppressTap = false;
    const viewport = this.scrollViewport;
    if (!viewport || viewport.scrollTop > 1 || this.#pull || this.disabled || this.refreshing || this.#pending
      || !event.isPrimary || event.pointerType !== 'touch') return;
    const path = event.composedPath();
    const owner = path.find(node => node instanceof HTMLElement && node.localName === 'metro-refresh-container');
    const origin = path.slice(0, path.indexOf(viewport));
    if (owner !== this || origin.some(node => node instanceof HTMLElement && (
      node.matches('[data-metro-no-refresh], input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="slider"]')
      || (node.scrollHeight > node.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY))
    ))) return;
    this.#pull = { pointer: event.pointerId, x: event.clientX, y: event.clientY, width: viewport.clientWidth, dragging: false };
  }

  get #threshold() { return Number.isFinite(this.threshold) && this.threshold > 0 ? this.threshold : 64; }

  #onPointerMove(event: PointerEvent): void {
    const pull = this.#pull;
    const viewport = this.scrollViewport;
    if (!viewport || pull?.pointer !== event.pointerId) return;
    if (viewport.scrollTop > 1 || viewport.clientWidth !== pull.width) { this.#resetPull(); return; }
    const y = event.clientY - pull.y;
    if (!pull.dragging) {
      const x = Math.abs(event.clientX - pull.x);
      if (y < -8 || (x > 8 && x >= Math.abs(y))) { this.#resetPull(); return; }
      if (y <= 8 || y <= x * 1.25) return;
      pull.dragging = true;
      this.#suppressTap = true;
      if (event.isTrusted) viewport.setPointerCapture(event.pointerId);
    }
    const body = this.shadowRoot?.querySelector<HTMLElement>('.body');
    body?.toggleAttribute('data-pulling', y > 0);
    body?.toggleAttribute('data-ready', y >= this.#threshold);
    body?.style.setProperty('--_pull', `${Math.min(65, Math.max(0, y * .58))}px`);
  }

  #onPointerUp(event: PointerEvent): void {
    const pull = this.#pull;
    if (pull?.pointer !== event.pointerId) return;
    const trigger = pull.dragging && event.clientY - pull.y >= this.#threshold
      && this.scrollViewport?.clientWidth === pull.width && this.scrollViewport.scrollTop <= 1;
    this.#resetPull();
    if (trigger) this.#request('pull');
  }

  #onPointerCancel(event: PointerEvent): void {
    if (this.#pull?.pointer === event.pointerId) this.#resetPull();
  }

  #onLostCapture(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.#onPointerCancel(event);
  }

  #resetPull(): void {
    const pull = this.#pull;
    this.#pull = undefined;
    const body = this.shadowRoot?.querySelector<HTMLElement>('.body');
    body?.removeAttribute('data-pulling');
    body?.removeAttribute('data-ready');
    body?.style.removeProperty('--_pull');
    const viewport = this.scrollViewport;
    if (pull && viewport?.hasPointerCapture(pull.pointer)) viewport.releasePointerCapture(pull.pointer);
  }

  protected override render() {
    return html`
      <div class="controls" part="controls">
        <button type="button" class="trigger" part="trigger" ?disabled=${this.disabled || this.refreshing}
          @click=${() => this.#request('button')}>${this.refreshLabel}</button>
        <metro-progress-ring size="small" .label=${this.refreshingLabel} ?active=${this.refreshing}></metro-progress-ring>
        <span part="status" role="status">${this.refreshing ? this.refreshingLabel : this.status}</span>
      </div>
      <div class="body" part="body">
        <div class="indicator" part="indicator" aria-hidden="true">
          <span class="pull">${this.pullLabel}</span><span class="release">${this.releaseLabel}</span>
        </div>
        <div class="viewport" part="viewport" role=${this.label ? 'region' : nothing} aria-label=${this.label || nothing}
          aria-busy=${this.refreshing ? 'true' : nothing} tabindex="0" ?data-pull-enabled=${this.#atTop && !this.refreshing && !this.disabled}
          @scroll=${this.#onScroll} @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove}
          @pointerup=${this.#onPointerUp} @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onLostCapture}>
          <slot></slot>
        </div>
      </div>`;
  }
}

defineElement('metro-refresh-container', MetroRefreshContainer);

declare global {
  interface HTMLElementTagNameMap { 'metro-refresh-container': MetroRefreshContainer; }
  interface HTMLElementEventMap { 'metro-refresh': MetroRefreshEvent; }
}
