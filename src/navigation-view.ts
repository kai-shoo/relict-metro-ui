import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroNavigationItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}

export type MetroNavigationEvent = CustomEvent<{ id: string; href: string }>;
export type MetroNavigationPlacement = 'side' | 'top';
export type MetroNavigationBackEvent = CustomEvent<void>;

export class MetroNavigationView extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String },
    placement: { type: String, reflect: true },
    menuLabel: { type: String, attribute: 'menu-label' },
    backLabel: { type: String, attribute: 'back-label' },
    showBack: { type: Boolean, attribute: 'show-back' },
    canGoBack: { type: Boolean, attribute: 'can-go-back' },
    open: { type: Boolean, reflect: true },
    items: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; container-type: inline-size; color: var(--_metro-fg); }
    :host([hidden]) { display: none; }

    .layout { --_metro-navigation-compact: 1; }
    .controls { display: flex; flex-wrap: wrap; gap: var(--_metro-space); }
    .controls > button {
      padding: .25rem .625rem;
      min-block-size: 2.75rem;
      border: 2px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .controls > button:disabled { color: var(--_metro-disabled); cursor: default; }
    .controls > [hidden] { display: none; }

    nav, .content { min-inline-size: 0; }
    nav { background: var(--_metro-chrome); }
    nav[data-closed]:not(:focus-within) { display: none; }

    ul { list-style: none; margin: 0; padding: 0; }
    li > * {
      display: block;
      box-sizing: border-box;
      min-block-size: 2.75rem;
      padding: .65rem var(--_metro-space);
      border-inline-start: 3px solid transparent;
      color: inherit;
      overflow-wrap: anywhere;
    }

    a { text-decoration: none; }
    a:hover { text-decoration: underline; text-underline-offset: .2em; }
    [aria-current="page"] { border-inline-start-color: var(--_metro-accent); font-weight: 600; }
    [aria-disabled="true"] { color: var(--_metro-disabled); }
    :is(a, button):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }

    @container (width < 40rem) {
      nav {
        max-block-size: max(3rem, min(24rem, 60dvh));
        overflow: auto;
        overscroll-behavior: contain;
      }
    }

    @container (min-width: 40rem) {
      .layout {
        --_metro-navigation-compact: 0;
        display: grid;
        grid-template-columns: var(--metro-navigation-width, minmax(10rem, 14rem)) minmax(0, 1fr);
        gap: var(--_metro-space);
      }

      .layout[data-placement="top"] { grid-template-columns: minmax(0, 1fr); }
      [data-placement="top"] ul { display: flex; flex-wrap: wrap; }
      [data-placement="top"] li { min-inline-size: 0; max-inline-size: 100%; }
      [data-placement="top"] li > * { border-inline-start: 0; border-block-end: 3px solid transparent; }
      [data-placement="top"] [aria-current="page"] { border-block-end-color: var(--_metro-accent); }
      nav[data-closed]:not(:focus-within) { display: block; }
      .toggle:not(:focus) { display: none; }
    }

    @media (forced-colors: active) {
      [aria-current="page"], [data-placement="top"] [aria-current="page"] { border-color: Highlight; }
    }
  `];

  declare value: string;
  declare label: string;
  declare placement: MetroNavigationPlacement;
  declare menuLabel: string;
  declare backLabel: string;
  declare showBack: boolean;
  declare canGoBack: boolean;
  declare open: boolean;
  declare items: readonly MetroNavigationItem[];

  #layout = new ResizeObserver(() => this.#syncLayout());
  #focusFrame = 0;
  #recoverLinkFocus = false;

  constructor() {
    super();
    this.value = '';
    this.label = 'Navigation';
    this.placement = 'side';
    this.menuLabel = 'Menu';
    this.backLabel = 'Back';
    this.showBack = false;
    this.canGoBack = false;
    this.open = false;
    this.items = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#layout.observe(this);
  }

  override disconnectedCallback(): void {
    this.#layout.disconnect();
    this.ownerDocument.defaultView?.cancelAnimationFrame(this.#focusFrame);
    this.#focusFrame = 0;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    const linkId = active?.getAttribute('data-link-id');
    this.#recoverLinkFocus = changed.has('items') && linkId != null
      && !this.items.some(item => item.id === linkId && !item.disabled);
    if (changed.has('open') && !this.open && this.shadowRoot?.querySelector('nav:focus-within')) {
      this.#visibleToggle()?.focus({ preventScroll: true });
    }
    if ((changed.has('showBack') || changed.has('canGoBack')) && (!this.showBack || !this.canGoBack) &&
      this.shadowRoot?.activeElement?.classList.contains('back')) this.#focusNavigation();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.#recoverLinkFocus && !this.shadowRoot?.activeElement) this.#focusNavigation(true);
    if (this.open && (changed.has('open') || changed.has('value'))) {
      const active = this.shadowRoot?.activeElement;
      this.#revealCompactLink(active?.matches('nav a') ? active : this.shadowRoot?.querySelector('nav a[aria-current="page"]'));
    }
  }

  #isCompact(): boolean {
    const layout = this.shadowRoot?.querySelector('.layout');
    return !!layout && getComputedStyle(layout).getPropertyValue('--_metro-navigation-compact').trim() === '1';
  }

  #visibleToggle(): HTMLButtonElement | undefined {
    if (!this.#isCompact()) return undefined;
    return this.shadowRoot?.querySelector<HTMLButtonElement>('.toggle') ?? undefined;
  }

  #focusNavigation(preferLink = false): void {
    const root = this.shadowRoot;
    const link = root?.querySelector<HTMLAnchorElement>('nav a[aria-current="page"]') ??
      root?.querySelector<HTMLAnchorElement>('nav a');
    const toggle = this.#visibleToggle();
    const target = (preferLink && this.open ? link ?? toggle : toggle ?? link) ?? root?.querySelector<HTMLElement>('.content');
    target?.focus({ preventScroll: target !== link || this.#isCompact() });
    if (target === link) this.#revealCompactLink(link);
  }

  #revealCompactLink(link: Element | null | undefined): void {
    const nav = link?.closest('nav');
    if (!link || !nav || !this.#isCompact()) return;
    const bounds = nav.getBoundingClientRect();
    const row = link.getBoundingClientRect();
    const top = bounds.top + nav.clientTop;
    const bottom = top + nav.clientHeight;
    const delta = row.top < top || row.height > nav.clientHeight ? row.top - top : Math.max(0, row.bottom - bottom);
    if (Math.abs(delta) > .5) nav.scrollBy({ top: delta, behavior: 'instant' });
  }

  #syncLayout(): void {
    const active = this.shadowRoot?.activeElement;
    if (this.#isCompact()) {
      if (active?.closest('nav')) {
        this.open = true;
        this.#revealCompactLink(active);
      }
    } else if (active?.classList.contains('toggle')) {
      this.#focusNavigation();
    }
  }

  #syncFocusedLayout = (): void => {
    this.#syncLayout();
    // Resizing out and back in the same frame can leave the observed box unchanged.
    if (this.#focusFrame) return;
    this.#focusFrame = this.ownerDocument.defaultView?.requestAnimationFrame(() => {
      this.#focusFrame = 0;
      this.#syncLayout();
    }) ?? 0;
  };

  closeMenu(): boolean {
    const toggle = this.#visibleToggle();
    if (!this.open || !toggle) return false;
    this.open = false;
    toggle.focus({ preventScroll: true });
    return true;
  }

  #handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.closeMenu()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  #follow(event: MouseEvent, item: MetroNavigationItem): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.altKey || event.shiftKey) return;
    const active = () => this.shadowRoot?.activeElement ?? (this.getRootNode() as Document | ShadowRoot).activeElement;
    const previous = active();
    if (!this.dispatchEvent(new CustomEvent('metro-navigation', {
      detail: { id: item.id, href: item.href }, bubbles: true, composed: true, cancelable: true,
    }) satisfies MetroNavigationEvent)) event.preventDefault();
    const current = active();
    if (this.open && this.#isCompact() && current && current !== previous && !this.shadowRoot?.querySelector('nav:focus-within')) {
      this.open = false;
    } else {
      this.closeMenu();
    }
  }

  #requestBack = (): void => {
    if (!this.showBack || !this.canGoBack) return;
    this.dispatchEvent(new CustomEvent('metro-navigation-back', {
      bubbles: true, composed: true,
    }) satisfies MetroNavigationBackEvent);
  };

  protected override render() {
    return html`
      <div class="controls" @keydown=${this.#handleEscape} @focusin=${this.#syncFocusedLayout}>
        <button type="button" class="back" part="back" ?hidden=${!this.showBack} ?disabled=${!this.canGoBack}
          @click=${this.#requestBack}>${this.backLabel || 'Back'}</button>
        <button type="button" class="toggle" part="toggle" aria-controls="nav" aria-expanded=${this.open}
          @click=${() => { this.open = !this.open; }}>${this.menuLabel || 'Menu'}</button>
      </div>
      <div class="layout" data-placement=${this.placement === 'top' ? 'top' : 'side'} @keydown=${this.#handleEscape}>
        <nav id="nav" part="nav" aria-label=${this.label || 'Navigation'} ?data-closed=${!this.open}
          @focusin=${this.#syncFocusedLayout}>
          <ul role="list" part="list">
            ${repeat(this.items, item => item.id, item => html`
              <li part="item">
                ${item.disabled
                  ? html`<span aria-disabled="true">${item.label}</span>`
                  : html`<a part="link" data-link-id=${item.id} href=${item.href} aria-current=${this.value === item.id ? 'page' : nothing}
                      @click=${(event: MouseEvent) => this.#follow(event, item)}>${item.label}</a>`}
              </li>
            `)}
          </ul>
        </nav>
        <div class="content" part="content" tabindex="-1"><slot></slot></div>
      </div>
    `;
  }
}

defineElement('metro-navigation-view', MetroNavigationView);

declare global {
  interface HTMLElementTagNameMap { 'metro-navigation-view': MetroNavigationView; }
  interface HTMLElementEventMap {
    'metro-navigation': MetroNavigationEvent;
    'metro-navigation-back': MetroNavigationBackEvent;
  }
}
