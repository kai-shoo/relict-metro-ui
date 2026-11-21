import { LitElement, css } from 'lit';
import type { MetroCollectionItem } from './collection-control.js';
import { defineElement } from './define.js';
import './list-item.js';
import type { MetroListItem } from './list-item.js';

export interface MetroListGroupData {
  readonly value: string;
  readonly label: string;
  readonly items: readonly MetroCollectionItem[];
}

export class MetroListGroup extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  static override styles = css`:host { display: none; }`;

  declare value: string;
  declare label: string;

  constructor() {
    super();
    this.value = '';
    this.label = '';
  }

  get items(): readonly MetroCollectionItem[] {
    return Array.from(this.children).filter((child): child is MetroListItem =>
      child.localName === 'metro-list-item' && !(child as HTMLElement).hidden,
    ).map(item => ({ value: item.value, label: item.label || item.textContent?.trim() || item.value, disabled: item.disabled }));
  }
}

defineElement('metro-list-group', MetroListGroup);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-group': MetroListGroup; }
}
