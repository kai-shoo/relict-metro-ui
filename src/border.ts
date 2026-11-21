import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroBorder extends LitElement {
  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    :host([hidden]) { display: none; }
    .surface {
      box-sizing: border-box;
      padding: var(--metro-border-padding, var(--_metro-space));
      border: var(--metro-border-width, 1px) solid var(--metro-border-color, var(--_metro-border));
      border-radius: var(--metro-border-radius, 0);
      background: var(--metro-border-background, transparent);
      overflow-wrap: anywhere;
    }
  `];

  protected override render() { return html`<div class="surface" part="surface"><slot></slot></div>`; }
}

defineElement('metro-border', MetroBorder);

declare global {
  interface HTMLElementTagNameMap { 'metro-border': MetroBorder; }
}
