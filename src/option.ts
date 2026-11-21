import { LitElement, css } from 'lit';
import { defineElement } from './define.js';

/** A declarative choice rendered by its owning picker. */
export class MetroOption extends LitElement {
  static override properties = {
    value: { attribute: false, noAccessor: true },
    label: { attribute: false, noAccessor: true },
    disabled: { attribute: false, noAccessor: true },
  };

  static override styles = css`:host { display: none; }`;

  get value() { return this.getAttribute('value') ?? ''; }
  set value(value: string) { this.setAttribute('value', value); }

  get label() { return this.getAttribute('label') ?? ''; }
  set label(value: string) { this.setAttribute('label', value); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
}

defineElement('metro-option', MetroOption);

declare global {
  interface HTMLElementTagNameMap {
    'metro-option': MetroOption;
  }
}
