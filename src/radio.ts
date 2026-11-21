import { LitElement, css } from 'lit';
import { defineElement } from './define.js';

/** Declarative option consumed by its parent metro-radio-group. */
export class MetroRadio extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = css`:host { display: none; }`;

  declare value: string;
  declare label: string;
  declare disabled: boolean;

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.disabled = false;
  }
}

defineElement('metro-radio', MetroRadio);

declare global {
  interface HTMLElementTagNameMap {
    'metro-radio': MetroRadio;
  }
}
