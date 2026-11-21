import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { observeAnchorScroll } from './anchored-scroll.js';
import { metroTheme } from './theme.js';

let nextDescription = 0;

export class MetroTooltip extends LitElement {
  static override properties = { text: { type: String } };

  static override styles = [metroTheme, css`
    :host { display: inline-flex; vertical-align: middle; }
    .trigger { display: inline-flex; }

    .tooltip {
      position: fixed;
      inset: auto;
      box-sizing: border-box;
      inline-size: max-content;
      max-inline-size: min(20rem, calc(100vw - 1rem));
      margin: 0;
      padding: .375rem .625rem;
      border: 1px solid var(--_metro-border);
      border-radius: 0;
      background: var(--metro-tooltip-bg, var(--_metro-chrome));
      color: var(--metro-tooltip-fg, var(--_metro-fg));
      font: normal .875rem / 1.35 var(--_metro-font);
      overflow-wrap: anywhere;
    }
  `];

  declare text: string;

  #trigger: HTMLElement | null = null;
  #description: HTMLSpanElement | null = null;
  #watch: AbortController | null = null;
  #resize: ResizeObserver | null = null;
  #timer: number | undefined;
  #hovering = false;
  #overTooltip = false;
  #focused = false;
  #dismissed = false;

  constructor() {
    super();
    this.text = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#hide();
    this.#detachDescription();
    this.#hovering = false;
    this.#focused = false;
    this.#dismissed = false;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.#syncTrigger();
    if (!this.text) this.#hide();
    else if (this.#watch) this.#position();
    else this.#schedule();
  }

  get #surface(): HTMLElement | null | undefined {
    return this.shadowRoot?.querySelector('.tooltip');
  }

  #detachDescription(): void {
    const trigger = this.#trigger;
    const description = this.#description;
    if (trigger && description) {
      const remaining = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/)
        .filter(reference => reference && reference !== description.id);
      if (remaining.length) trigger.setAttribute('aria-describedby', remaining.join(' '));
      else trigger.removeAttribute('aria-describedby');
    }
    description?.remove();
    this.#description = null;
    this.#trigger = null;
  }

  #syncTrigger(): void {
    if (!this.isConnected) return;
    const slot = this.shadowRoot?.querySelector('slot');
    const assigned = slot?.assignedElements()[0];
    const trigger = assigned instanceof HTMLElement ? assigned : null;
    if (this.#trigger && this.#trigger !== trigger) {
      this.#hide();
      this.#hovering = false;
      this.#dismissed = false;
    }
    if (this.#trigger !== trigger || !this.text) this.#detachDescription();
    if (!trigger || !this.text) return;

    if (!this.#description) {
      // ID references must be in the same tree as the slotted control.
      const root = this.getRootNode() as Document | ShadowRoot;
      const description = this.ownerDocument.createElement('span');
      do {
        description.id = `metro-tooltip-${++nextDescription}`;
      } while (root.getElementById(description.id));
      description.hidden = true;
      description.slot = 'description';
      this.#description = description;
      this.#trigger = trigger;
      this.#focused = trigger.matches(':focus-within');
      const current = trigger.getAttribute('aria-describedby')?.trim();
      trigger.setAttribute('aria-describedby', current ? `${current} ${description.id}` : description.id);
    }

    this.#description.textContent = this.text;
    if (this.#description.parentNode !== this) this.append(this.#description);
  }

  #cancelTimer(): void {
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #schedule(): void {
    this.#cancelTimer();
    if (!this.text || !this.#trigger || this.#dismissed) return;
    if (this.#focused) {
      this.#show();
    } else if (this.#hovering || this.#overTooltip) {
      if (!this.#watch) this.#timer = this.ownerDocument.defaultView?.setTimeout(() => this.#show(), 250);
    } else if (this.#watch) {
      this.#timer = this.ownerDocument.defaultView?.setTimeout(() => this.#hide(), 150);
    }
  }

  #show(): void {
    const surface = this.#surface;
    const view = this.ownerDocument.defaultView;
    if (!surface || !view || !this.#trigger || this.#watch || !this.isConnected) return;
    surface.showPopover();
    this.#position();
    this.#watch = new AbortController();
    const options = { signal: this.#watch.signal };
    view.addEventListener('resize', this.#position, options);
    observeAnchorScroll(this.#trigger, this.#position, options.signal);
    this.ownerDocument.addEventListener('keydown', this.#onEscape, { ...options, capture: true });
    this.#resize = new ResizeObserver(this.#position);
    this.#resize.observe(this.#trigger, { box: 'border-box' });
    this.#resize.observe(surface, { box: 'border-box' });
  }

  #hide(): void {
    this.#cancelTimer();
    this.#watch?.abort();
    this.#watch = null;
    this.#resize?.disconnect();
    this.#resize = null;
    this.#overTooltip = false;
    const surface = this.#surface;
    if (surface?.matches(':popover-open')) surface.hidePopover();
  }

  #position = () => {
    const surface = this.#surface;
    const trigger = this.#trigger;
    if (!surface || !trigger) return;
    const { width, height } = surface.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    const viewport = this.ownerDocument.documentElement;
    const edge = 8;
    const left = rect.left + (rect.width - width) / 2;
    const below = rect.bottom + 4;
    const above = rect.top - height - 4;
    const top = below + height > viewport.clientHeight - edge && above >= edge ? above : below;
    surface.style.left = `${Math.max(edge, Math.min(left, viewport.clientWidth - width - edge))}px`;
    surface.style.top = `${Math.max(edge, Math.min(top, viewport.clientHeight - height - edge))}px`;
  };

  #onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    this.#hovering = true;
    this.#dismissed = false;
    this.#schedule();
  };

  #onPointerLeave = () => {
    this.#hovering = false;
    this.#schedule();
  };

  #onFocusIn = () => {
    this.#focused = true;
    this.#dismissed = false;
    this.#schedule();
  };

  #onFocusOut = () => {
    this.#focused = false;
    this.#schedule();
  };

  #dismiss = () => {
    this.#dismissed = true;
    this.#hide();
  };

  #onEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    this.#dismiss();
    if (this.#trigger && event.composedPath().includes(this.#trigger)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  protected override render() {
    return html`
      <span class="trigger" @pointerenter=${this.#onPointerEnter} @pointerleave=${this.#onPointerLeave}
        @focusin=${this.#onFocusIn} @focusout=${this.#onFocusOut} @click=${this.#dismiss}>
        <slot @slotchange=${() => { this.#syncTrigger(); this.#schedule(); }}></slot>
      </span>
      <span class="tooltip" part="surface" role="tooltip" popover="manual"
        @pointerenter=${() => { this.#overTooltip = true; this.#schedule(); }}
        @pointerleave=${() => { this.#overTooltip = false; this.#schedule(); }}>${this.text}</span>
    `;
  }
}

defineElement('metro-tooltip', MetroTooltip);

declare global {
  interface HTMLElementTagNameMap { 'metro-tooltip': MetroTooltip; }
}
