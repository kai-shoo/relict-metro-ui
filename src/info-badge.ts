import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroInfoBadge extends LitElement {
  static override properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: inline-flex;
      vertical-align: middle;
    }

    :host([hidden]) { display: none; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      min-inline-size: .5rem;
      min-block-size: .5rem;
      color: var(--metro-badge-foreground, var(--_metro-on-accent));
      background: var(--metro-badge-background, var(--_metro-accent));
      font-size: .75rem;
      font-weight: 600;
      line-height: 1.25;
    }

    .number {
      min-inline-size: 1rem;
      min-block-size: 1rem;
      padding-inline: .25rem;
      font-variant-numeric: tabular-nums;
    }

    .dot {
      inline-size: .5rem;
      block-size: .5rem;
    }

    ::slotted([slot="icon"]) {
      box-sizing: border-box;
      min-inline-size: 1rem;
      min-block-size: 1rem;
    }

    @media (forced-colors: active) {
      .badge {
        forced-color-adjust: none;
        color: HighlightText;
        background: Highlight;
      }
    }
  `];

  declare value: number | null;
  declare max: number;
  declare label: string;

  constructor() {
    super();
    this.value = null;
    this.max = 99;
    this.label = '';
  }

  protected override render() {
    const count = this.value !== null && Number.isFinite(this.value) && this.value >= 0
      ? Math.trunc(this.value)
      : null;
    const max = Number.isFinite(this.max) && this.max >= 0 ? Math.trunc(this.max) : 99;
    const label = this.label || (count === null ? 'New activity' : String(count));

    return html`
      <span class=${count === null ? 'badge' : 'badge number'} part="badge"
        role="img" aria-label=${label}>
        ${count === null ? html`
          <slot name="icon"><span class="dot" part="dot"></span></slot>
        ` : html`<span part="value">${count > max ? `${max}+` : count}</span>`}
      </span>
    `;
  }
}

defineElement('metro-info-badge', MetroInfoBadge);

declare global {
  interface HTMLElementTagNameMap {
    'metro-info-badge': MetroInfoBadge;
  }
}
