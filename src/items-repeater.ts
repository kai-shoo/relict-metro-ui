import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { RepeaterContent, type MetroItemRenderer } from './repeater-content.js';
import { metroTheme } from './theme.js';

export type { MetroItemRenderer } from './repeater-content.js';
export type MetroItemKey<T = unknown> = (item: T) => string;

function defaultKey(item: unknown): string {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item && typeof item === 'object' && 'value' in item && typeof item.value === 'string') return item.value;
  return '';
}

export class MetroItemsRepeater<T = unknown> extends LitElement {
  static override properties: PropertyDeclarations = {
    items: { attribute: false },
    keyFor: { attribute: false },
    renderItem: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .items { display: grid; gap: var(--metro-repeater-gap, 0); }
    .items > * { min-inline-size: 0; }
  `];

  declare items: readonly T[];
  declare keyFor: MetroItemKey<T> | null;
  declare renderItem: MetroItemRenderer<T> | null;

  #content = new RepeaterContent<T>();
  #elements: { key: string; element: HTMLElement }[] = [];
  #focus?: HTMLElement;
  #templates = new MutationObserver(() => this.requestUpdate());

  constructor() {
    super();
    this.items = [];
    this.keyFor = null;
    this.renderItem = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#templates.observe(this, { childList: true });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#templates.disconnect();
    super.disconnectedCallback();
  }

  getElement(key: string): HTMLElement | null { return this.#content.get(key); }

  protected override willUpdate(): void {
    let active = this.shadowRoot?.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    this.#focus = active instanceof HTMLElement ? active : undefined;
    const seen = new Set<string>();
    const template = this.querySelector<HTMLTemplateElement>(':scope > template') ?? undefined;
    this.#elements = (this.items ?? []).flatMap((item, index) => {
      const key = this.keyFor ? this.keyFor(item) : defaultKey(item);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{ key, element: this.#content.render(this.ownerDocument, key, item, index, template,
        this.renderItem ?? undefined, typeof item === 'object' ? key : String(item)) }];
    });
    this.#content.retain(seen);
  }

  protected override updated(): void {
    const focus = this.#focus;
    const root = this.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    if (focus?.isConnected && !this.matches(':focus-within') && (!active || active === this.ownerDocument.body)) {
      focus.focus({ preventScroll: true });
    }
    this.#focus = undefined;
  }

  protected override render() {
    return html`<div class="items" part="items">${repeat(this.#elements, entry => entry.key, entry => entry.element)}</div>
      ${this.#elements.length ? nothing : html`<slot name="empty"></slot>`}`;
  }
}

defineElement('metro-items-repeater', MetroItemsRepeater);

declare global {
  interface HTMLElementTagNameMap { 'metro-items-repeater': MetroItemsRepeater; }
}
