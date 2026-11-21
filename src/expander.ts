import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroToggleEvent = CustomEvent<{ open: boolean }>;

export class MetroExpander extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true, noAccessor: true },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }

    summary {
      display: grid;
      min-block-size: 2.75rem;
      grid-template-columns: 2.5625rem minmax(0, 1fr);
      align-items: center;
      list-style: none;
      cursor: pointer;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }

    summary::-webkit-details-marker { display: none; }
    summary:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    summary:active { color: var(--_metro-muted); }

    .chevron {
      justify-self: center;
      inline-size: .55rem;
      block-size: .55rem;
      border: solid currentColor;
      border-width: 0 2px 2px 0;
      transform: translateY(-20%) rotate(45deg);
    }

    [open] .chevron { transform: translateY(20%) rotate(225deg); }

    .content {
      margin-inline-start: 1.1875rem;
      padding-inline-start: 1.1875rem;
      border-inline-start: 3px solid var(--_metro-border);
    }
  `];

  declare label: string;
  #open = false;
  #contentFocus?: Element;
  #contentObserver = new MutationObserver(() => {
    if (!this.#contentFocus || this.contains(this.#contentFocus)) return;
    this.#clearContentFocus();
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement ?? this.ownerDocument.activeElement;
    if (this.isConnected && active === this.ownerDocument.body) {
      this.shadowRoot?.querySelector('summary')?.focus({ preventScroll: true });
    }
  });

  constructor() {
    super();
    this.label = 'Details';
  }

  override disconnectedCallback(): void {
    this.#clearContentFocus();
    super.disconnectedCallback();
  }

  #clearContentFocus(): void {
    this.#contentFocus = undefined;
    this.#contentObserver.disconnect();
  }

  #onContentFocusIn = (event: FocusEvent) => {
    if (!(event.target instanceof Element) || !this.contains(event.target)) return;
    this.#contentFocus = event.target;
    this.#contentObserver.observe(this, { childList: true, subtree: true });
  };

  #onContentFocusOut = (event: FocusEvent) => {
    const previous = this.#contentFocus;
    if (event.relatedTarget) {
      this.#clearContentFocus();
    } else if (previous) {
      // A removal can dispatch focusout before the node has been detached.
      queueMicrotask(() => {
        if (this.#contentFocus === previous && this.contains(previous)) this.#clearContentFocus();
      });
    }
  };

  get open(): boolean { return this.#open; }
  set open(value: boolean) {
    const previous = this.#open;
    this.#open = value;
    const details = this.shadowRoot?.querySelector('details');
    if (previous !== value) this.requestUpdate('open', previous);
    else if (details && details.open !== value) this.requestUpdate('open', details.open);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    if (!this.open && this.shadowRoot?.querySelector('.content')?.matches(':focus-within')) {
      this.shadowRoot?.querySelector('summary')?.focus({ preventScroll: true });
    }
    const details = this.shadowRoot?.querySelector('details');
    if (details && details.open !== this.open) details.open = this.open;
  }

  #onToggle = (event: Event) => {
    const next = (event.currentTarget as HTMLDetailsElement).open;
    if (next === this.open) return;
    this.open = next;
    this.dispatchEvent(new CustomEvent('metro-toggle', {
      detail: { open: next }, bubbles: true, composed: true,
    }) satisfies MetroToggleEvent);
  };

  protected override render() {
    return html`
      <details ?open=${this.open} @toggle=${this.#onToggle}>
        <summary part="header">
          <span aria-hidden="true" class="chevron" part="chevron"></span>
          <span><slot name="label">${this.label}</slot></span>
        </summary>
        <div class="content" part="content" @focusin=${this.#onContentFocusIn} @focusout=${this.#onContentFocusOut}><slot></slot></div>
      </details>
    `;
  }
}

defineElement('metro-expander', MetroExpander);

declare global {
  interface HTMLElementTagNameMap { 'metro-expander': MetroExpander; }
  interface HTMLElementEventMap { 'metro-toggle': MetroToggleEvent; }
}
