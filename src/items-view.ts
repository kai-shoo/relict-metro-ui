import { css, type PropertyDeclarations } from 'lit';
import { CollectionControl, type MetroCollectionItem } from './collection-control.js';
import { defineElement } from './define.js';
import { RepeaterContent, type MetroItemRenderer } from './repeater-content.js';

export type { MetroCollectionItem, MetroItemActivateEvent, MetroSelectionChangeEvent, MetroSelectionMode } from './collection-control.js';
export type { MetroItemRenderer } from './repeater-content.js';
export type MetroItemsLayout = 'list' | 'grid';

export class MetroItemsView<T extends MetroCollectionItem = MetroCollectionItem> extends CollectionControl {
  static override properties: PropertyDeclarations = {
    itemLayout: { type: String, attribute: 'layout', reflect: true },
    columns: { type: Number },
    renderItem: { attribute: false },
  };

  static override styles = [...CollectionControl.styles, css`
    :host([layout="grid"]) .collection { --_collection-gap: var(--metro-grid-gap, 8px); }
    :host([layout="grid"]) .item {
      border: 2px solid transparent;
      background: var(--metro-grid-item-background, var(--_metro-chrome));
    }
    :host([layout="grid"]) .item[data-selected] { border-color: var(--metro-collection-selected, var(--_metro-accent)); }
  `];

  declare itemLayout: MetroItemsLayout;
  declare columns: number;
  declare items: readonly T[] | null;
  declare renderItem: MetroItemRenderer<T> | null;
  #content = new RepeaterContent<T>();
  #template?: HTMLTemplateElement;
  #focus?: { container: HTMLElement; target: HTMLElement };

  constructor() {
    super();
    this.itemLayout = 'list';
    this.columns = 0;
    this.renderItem = null;
  }

  protected override get layout(): MetroItemsLayout { return this.itemLayout === 'grid' ? 'grid' : 'list'; }
  protected override get adaptiveLayout() { return true; }
  protected override get columnCount() {
    if (this.layout === 'list') return 1;
    if (Number.isFinite(this.columns) && this.columns >= 1) return Math.floor(this.columns);
    return Math.max(1, Math.floor((this.availableWidth + 8) / 152));
  }

  getElement(key: string): HTMLElement | null { return this.#content.get(key); }

  protected override willUpdate(): void {
    let target = this.shadowRoot?.activeElement;
    const container = target?.closest<HTMLElement>('[part~="item-content"]');
    while (target?.shadowRoot?.activeElement) target = target.shadowRoot.activeElement;
    this.#focus = container && target instanceof HTMLElement ? { container, target } : undefined;
    this.#template = this.querySelector<HTMLTemplateElement>(':scope > template') ?? undefined;
    this.#content.retain(new Set(this.items?.map(item => item.value) ?? []));
    super.willUpdate();
  }

  protected override updated(): void {
    super.updated();
    const focus = this.#focus;
    this.#focus = undefined;
    const active = this.shadowRoot?.activeElement;
    if (focus?.target.isConnected && active?.contains(focus.container) && !focus.container.matches(':focus-within')) {
      focus.target.focus({ preventScroll: true });
    }
  }

  protected override renderDataItem(item: MetroCollectionItem, index: number) {
    return this.#content.render(this.ownerDocument, item.value, item as T, index, this.#template,
      this.renderItem ?? undefined, item.label || item.value);
  }
}

defineElement('metro-items-view', MetroItemsView);

declare global {
  interface HTMLElementTagNameMap { 'metro-items-view': MetroItemsView; }
}
