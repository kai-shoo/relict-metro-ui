import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';
import { textStyles, type MetroTextVariant } from './text-styles.js';

export type { MetroTextVariant } from './text-styles.js';

export class MetroTextBlock extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    text: { type: String },
    level: { type: Number },
    trim: { type: String, reflect: true },
  };

  static override styles = [...textStyles, css`
    p { margin: 0; overflow-wrap: anywhere; }
    :host([trim="ellipsis"]) p { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    :host([trim="balance"]) p { text-wrap: balance; }
  `];

  declare variant: MetroTextVariant;
  declare text: string;
  declare level: number;
  declare trim: 'wrap' | 'ellipsis' | 'balance';

  constructor() {
    super();
    this.variant = 'body';
    this.text = '';
    this.level = 0;
    this.trim = 'wrap';
  }

  protected override render() {
    const heading = Number.isInteger(this.level) && this.level >= 1 && this.level <= 6;
    return html`<p part="text" role=${heading ? 'heading' : nothing} aria-level=${heading ? this.level : nothing}>
      <slot>${this.text}</slot>
    </p>`;
  }
}

defineElement('metro-text-block', MetroTextBlock);

declare global {
  interface HTMLElementTagNameMap { 'metro-text-block': MetroTextBlock; }
}
