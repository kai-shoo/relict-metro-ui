import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroLabel extends LitElement {
  static override styles = [metroTheme, css`
    :host { display: inline-block; color: var(--metro-label-color, var(--_metro-muted)); font-size: var(--metro-label-size, 1.25rem); }
    ::slotted(label) { display: inline-block; overflow-wrap: anywhere; }
  `];

  protected override render() { return html`<slot></slot>`; }
}

defineElement('metro-label', MetroLabel);

declare global {
  interface HTMLElementTagNameMap { 'metro-label': MetroLabel; }
}
