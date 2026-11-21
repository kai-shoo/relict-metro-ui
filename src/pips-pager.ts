import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { formatPositionLabel } from './position-label.js';
import { metroTheme } from './theme.js';

export type MetroPageChangeEvent = CustomEvent<{ page: number }>;

export class MetroPipsPager extends LitElement {
  static override properties = {
    count: { type: Number, reflect: true },
    page: { type: Number, reflect: true },
    maxVisible: { type: Number, attribute: 'max-visible', reflect: true },
    label: { type: String },
    positionLabel: { type: String, attribute: 'position-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: inline-block; max-inline-size: 100%; color: var(--_metro-fg); }
    nav { display: flex; align-items: center; flex-wrap: wrap; }

    button {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      inline-size: clamp(28px, calc(100% / var(--_item-count)), 1.75rem);
      flex: none;
      min-block-size: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
    }

    nav:focus-visible, button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    nav:focus { min-inline-size: 1.75rem; min-block-size: 1.75rem; }
    .pip {
      inline-size: .55rem;
      block-size: .55rem;
      box-sizing: border-box;
      border: 1px solid currentColor;
      border-radius: 50%;
    }
    [aria-current="page"] .pip { background: var(--_metro-accent); border-color: var(--_metro-accent); }
    button:active .pip { transform: scale(.8); }

    .overflow {
      inline-size: clamp(16px, calc(50% / var(--_item-count)), 1rem);
      color: var(--_metro-muted);
      font-size: min(1rem, 16px);
      text-align: center;
    }
    .status {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (forced-colors: active) {
      [aria-current="page"] .pip { forced-color-adjust: none; background: Highlight; border-color: Highlight; }
    }
  `];

  declare count: number;
  declare page: number;
  declare maxVisible: number;
  declare label: string;
  declare positionLabel: string;
  #restoreFocus?: { target: Element; bounds: DOMRect };

  constructor() {
    super();
    this.count = 0;
    this.page = 0;
    this.maxVisible = 7;
    this.label = '';
    this.positionLabel = '';
  }

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement;
    this.#restoreFocus = active ? { target: active, bounds: active.getBoundingClientRect() } : undefined;
    this.count = Number.isFinite(this.count) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(this.count))) : 0;
    this.maxVisible = Number.isFinite(this.maxVisible) ? Math.min(15, Math.max(3, Math.floor(this.maxVisible))) : 7;
    this.page = this.count ? Math.min(this.count, Math.max(1, Math.floor(this.page) || 1)) : 0;
  }

  protected override updated(): void {
    const previous = this.#restoreFocus;
    this.#restoreFocus = undefined;
    const target = this.#focusTarget;
    if (!previous || !target) return;
    const active = this.shadowRoot?.activeElement;
    if (!active && this.ownerDocument.activeElement !== this.ownerDocument.body) return;
    const bounds = target.getBoundingClientRect();
    if (active === target && previous.target === target && previous.bounds.top === bounds.top
      && previous.bounds.left === bounds.left) return;
    target.focus({ preventScroll: true });
    if (this.shadowRoot?.activeElement === target) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  get #focusTarget(): HTMLElement | null | undefined {
    return this.shadowRoot?.querySelector<HTMLElement>('[aria-current="page"]')
      ?? this.shadowRoot?.querySelector('nav');
  }

  override focus(options?: FocusOptions): void { this.#focusTarget?.focus(options); }

  #visible(): (number | 'earlier' | 'later')[] {
    if (this.count <= this.maxVisible) return Array.from({ length: this.count }, (_, index) => index + 1);

    const middle = this.maxVisible - 2;
    const start = Math.max(2, Math.min(this.count - middle, this.page - Math.floor((middle - 1) / 2)));
    const end = start + middle - 1;
    const visible: (number | 'earlier' | 'later')[] = [1];
    if (start > 2) visible.push('earlier');
    for (let index = start; index <= end; index++) visible.push(index);
    if (end < this.count - 1) visible.push('later');
    visible.push(this.count);
    return visible;
  }

  #select(page: number): void {
    if (!this.count) return;
    const next = Math.max(1, Math.min(this.count, page));
    if (next === this.page) return;
    this.page = next;
    this.dispatchEvent(new CustomEvent('metro-page-change', {
      detail: { page: next }, bubbles: true, composed: true,
    }) satisfies MetroPageChangeEvent);
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (!this.count || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const reverse = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = this.page - reverse; break;
      case 'ArrowRight': next = this.page + reverse; break;
      case 'Home': next = 1; break;
      case 'End': next = this.count; break;
      default: return;
    }
    event.preventDefault();
    this.#select(next);
  };

  protected override render() {
    const visible = this.#visible();
    const positionLabel = (page: number) =>
      formatPositionLabel(this.positionLabel || 'Page {current} of {total}', page, this.count);
    return html`
      <nav aria-label=${this.label || 'Pages'} part="navigation nav"
        style=${`--_item-count: ${Math.max(1, visible.length)}`}
        tabindex=${this.count ? nothing : -1} @keydown=${this.#onKeyDown}>
        ${repeat(visible, value => value, value => typeof value === 'number' ? html`
          <button type="button" part="button" aria-label=${positionLabel(value)}
            aria-current=${value === this.page ? 'page' : nothing} tabindex=${value === this.page ? 0 : -1}
            @click=${() => this.#select(value)}><span class="pip" part="pip" aria-hidden="true"></span></button>
        ` : html`<span class="overflow" part="overflow" aria-hidden="true">…</span>`)}
      </nav>
      <span class="status" aria-live="polite">${this.count ? positionLabel(this.page) : ''}</span>
    `;
  }
}

defineElement('metro-pips-pager', MetroPipsPager);

declare global {
  interface HTMLElementTagNameMap { 'metro-pips-pager': MetroPipsPager; }
  interface HTMLElementEventMap { 'metro-page-change': MetroPageChangeEvent; }
}
