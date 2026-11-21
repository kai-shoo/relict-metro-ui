import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { anchorElement, anchorOffset, isRenderedAnchor, restoreCollectionAnchor, type CollectionAnchorTarget } from './collection-anchor.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroScrollAnnotation {
  readonly value: string;
  readonly label: string;
  readonly anchor?: string;
  readonly disabled?: boolean;
}
export type MetroAnnotationChangeEvent = CustomEvent<{ value: string; anchor: string }>;

export class MetroAnnotatedScrollBar extends LitElement {
  static override properties: PropertyDeclarations = {
    target: { attribute: false },
    htmlFor: { type: String, attribute: 'for', reflect: true },
    annotations: { attribute: false },
    label: { type: String },
    scrollLabel: { type: String, attribute: 'scroll-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: inline-block; max-inline-size: 100%; color: var(--_metro-fg); }
    .bar {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      align-items: stretch;
      gap: .25rem;
      block-size: var(--metro-annotation-height, 15rem);
      min-inline-size: 0;
    }
    .rail { position: relative; min-block-size: 0; }
    input {
      position: absolute;
      inset: 0;
      writing-mode: vertical-lr;
      direction: ltr;
      inline-size: 100%;
      block-size: 100%;
      margin: 0;
      accent-color: var(--metro-annotation-accent, var(--_metro-accent));
    }
    .ticks { position: absolute; inset: 0; pointer-events: none; }
    .tick {
      position: absolute;
      inset-block-start: var(--_position);
      inset-inline-end: 0;
      inline-size: .35rem;
      block-size: 2px;
      background: var(--_metro-muted);
    }
    ul { display: grid; align-content: start; min-block-size: 0; overflow: auto; list-style: none; margin: 0; padding: 0; }
    button {
      display: block;
      inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem .5rem;
      border: 0;
      border-inline-start: 2px solid transparent;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button:enabled:active { background: var(--_metro-chrome); }
    button[aria-current] { border-color: var(--metro-annotation-accent, var(--_metro-accent)); font-weight: 600; }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    :is(button, input):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    @media (forced-colors: active) {
      button[aria-current], :is(button, input):focus-visible { border-color: Highlight; outline-color: Highlight; }
    }
  `];

  declare target: HTMLElement | null;
  declare htmlFor: string;
  declare annotations: readonly MetroScrollAnnotation[];
  declare label: string;
  declare scrollLabel: string;

  #target?: CollectionAnchorTarget;
  #watch?: AbortController;
  #resize = new ResizeObserver(() => this.#measure());
  #mutations = new MutationObserver(() => { this.#observeSize(); this.#measure(); });
  #positions = new Map<string, number | null>();
  #scrollTop = 0;
  #max = 0;
  #requestedTop?: number;
  #roving = '';
  #value = '';
  #focusedMarker?: HTMLButtonElement;

  constructor() {
    super();
    this.target = null;
    this.htmlFor = '';
    this.annotations = [];
    this.label = 'Scroll annotations';
    this.scrollLabel = 'Scroll position';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#bind();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#unbind();
    super.disconnectedCallback();
  }

  get value() { return this.#value; }

  scrollToAnnotation(value: string): boolean {
    this.#bind();
    const target = this.#target;
    const entry = this.#entries().find(annotation => annotation.value === value && !annotation.disabled);
    if (!target || !entry || !restoreCollectionAnchor(target, entry.anchor ?? entry.value)) return false;
    this.#requestedTop = target.scrollTop;
    this.#setValue(entry.value);
    this.#measure(false);
    return true;
  }

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedMarker = active instanceof HTMLButtonElement ? active : undefined;
    this.#bind();
    this.#measure();
  }

  protected override updated(): void {
    const marker = this.#focusedMarker;
    this.#focusedMarker = undefined;
    if (!marker || (marker === this.shadowRoot?.activeElement && !marker.disabled)) return;
    const fallback = this.renderRoot.querySelector<HTMLButtonElement>('button[tabindex="0"]:enabled');
    if (fallback) this.#focusMarker(fallback);
    else this.renderRoot.querySelector<HTMLInputElement>('input:enabled')?.focus({ preventScroll: true });
  }

  #entries(): MetroScrollAnnotation[] {
    const seen = new Set<string>();
    return (this.annotations ?? []).filter(entry => {
      if (!entry.value || seen.has(entry.value)) return false;
      seen.add(entry.value);
      return true;
    });
  }

  #unbind() {
    this.#watch?.abort();
    this.#watch = undefined;
    this.#resize.disconnect();
    this.#mutations.disconnect();
    this.#target = undefined;
    this.#requestedTop = undefined;
  }

  #bind() {
    if (!this.isConnected) return;
    const root = this.getRootNode();
    const linked = this.htmlFor && (root instanceof Document || root instanceof ShadowRoot) ? root.getElementById(this.htmlFor) : null;
    const target = this.target ?? (linked instanceof HTMLElement ? linked : undefined);
    if (target === this.#target) return;
    this.#unbind();
    if (!target || target === this) return;
    this.#target = target;
    this.#watch = new AbortController();
    target.addEventListener('scroll', () => this.#measure(), { passive: true, signal: this.#watch.signal });
    this.#mutations.observe(target, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-metro-key', 'data-metro-group', 'id', 'hidden', 'style', 'class'] });
    this.#observeSize();
  }

  #observeSize() {
    const target = this.#target;
    if (!target) return;
    this.#resize.disconnect();
    this.#resize.observe(target);
    for (const child of target.children) this.#resize.observe(child);
  }

  #measure(updateValue = true) {
    const target = this.#target;
    const enabled = this.#entries().filter(entry => !entry.disabled);
    const top = target?.scrollTop ?? 0;
    const max = target ? Math.max(0, target.scrollHeight - target.clientHeight) : 0;
    const positions = new Map<string, number | null>();
    let visible: MetroScrollAnnotation | undefined;
    let closestPast = -Infinity;
    let closestFuture = Infinity;
    let future: MetroScrollAnnotation | undefined;
    if (target) for (const entry of enabled) {
      const anchor = anchorElement(target, entry.anchor ?? entry.value);
      if (!anchor) {
        // A collection can resolve an anchor whose row has not been rendered yet.
        if (!target.restoreAnchor) positions.set(entry.value, null);
        continue;
      }
      if (!isRenderedAnchor(anchor)) {
        positions.set(entry.value, null);
        continue;
      }
      const offset = anchorOffset(target, anchor);
      positions.set(entry.value, Math.max(0, Math.min(top + offset, max)));
      if (offset <= 1 && offset > closestPast) {
        closestPast = offset;
        visible = entry;
      } else if (offset > 1 && offset < closestFuture) {
        closestFuture = offset;
        future = entry;
      }
    }
    const changed = this.#scrollTop !== top || this.#max !== max || this.#positions.size !== positions.size
      || Array.from(positions).some(([key, position]) => this.#positions.get(key) !== position);
    this.#scrollTop = top;
    this.#max = max;
    this.#positions = positions;
    const available = enabled.filter(entry => positions.get(entry.value) !== null);
    const keepsRequestedValue = this.#requestedTop === top && available.some(entry => entry.value === this.#value);
    if (updateValue && !keepsRequestedValue) {
      this.#requestedTop = undefined;
      const anchor = target?.getAnchor?.();
      const current = (visible ?? future)?.value
        ?? available.find(entry => (entry.anchor ?? entry.value) === anchor?.key)?.value ?? '';
      this.#setValue(current);
    }
    if (changed) this.requestUpdate();
  }

  #onRange(event: Event): void {
    const control = event.currentTarget as HTMLInputElement;
    if (!this.#target) return;
    this.#requestedTop = undefined;
    this.#target.scrollTop = control.valueAsNumber;
    this.#measure();
  }

  #onRangeKey(event: KeyboardEvent): void {
    const target = this.#target;
    if (!target || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    let top = target.scrollTop;
    switch (event.key) {
      case 'ArrowUp': top -= 40; break;
      case 'ArrowDown': top += 40; break;
      case 'PageUp': top -= target.clientHeight; break;
      case 'PageDown': top += target.clientHeight; break;
      case 'Home': top = 0; break;
      case 'End': top = this.#max; break;
      default: return;
    }
    event.preventDefault();
    this.#requestedTop = undefined;
    target.scrollTop = top;
    this.#measure();
  }

  #onSelect(entry: MetroScrollAnnotation): void {
    if (!this.scrollToAnnotation(entry.value)) return;
    this.dispatchEvent(new CustomEvent('metro-annotation-change', {
      detail: { value: entry.value, anchor: entry.anchor ?? entry.value }, bubbles: true, composed: true,
    }) satisfies MetroAnnotationChangeEvent);
  }

  #setValue(value: string): void {
    if (value === this.#value) return;
    this.#value = value;
    this.requestUpdate();
  }

  #onKey(event: KeyboardEvent): void {
    if (!(event.target instanceof HTMLButtonElement) || event.defaultPrevented) return;
    const buttons = Array.from(this.shadowRoot?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const current = buttons.indexOf(event.target);
    let next: HTMLButtonElement | undefined;
    switch (event.key) {
      case 'ArrowUp': next = buttons[current - 1]; break;
      case 'ArrowDown': next = buttons[current + 1]; break;
      case 'Home': next = buttons[0]; break;
      case 'End': next = buttons.at(-1); break;
      default: return;
    }
    event.preventDefault();
    if (next) this.#focusMarker(next);
  }

  #focusMarker(button: HTMLButtonElement): void {
    button.focus({ preventScroll: true });
    const list = button.closest('ul');
    if (!list) return;
    const bounds = list.getBoundingClientRect();
    const marker = button.getBoundingClientRect();
    if (marker.top < bounds.top) list.scrollTop += marker.top - bounds.top;
    else if (marker.bottom > bounds.bottom) list.scrollTop += marker.bottom - bounds.bottom;
  }

  protected override render() {
    const entries = this.#entries();
    const canSelect = (entry: MetroScrollAnnotation) => this.#target && !entry.disabled && this.#positions.get(entry.value) !== null;
    const available = entries.filter(canSelect);
    const roving = available.find(entry => entry.value === this.#roving)?.value
      ?? available.find(entry => entry.value === this.value)?.value
      ?? available[0]?.value;
    return html`<nav class="bar" part="bar" aria-label=${this.label}>
      <div class="rail" part="rail">
        <input part="scrollbar" type="range" aria-orientation="vertical" aria-label=${this.scrollLabel}
          min="0" max=${this.#max} step="any" .value=${live(String(this.#scrollTop))}
          ?disabled=${!this.#target || !this.#max} @input=${this.#onRange} @keydown=${this.#onRangeKey}>
        <div class="ticks" aria-hidden="true">${this.#max ? Array.from(this.#positions.values(), position => position === null ? nothing :
          html`<span class="tick" part="tick" style="--_position: ${position / this.#max * 100}%"></span>`) : nothing}</div>
      </div>
      <ul part="annotations" @keydown=${this.#onKey}>
        ${repeat(entries, entry => entry.value, entry => html`<li>
          <button type="button" part="annotation" tabindex=${entry.value === roving ? '0' : '-1'}
            aria-current=${entry.value === this.value ? 'location' : nothing} ?disabled=${!canSelect(entry)}
            @focus=${() => { this.#roving = entry.value; this.requestUpdate(); }} @click=${() => this.#onSelect(entry)}>${entry.label}</button>
        </li>`)}
      </ul>
    </nav>`;
  }
}

defineElement('metro-annotated-scroll-bar', MetroAnnotatedScrollBar);

declare global {
  interface HTMLElementTagNameMap { 'metro-annotated-scroll-bar': MetroAnnotatedScrollBar; }
  interface HTMLElementEventMap { 'metro-annotation-change': MetroAnnotationChangeEvent; }
}
