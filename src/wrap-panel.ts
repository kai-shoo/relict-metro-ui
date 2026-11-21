import { css } from 'lit';
import { defineElement } from './define.js';
import { MetroStackPanel } from './stack-panel.js';

export class MetroWrapPanel extends MetroStackPanel {
  static override styles = css`
    ${MetroStackPanel.styles}
    :host { --_metro-wrap: wrap; }
    :host([orientation="vertical"]:not([hidden])) {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }
    ::slotted(*) {
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow-wrap: anywhere;
    }
  `;

  constructor() {
    super();
    this.orientation = 'horizontal';
  }
}

defineElement('metro-wrap-panel', MetroWrapPanel);

declare global {
  interface HTMLElementTagNameMap { 'metro-wrap-panel': MetroWrapPanel; }
}
