import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroDetailsChangeDetail {
  previousValue: string;
  value: string;
  reason: 'open' | 'back';
}

type Pane = 'list' | 'details';

export class MetroListDetails extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    listLabel: { type: String, attribute: 'list-label' },
    detailsLabel: { type: String, attribute: 'details-label' },
    backLabel: { type: String, attribute: 'back-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; container-type: inline-size; min-inline-size: 0; }
    .layout {
      --_pane-layout: compact;
      color: var(--_metro-fg);
      background: var(--_metro-bg);
    }
    .pane { min-inline-size: 0; min-block-size: 0; }
    .layout[data-open] .list, .layout:not([data-open]) .details { display: none; }
    .detail-body[hidden], .placeholder[hidden] { display: none; }
    .back {
      min-block-size: 2.75rem;
      padding-inline: var(--_metro-space);
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .back:hover { text-decoration: underline; }
    :is(.pane, .back):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    @container (min-width: 40rem) {
      .layout {
        --_pane-layout: wide;
        display: grid;
        grid-template-columns: var(--metro-list-details-width, minmax(12rem, 2fr)) minmax(0, 3fr);
      }
      .layout[data-open] .list, .layout:not([data-open]) .details { display: block; }
      .list { border-inline-end: 1px solid var(--_metro-border); }
      .back { display: none; }
    }
  `];

  declare value: string;
  declare listLabel: string;
  declare detailsLabel: string;
  declare backLabel: string;

  #focusSide?: Pane;
  #backFocused = false;
  #pending?: Pane;
  #source?: HTMLElement;
  #sourceKey?: string;
  #changing = false;
  #layoutWatcher = new ResizeObserver(() => this.#settleFocus());

  constructor() {
    super();
    this.value = '';
    this.listLabel = 'List';
    this.detailsLabel = 'Details';
    this.backLabel = 'Back';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#layoutWatcher.observe(this);
  }

  override disconnectedCallback(): void {
    this.#layoutWatcher.disconnect();
    this.#focusSide = undefined;
    this.#backFocused = false;
    this.#pending = undefined;
    super.disconnectedCallback();
  }

  showDetails(value: string, source?: HTMLElement): boolean {
    if (!value || value === this.value || this.#changing) return false;
    const focused = source ?? (this.#focusSide === 'list' ? this.#activeElement() : null);
    const trigger = focused instanceof HTMLElement && this.#inList(focused) ? focused : undefined;
    const key = trigger?.closest<HTMLElement>('[data-metro-focus]')?.dataset.metroFocus;
    if (!this.#allowChange(value, 'open')) return false;
    this.#source = trigger;
    this.#sourceKey = key;
    this.#commitChange(value, 'open', this.#isCompact() ? 'details' : undefined);
    return true;
  }

  back(): boolean {
    if (!this.value || this.#changing || !this.#allowChange('', 'back')) return false;
    this.#commitChange('', 'back', 'list');
    return true;
  }

  #allowChange(value: string, reason: MetroDetailsChangeDetail['reason']): boolean {
    this.#changing = true;
    const allowed = this.dispatchEvent(new CustomEvent('metro-before-details-change', {
      detail: { previousValue: this.value, value, reason },
      bubbles: true, composed: true, cancelable: true,
    }));
    this.#changing = false;
    return allowed;
  }

  #commitChange(value: string, reason: MetroDetailsChangeDetail['reason'], focus?: Pane) {
    const previousValue = this.value;
    this.value = value;
    this.#pending = focus;
    this.dispatchEvent(new CustomEvent('metro-details-change', {
      detail: { previousValue, value, reason }, bubbles: true, composed: true,
    }));
  }

  #isCompact() {
    const layout = this.shadowRoot?.querySelector('.layout');
    return !layout || getComputedStyle(layout).getPropertyValue('--_pane-layout').trim() === 'compact';
  }

  #activeElement() { return (this.getRootNode() as Document | ShadowRoot).activeElement; }

  #owns(target: Node | null): boolean {
    for (let current = target; current; current = (current.getRootNode() as ShadowRoot).host) {
      if (this.contains(current) || this.shadowRoot?.contains(current)) return true;
    }
    return false;
  }

  #inList(target: HTMLElement): boolean {
    for (let current: Element | null = target; current && current !== this;) {
      if (current.parentElement === this) return current.getAttribute('slot') === 'list';
      current = current.parentElement ?? (current.getRootNode() as ShadowRoot).host ?? null;
    }
    return false;
  }

  *#listItems(key: string): Iterable<HTMLElement> {
    for (const child of this.children) {
      if (!(child instanceof HTMLElement) || child.slot !== 'list') continue;
      if (child.dataset.metroFocus === key) yield child;
      for (const item of child.querySelectorAll<HTMLElement>('[data-metro-focus]')) {
        if (item.dataset.metroFocus === key) yield item;
      }
    }
  }

  #restoreListFocus(): boolean {
    const source = this.#source;
    const key = this.#sourceKey;
    if (source && this.#inList(source) && this.#tryFocus(source)) return true;
    if (key) {
      for (const item of this.#listItems(key)) {
        if (item !== source && this.#tryFocus(item)) return true;
      }
    }
    return false;
  }

  #tryFocus(target: HTMLElement): boolean {
    if (!target.getClientRects().length) return false;
    target.focus({ preventScroll: true });
    return target.matches(':focus-within');
  }

  #settleFocus() {
    const compact = this.#isCompact();
    const visible = this.value ? 'details' : 'list';
    const active = this.#activeElement();
    const owner = this.#owns(active) || active === this.ownerDocument.body || !active;
    const hiddenSide = (compact && this.#focusSide && this.#focusSide !== visible)
      || (!this.value && this.#focusSide === 'details');
    const backHidden = !compact && this.#backFocused && active === this.ownerDocument.body;
    const destination = this.#pending ?? (owner && hiddenSide ? visible : backHidden ? 'details' : undefined);
    this.#pending = undefined;
    if (!destination) return;
    if (destination === 'list' && this.#restoreListFocus()) return;
    this.shadowRoot?.querySelector<HTMLElement>(`.${destination}`)?.focus({ preventScroll: true });
  }

  #onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && !this.#owns(next)) {
      this.#focusSide = undefined;
      this.#backFocused = false;
    }
  };

  #onDetailsFocus = (event: FocusEvent) => {
    this.#focusSide = 'details';
    this.#backFocused = event.target === this.shadowRoot?.querySelector('.back');
  };

  #onDetailsKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.key !== 'Escape' || !this.#isCompact()) return;
    const inModal = event.composedPath().some(target => target instanceof HTMLDialogElement && target.matches(':modal'));
    if (inModal || !this.back()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  protected override updated(changes: PropertyValues<this>): void {
    if (changes.has('value')) this.#settleFocus();
  }

  protected override render() {
    return html`
      <div class="layout" ?data-open=${Boolean(this.value)} @focusout=${this.#onFocusOut}>
        <section class="pane list" part="list" tabindex="-1" aria-label=${this.listLabel || 'List'}
          @focusin=${() => { this.#focusSide = 'list'; this.#backFocused = false; }}>
          <slot name="list"></slot>
        </section>
        <section class="pane details" part="details" tabindex="-1" aria-label=${this.detailsLabel || 'Details'}
          @focusin=${this.#onDetailsFocus} @keydown=${this.#onDetailsKey}>
          <div class="detail-body" ?hidden=${!this.value}>
            <button type="button" class="back" part="back" @click=${() => this.back()}>${this.backLabel || 'Back'}</button>
            <slot name="details"></slot>
          </div>
          <div class="placeholder" ?hidden=${Boolean(this.value)}><slot name="empty"></slot></div>
        </section>
      </div>
    `;
  }
}

defineElement('metro-list-details', MetroListDetails);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-details': MetroListDetails; }
  interface HTMLElementEventMap {
    'metro-before-details-change': CustomEvent<MetroDetailsChangeDetail>;
    'metro-details-change': CustomEvent<MetroDetailsChangeDetail>;
  }
}
