import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export class MetroCanvas extends LitElement {
  static override styles = css`
    :host { display: block; min-inline-size: 0; }
    :host([hidden]) { display: none; }
    .canvas {
      /* A Canvas can itself be positioned on another Canvas. */
      --metro-canvas-x: initial;
      --metro-canvas-y: initial;
      --metro-canvas-layer: initial;
      position: relative;
      isolation: isolate;
      min-block-size: var(--metro-canvas-height, 0);
      block-size: 100%;
    }
    ::slotted(*) {
      position: absolute;
      inset-inline-start: var(--metro-canvas-x, 0);
      inset-block-start: var(--metro-canvas-y, 0);
      z-index: var(--metro-canvas-layer, auto);
    }
  `;

  protected override render() { return html`<div class="canvas" part="canvas"><slot></slot></div>`; }
}

defineElement('metro-canvas', MetroCanvas);

declare global {
  interface HTMLElementTagNameMap { 'metro-canvas': MetroCanvas; }
}
