import { css, type PropertyDeclarations } from 'lit';
import { CollectionControl } from './collection-control.js';
import { defineElement } from './define.js';

export type { MetroCollectionItem, MetroItemActivateEvent, MetroSelectionChangeEvent, MetroSelectionMode } from './collection-control.js';

export class MetroGridView extends CollectionControl {
  static override properties: PropertyDeclarations = { columns: { type: Number } };

  static override styles = [...CollectionControl.styles, css`
    .collection { --_collection-gap: var(--metro-grid-gap, 8px); }
    .item { border: 2px solid transparent; background: var(--metro-grid-item-background, var(--_metro-chrome)); }
    .item[data-selected] { border-color: var(--metro-collection-selected, var(--_metro-accent)); }
    @media (forced-colors: active) { .item[data-selected] { border-color: Highlight; } }
  `];

  declare columns: number;

  constructor() {
    super();
    this.columns = 0;
  }

  protected override get layout() { return 'grid' as const; }
  protected override get columnCount() {
    if (Number.isFinite(this.columns) && this.columns >= 1) return Math.floor(this.columns);
    return Math.max(1, Math.floor((this.availableWidth + 8) / 152));
  }
}

defineElement('metro-grid-view', MetroGridView);

declare global {
  interface HTMLElementTagNameMap { 'metro-grid-view': MetroGridView; }
}
