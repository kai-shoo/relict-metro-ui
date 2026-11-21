import { CollectionControl } from './collection-control.js';
import { defineElement } from './define.js';

export type { MetroCollectionItem, MetroItemActivateEvent, MetroSelectionChangeEvent, MetroSelectionMode } from './collection-control.js';

export class MetroListView extends CollectionControl {
  protected override get layout() { return 'list' as const; }
}

defineElement('metro-list-view', MetroListView);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-view': MetroListView; }
}
