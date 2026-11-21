import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroSectionOpenEvent = CustomEvent<{
  value: string;
  href: string;
  invoker: HTMLAnchorElement;
}>;

export class MetroHubSection extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String },
    href: { type: String },
    hero: { type: Boolean, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; }

    section {
      padding-inline: var(--_metro-hub-section-inset, 1.1875rem) var(--metro-space, .75rem);
    }

    h2 {
      margin: 0;
      padding-block: var(--_metro-hub-section-header-top, .3125rem) var(--_metro-hub-section-header-gap, 1.96875rem);
      font-size: var(--_metro-hub-section-header-size, 1.1875rem);
      font-weight: var(--_metro-hub-section-header-weight, 600);
      letter-spacing: var(--_metro-hub-section-header-tracking, -.01em);
      line-height: 1.1;
      overflow-wrap: anywhere;
      transform: translateX(var(--_metro-hub-section-shift, 0px));
    }

    a { color: inherit; text-decoration: none; }
    a:hover { text-decoration: underline; }
    a:active { color: var(--_metro-accent); }

    ::slotted(:not([data-metro-no-swipe])) {
      touch-action: var(--_metro-hub-touch-action, auto);
    }

    [data-header-focus]:focus-visible {
      outline: 2px solid var(--_metro-focus);
      outline-offset: 2px;
    }

    .chevron {
      display: inline-block;
      margin-inline-start: .45em;
      inline-size: .35em;
      block-size: .35em;
      border: solid currentColor;
      border-width: 0 2px 2px 0;
      transform: translateY(-.13em) rotate(-45deg);
    }

    .chevron:dir(rtl) { transform: translateY(-.13em) rotate(135deg); }
    @media (prefers-reduced-motion: reduce) { h2 { transform: none; } }
  `];

  declare value: string;
  declare label: string;
  declare href: string;
  declare hero: boolean;
  #headerTabIndex = 0;
  #restoreHeaderFocus = false;

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.href = '';
    this.hero = false;
  }

  get headerElement(): HTMLElement | null {
    return this.shadowRoot?.querySelector('[data-header-focus]') ?? null;
  }

  /** @internal The containing Hub owns roving focus. */
  setHeaderTabIndex(index: 0 | -1): void {
    if (this.#headerTabIndex === index) return;
    this.#headerTabIndex = index;
    const header = this.headerElement;
    if (header) header.tabIndex = index;
  }

  protected override willUpdate(changes: PropertyValues<this>): void {
    const header = this.headerElement;
    this.#restoreHeaderFocus = header !== null && header === this.shadowRoot?.activeElement
      && changes.has('href') && Boolean(changes.get('href')) !== Boolean(this.href);
  }

  protected override updated(): void {
    if (!this.#restoreHeaderFocus) return;
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || active === this || active === this.ownerDocument.body) {
      this.headerElement?.focus({ preventScroll: true });
    }
  }

  #onOpen = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const accepted = this.dispatchEvent(new CustomEvent('metro-section-open', {
      bubbles: true, composed: true, cancelable: true,
      detail: { value: this.value, href: this.href, invoker: event.currentTarget as HTMLAnchorElement },
    }) satisfies MetroSectionOpenEvent);
    if (!accepted) event.preventDefault();
  };

  protected override render() {
    const label = this.label || this.value;
    return html`
      <section part="section" aria-labelledby="heading">
        ${this.href ? html`
          <h2 id="heading" part="heading">
            <a href=${this.href} data-header-focus tabindex=${this.#headerTabIndex}
              part="header-link" @click=${this.#onOpen}>${label}<span class="chevron" aria-hidden="true"></span></a>
          </h2>` : html`
          <h2 id="heading" part="heading" data-header-focus tabindex=${this.#headerTabIndex}>${label}</h2>
        `}
        <div part="body"><slot></slot></div>
      </section>
    `;
  }
}

defineElement('metro-hub-section', MetroHubSection);

declare global {
  interface HTMLElementTagNameMap { 'metro-hub-section': MetroHubSection; }
  interface HTMLElementEventMap { 'metro-section-open': MetroSectionOpenEvent; }
}
