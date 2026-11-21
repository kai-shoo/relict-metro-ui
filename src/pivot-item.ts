import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export class MetroPivotItem extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = css`
    :host { display: block; min-width: 0; }
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

  protected override render() {
    return html`<slot></slot>`;
  }
}

defineElement('metro-pivot-item', MetroPivotItem);

declare global {
  interface HTMLElementTagNameMap {
    'metro-pivot-item': MetroPivotItem;
  }
}
