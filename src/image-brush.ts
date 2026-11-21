import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import './image.js';
import type { MetroImageFit } from './image.js';
import { metroTheme } from './theme.js';

export class MetroImageBrush extends LitElement {
  static override properties = { src: { type: String }, fit: { type: String } };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; }
    .surface {
      position: relative;
      isolation: isolate;
      min-block-size: var(--metro-image-brush-height, 0);
      background: var(--metro-image-brush-background, var(--_metro-bg));
      color: var(--metro-image-brush-foreground, var(--_metro-fg));
    }
    metro-image {
      position: absolute;
      inset: 0;
      display: block;
      overflow: clip;
      z-index: -1;
      opacity: var(--metro-image-brush-opacity, 1);
      pointer-events: none;
      --metro-image-width: 100%;
      --metro-image-height: 100%;
    }
  `];

  declare src: string;
  declare fit: MetroImageFit;

  constructor() {
    super();
    this.src = '';
    this.fit = 'cover';
  }

  protected override render() {
    return html`
      <div class="surface" part="surface">
        <metro-image .src=${this.src} .fit=${this.fit} part="brush" aria-hidden="true"></metro-image>
        <div part="content"><slot></slot></div>
      </div>
    `;
  }
}

defineElement('metro-image-brush', MetroImageBrush);

declare global {
  interface HTMLElementTagNameMap { 'metro-image-brush': MetroImageBrush; }
}
