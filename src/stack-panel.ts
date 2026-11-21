import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export type MetroStackOrientation = 'vertical' | 'horizontal';

export class MetroStackPanel extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
  };

  static override styles = css`
    :host { display: block; min-inline-size: 0; }
    :host([hidden]) { display: none; }
    .panel {
      display: flex;
      flex-direction: column;
      flex-wrap: var(--_metro-wrap, nowrap);
      align-items: var(--metro-stack-align, stretch);
      align-content: var(--metro-stack-align-content, normal);
      justify-content: var(--metro-stack-justify, normal);
      gap: var(--metro-layout-gap, .75rem);
      min-inline-size: 0;
    }
    :host([orientation="horizontal"]) .panel { flex-direction: row; }
  `;

  declare orientation: MetroStackOrientation;

  constructor() {
    super();
    this.orientation = 'vertical';
  }

  protected override render() { return html`<div class="panel" part="panel"><slot></slot></div>`; }
}

defineElement('metro-stack-panel', MetroStackPanel);

declare global {
  interface HTMLElementTagNameMap { 'metro-stack-panel': MetroStackPanel; }
}
