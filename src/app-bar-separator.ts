import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroAppBarSeparator extends LitElement {
  static override properties = { placement: { type: String, reflect: true } };
  static override styles = [metroTheme, css`
    :host { display: inline-flex; align-items: center; color: var(--_metro-border); }
    span { display: block; block-size: 1.5rem; border-inline-start: 1px solid currentColor; }
  `];

  declare placement: 'primary' | 'secondary';

  constructor() {
    super();
    this.placement = 'primary';
  }

  protected override render() { return html`<span part="line" role="separator" aria-orientation="vertical"></span>`; }
}

defineElement('metro-app-bar-separator', MetroAppBarSeparator);

declare global {
  interface HTMLElementTagNameMap { 'metro-app-bar-separator': MetroAppBarSeparator; }
}
