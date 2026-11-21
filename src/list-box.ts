import { CollectionControl, type MetroSelectionMode } from './collection-control.js';
import { defineElement } from './define.js';

export type { MetroCollectionItem, MetroItemActivateEvent, MetroSelectionChangeEvent, MetroSelectionMode } from './collection-control.js';

export class MetroListBox extends CollectionControl {
  protected override get layout() { return 'listbox' as const; }
  protected override get defaultSelectionMode(): MetroSelectionMode { return 'single'; }
}

defineElement('metro-list-box', MetroListBox);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-box': MetroListBox; }
}
