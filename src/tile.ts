import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroTileSize = 'small' | 'medium' | 'wide';

export class MetroTile extends LitElement {
  static override properties = {
    href: { type: String },
    target: { type: String },
    rel: { type: String },
    size: { type: String, reflect: true },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      box-sizing: border-box;
      inline-size: var(--metro-tile-width, var(--_tile-width, 10.5rem));
      min-inline-size: 0;
      max-inline-size: 100%;
      font-family: var(--_metro-font);
    }

    :host([hidden]) { display: none; }
    :host([size="small"]) { --_tile-width: 5rem; }
    :host([size="wide"]) { --_tile-width: 21.5rem; --_tile-aspect: 691 / 336; }

    .surface {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      inline-size: 100%;
      block-size: 100%;
      min-block-size: 0;
      aspect-ratio: var(--metro-tile-aspect, var(--_tile-aspect, 1));
      overflow: hidden;
      padding: var(--_metro-space);
      color: var(--metro-tile-fg, var(--_metro-on-accent));
      background: var(--metro-tile-bg, var(--_metro-accent));
      text-decoration: none;
    }

    .content {
      display: grid;
      place-items: center;
      flex: 1;
      min-inline-size: 0;
      min-block-size: 0;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: .875rem;
      line-height: 1.25;
    }

    a.surface { transition: transform var(--_metro-motion) ease, filter var(--_metro-motion) ease; }
    a.surface:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    a.surface:active { transform: scale(.98); }

    @media (hover: hover) {
      a.surface:hover { filter: brightness(1.06); }
    }

    @media (prefers-reduced-motion: reduce) {
      a.surface { transition: none; }
      a.surface:active { transform: none; }
    }

    @media (forced-colors: active) {
      .surface { border: 1px solid ButtonText; }
    }
  `];

  declare href: string | null;
  declare target: string | null;
  declare rel: string | null;
  declare size: MetroTileSize;
  declare label: string;

  constructor() {
    super();
    this.href = null;
    this.target = null;
    this.rel = null;
    this.size = 'medium';
    this.label = '';
  }

  protected override render() {
    const content = html`
      <span class="content" part="content"><slot></slot></span>
      ${this.label ? html`<span class="label" part="label">${this.label}</span>` : null}
    `;

    return this.href == null
      ? html`<div class="surface" part="surface">${content}</div>`
      : html`
        <a class="surface" part="surface" href=${this.href}
          target=${ifDefined(this.target || undefined)} rel=${ifDefined(this.rel || undefined)}
          aria-label=${ifDefined(this.label || undefined)}>${content}</a>
      `;
  }
}

defineElement('metro-tile', MetroTile);

declare global {
  interface HTMLElementTagNameMap {
    'metro-tile': MetroTile;
  }
}
