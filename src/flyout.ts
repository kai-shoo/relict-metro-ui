import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { observeAnchorScroll } from './anchored-scroll.js';
import { revealVertically, tryFocus } from './focus-target.js';
import { metroTheme } from './theme.js';

export interface MetroFlyoutPoint {
  readonly x: number;
  readonly y: number;
}

export type MetroFlyoutCloseReason = 'action' | 'dismiss' | 'escape' | 'programmatic';
export type MetroFlyoutCloseEvent = CustomEvent<{ reason: MetroFlyoutCloseReason }>;

export class MetroFlyout extends LitElement {
  static override properties = {
    label: { type: String },
    triggerLabel: { type: String, attribute: 'trigger-label' },
    open: { type: Boolean, reflect: true },
    passThrough: { type: Boolean, attribute: 'pass-through', reflect: true },
    returnFocus: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: inline; }

    .trigger {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      overflow-wrap: anywhere;
      padding: .25rem min(.75rem, 2.5vi);
      border: 3px solid currentColor;
      background: transparent;
      color: var(--_metro-fg);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .trigger:active {
      border-color: var(--_metro-accent);
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }

    .trigger:focus-visible,
    .surface:focus-visible {
      outline: 2px solid var(--_metro-focus);
      outline-offset: 2px;
    }

    .layer {
      position: fixed;
      inset: 0;
      inline-size: auto;
      block-size: auto;
      max-inline-size: none;
      max-block-size: none;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      overflow: visible;
      pointer-events: none;
    }

    .dismiss {
      position: absolute;
      inset: 0;
      pointer-events: auto;
    }

    :host([pass-through]) .dismiss { display: none; }

    .surface {
      position: fixed;
      inset: auto;
      box-sizing: border-box;
      inline-size: max-content;
      max-inline-size: min(24rem, var(--_metro-flyout-width, calc(100vw - 1rem)));
      max-block-size: var(--_metro-flyout-height, calc(100dvh - 1rem));
      margin: 0;
      padding: var(--_metro-space);
      border: 0;
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--_metro-chrome);
      color: var(--_metro-fg);
      font: inherit;
      overflow-wrap: anywhere;
      pointer-events: auto;
    }

