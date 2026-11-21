import { css } from 'lit';
import { defineElement } from './define.js';
import { MetroLiveTile } from './live-tile.js';

export class MetroHubTile extends MetroLiveTile {
  static override styles = [...MetroLiveTile.styles, css`
    :host { --_metro-live-tile-flip-motion: 850ms; }
    :host([size="default"]) { --_metro-live-tile-width: var(--metro-tile-width, 173px); }
    :host([size="small"]) { --_metro-live-tile-width: var(--metro-tile-width, 99px); }
    :host([size="medium"]) { --_metro-live-tile-width: var(--metro-tile-width, 210px); }
    :host([size="wide"]), :host([size="large"]) {
      --_metro-live-tile-width: var(--metro-tile-width, 432px);
      --metro-tile-aspect: 432 / 210;
    }
  `];

  constructor() {
    super();
    this.size = 'default';
  }
}

defineElement('metro-hub-tile', MetroHubTile);

declare global {
  interface HTMLElementTagNameMap { 'metro-hub-tile': MetroHubTile; }
}
