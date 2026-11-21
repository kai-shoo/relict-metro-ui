import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { textStyles, type MetroTextVariant } from './text-styles.js';

export class MetroRichTextBlock extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
  };

  static override styles = [...textStyles, css`
    .content { max-inline-size: var(--metro-prose-width, 65ch); overflow-wrap: anywhere; }
    ::slotted(:first-child) { margin-block-start: 0; }
    ::slotted(:last-child) { margin-block-end: 0; }
  `];

  declare variant: MetroTextVariant;

  constructor() {
    super();
    this.variant = 'body';
  }

  protected override render() { return html`<div class="content" part="content"><slot></slot></div>`; }
}

defineElement('metro-rich-text-block', MetroRichTextBlock);

declare global {
  interface HTMLElementTagNameMap { 'metro-rich-text-block': MetroRichTextBlock; }
}