    @media (forced-colors: active) { .surface { border: 1px solid CanvasText; } }
  `];

  declare label: string;
  declare triggerLabel: string;
  declare open: boolean;
  declare passThrough: boolean;
  declare returnFocus: HTMLElement | null;

  #anchor: HTMLElement | null = null;
  #invoker: HTMLElement | null = null;
  #point: MetroFlyoutPoint | null = null;
  #displayed = false;
  #observe: AbortController | null = null;
  #resize: ResizeObserver | null = null;

  constructor() {
    super();
    this.label = '';
    this.triggerLabel = '';
    this.open = false;
    this.passThrough = false;
    this.returnFocus = null;
  }

  show(anchor?: HTMLElement): void {
    this.#show(anchor, null);
  }

  showAt(anchor: HTMLElement, point: MetroFlyoutPoint): void {
    this.#show(anchor, point);
  }

  close(): void {
    this.closeLayer('programmatic');
  }

  override focus(options?: FocusOptions): void {
    const trigger = this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    if (trigger) trigger.focus(options);
    else super.focus(options);
  }

  #show(anchor: HTMLElement | undefined, point: MetroFlyoutPoint | null): void {
    const active = this.#activeElement();
    this.#anchor = anchor ?? active;
    if (!this.#displayed || anchor) this.#invoker = anchor ?? active;
    this.#point = point;
    this.open = true;
    if (this.#displayed) this.#observePosition();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#stopPositionUpdates();
    this.#anchor = null;
    this.#invoker = null;
    this.#point = null;
    this.#displayed = false;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    const layer = this.#layer;
    if (!layer || !this.isConnected) return;

    if (this.open && !this.#displayed) {
      const active = this.#activeElement();
      this.#anchor ??= active;
      this.#invoker ??= active;
      layer.showPopover();
      this.#displayed = layer.matches(':popover-open');
      if (this.#displayed) {
        this.#observePosition();
        this.focusSurface();
      } else {
        this.open = false;
      }
    } else if (!this.open && this.#displayed) {
      this.closeLayer('programmatic');
    }
  }

  get #layer(): HTMLElement | null | undefined {
    return this.shadowRoot?.getElementById('layer');
  }

  protected get surface(): HTMLElement | null | undefined {
    return this.shadowRoot?.getElementById('surface');
  }

  protected get surfaceRole(): 'dialog' | 'menu' { return 'dialog'; }
  protected get lightDismiss(): boolean { return true; }
  protected get accessibleLabel(): string { return this.label || (this.surfaceRole === 'menu' ? 'Commands' : 'Options'); }

  protected focusSurface(): void {
    const surface = this.surface;
    if (!surface) return;
    const autofocus = this.querySelector<HTMLElement>('[autofocus]:not(:disabled)');
    if (autofocus?.getClientRects().length) this.focusSurfaceItem(autofocus);
    if (!surface.matches(':focus-within')) surface.focus({ preventScroll: true });
  }

  protected focusSurfaceItem(item: HTMLElement): void {
    const surface = this.surface;
    if (!surface) return;
    item.focus({ preventScroll: true });
    if (item.matches(':focus')) revealVertically(item, surface);
  }

  protected closeLayer(reason: MetroFlyoutCloseReason, restoreFocus = true): void {
    if (!this.#displayed) {
      this.open = false;
      return;
    }
    const layer = this.#layer;
    if (layer?.matches(':popover-open')) layer.hidePopover();
    this.#finish(reason, restoreFocus);
  }

  #finish(reason: MetroFlyoutCloseReason, restoreFocus: boolean): void {
    this.#displayed = false;
    this.open = false;
    this.#stopPositionUpdates();
    const invoker = this.#invoker;
    this.#anchor = null;
    this.#invoker = null;
    this.#point = null;
    if (restoreFocus || this.ownerDocument.activeElement === this.ownerDocument.body) {
      if (!tryFocus(invoker)) tryFocus(this.returnFocus);
    }
    this.dispatchEvent(new CustomEvent('metro-close', {
      detail: { reason }, bubbles: true, composed: true,
    }) satisfies MetroFlyoutCloseEvent);
  }

  #activeElement(): HTMLElement | null {
    const root = this.getRootNode();
    const active = root instanceof ShadowRoot ? root.activeElement : this.ownerDocument.activeElement;
    return active instanceof HTMLElement ? active : null;
  }

  #observePosition(): void {
    this.#stopPositionUpdates();
    const view = this.ownerDocument.defaultView;
    const surface = this.surface;
    if (!view || !surface) return;

    this.#position();
    this.#observe = new AbortController();
    const options = { signal: this.#observe.signal };
    view.addEventListener('resize', this.#position, options);
    observeAnchorScroll(this.#anchor ?? this, this.#position, options.signal);
    view.visualViewport?.addEventListener('resize', this.#position, options);
    view.visualViewport?.addEventListener('scroll', this.#position, options);

    this.#resize = new ResizeObserver(this.#position);
    this.#resize.observe(surface);
    if (this.#anchor?.isConnected) this.#resize.observe(this.#anchor);
  }

  #stopPositionUpdates(): void {
    this.#observe?.abort();
    this.#observe = null;
    this.#resize?.disconnect();
    this.#resize = null;
  }

  #position = () => {
    const view = this.ownerDocument.defaultView;
    const surface = this.surface;
    if (!view || !surface) return;

    const edge = 8;
    const gap = 4;
    const viewport = view.visualViewport;
    const startX = viewport?.offsetLeft ?? 0;
    const startY = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? this.ownerDocument.documentElement.clientWidth;
    const height = viewport?.height ?? this.ownerDocument.documentElement.clientHeight;
    surface.style.setProperty('--_metro-flyout-width', `${Math.max(0, width - 2 * edge)}px`);
    surface.style.setProperty('--_metro-flyout-height', `${Math.max(0, height - 2 * edge)}px`);

    const anchor = this.#anchor?.isConnected ? this.#anchor.getBoundingClientRect() : undefined;
    const { width: panelWidth, height: panelHeight } = surface.getBoundingClientRect();
    const rtl = view.getComputedStyle(this).direction === 'rtl';
    const left = this.#point?.x
      ?? (anchor ? (rtl ? anchor.right - panelWidth : anchor.left) : startX + (width - panelWidth) / 2);
    const below = this.#point?.y ?? (anchor ? anchor.bottom + gap : startY + (height - panelHeight) / 2);
    const above = (this.#point?.y ?? anchor?.top ?? below) - panelHeight - gap;
    const top = below + panelHeight > startY + height - edge && above >= startY + edge ? above : below;

    surface.style.left = `${Math.max(startX + edge, Math.min(left, startX + width - panelWidth - edge))}px`;
    surface.style.top = `${Math.max(startY + edge, Math.min(top, startY + height - panelHeight - edge))}px`;
  };

  #toggle = () => {
    if (this.#displayed && !this.#layer?.matches(':popover-open')) this.#finish('dismiss', false);
  };

  #onTrigger = (event: Event) => {
    if (this.open) this.closeLayer('dismiss');
    else this.show(event.currentTarget as HTMLElement);
  };

  #onDismiss = (event: MouseEvent) => {
    event.stopPropagation();
    this.closeLayer('dismiss');
  };

  #onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.composedPath().some(node => node instanceof HTMLButtonElement
      && node.hasAttribute('data-metro-close') && !node.matches(':disabled'))) {
      event.preventDefault();
      this.closeLayer('action');
    }
  };

  #onFocusOut = () => {
    if (!this.lightDismiss) return;
    // The browser can dispatch focusout before setting the next active element.
    this.ownerDocument.defaultView?.setTimeout(() => {
      if (this.#displayed && !this.surface?.matches(':focus-within')) {
        this.closeLayer('dismiss', false);
      }
    }, 0);
  };

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.closeLayer('escape');
  }

  protected renderContent() { return html`<slot></slot>`; }

  protected override render() {
    return html`
      ${this.triggerLabel ? html`
        <button type="button" class="trigger" part="trigger" aria-haspopup=${this.surfaceRole}
          aria-expanded=${this.open} aria-controls="surface" @click=${this.#onTrigger}>${this.triggerLabel}</button>
      ` : null}
      <div id="layer" class="layer" popover=${this.lightDismiss ? 'auto' : 'manual'} @toggle=${this.#toggle}>
        ${this.lightDismiss ? html`<div class="dismiss" aria-hidden="true" @pointerdown=${(event: PointerEvent) => event.preventDefault()}
          @click=${this.#onDismiss}></div>` : null}
        <div id="surface" class="surface" part="surface" tabindex="-1"
          role=${this.surfaceRole} aria-label=${this.accessibleLabel}
          @click=${this.#onClick} @keydown=${this.handleKeydown} @focusout=${this.#onFocusOut}>
          ${this.renderContent()}
        </div>
      </div>
    `;
  }
}

defineElement('metro-flyout', MetroFlyout);

declare global {
  interface HTMLElementTagNameMap { 'metro-flyout': MetroFlyout; }
}
