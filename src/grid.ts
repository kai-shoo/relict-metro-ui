import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export class MetroGrid extends LitElement {
  static override properties = {
    columns: { type: String },
    rows: { type: String },
  };

  static override styles = css`
    :host { display: block; min-inline-size: 0; }
    :host([hidden]) { display: none; }
    .grid {
      display: grid;
      grid-template-columns: var(--metro-grid-columns, var(--_columns, minmax(0, 1fr)));
      grid-template-rows: var(--metro-grid-rows, var(--_rows, auto));
      gap: var(--metro-layout-gap, .75rem);
    }
    ::slotted(*) {
      min-inline-size: 0;
      overflow-wrap: anywhere;
      grid-column: var(--metro-grid-column, auto);
      grid-row: var(--metro-grid-row, auto);
    }
  `;

  declare columns: string;
  declare rows: string;

  constructor() {
    super();
    this.columns = '';
    this.rows = '';
  }

  #tracks(value: string, property: string, fallback: string): string {
    const input = typeof value === 'string' ? value.trim() : '';
    const count = Number(input);
    if (/^\d+$/.test(input) && count > 0) return `repeat(${Math.min(count, 100)}, minmax(0, 1fr))`;
    return input && CSS.supports(property, input) && !/[;{}]/.test(input) ? input : fallback;
  }

  protected override render() {
    const columns = this.#tracks(this.columns, 'grid-template-columns', 'minmax(0, 1fr)');
    const rows = this.#tracks(this.rows, 'grid-template-rows', 'auto');
    return html`<div class="grid" part="grid" style=${`--_columns: ${columns}; --_rows: ${rows}`}><slot></slot></div>`;
  }
}

defineElement('metro-grid', MetroGrid);

declare global {
  interface HTMLElementTagNameMap { 'metro-grid': MetroGrid; }
}
