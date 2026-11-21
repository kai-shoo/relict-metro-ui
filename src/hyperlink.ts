import { LitElement, css, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroHyperlink extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties = {
    href: { type: String },
    target: { type: String },
    rel: { type: String },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host { display: inline; }

    a {
      color: var(--_metro-fg);
      font-family: inherit;
      text-underline-offset: 0.16em;
    }

    /* Center the icon between the text baseline and the top of a capital letter. */
    ::slotted(metro-icon) {
      vertical-align: calc(.5cap - var(--metro-icon-size, 1.25em) / 2);
    }

    a[href]:active { color: var(--_metro-muted); }
    a[href]:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
  `];

  declare href: string | null;
  declare target: string;
  declare rel: string;
  declare label: string;

  constructor() {
    super();
    this.href = null;
    this.target = '';
    this.rel = '';
    this.label = '';
  }

  override click(): void {
    this.shadowRoot?.querySelector('a')?.click();
  }

  protected override render() {
    return html`
      <a part="link" href=${this.href ?? nothing} target=${ifDefined(this.target || undefined)}
        rel=${ifDefined(this.rel || undefined)} aria-label=${ifDefined(this.label || undefined)}>
        <slot></slot>
      </a>
    `;
  }
}

defineElement('metro-hyperlink', MetroHyperlink);

declare global {
  interface HTMLElementTagNameMap {
    'metro-hyperlink': MetroHyperlink;
  }
}
