import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export class MetroListItem extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = css`
    :host { display: block; min-inline-size: 0; }
    :host([hidden]) { display: none; }
  `;

  declare value: string;
  declare label: string;
  declare disabled: boolean;

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.disabled = false;
  }

  protected override render() { return html`<slot>${this.label || this.value}</slot>`; }
}

defineElement('metro-list-item', MetroListItem);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-item': MetroListItem; }
}
