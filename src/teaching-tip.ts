import { css, html } from 'lit';
import { defineElement } from './define.js';
import type { MetroFlyoutCloseReason } from './flyout.js';
import { MetroPopup } from './popup.js';

export class MetroTeachingTip extends MetroPopup {
  static override properties = {
    ...MetroPopup.properties,
    heading: { type: String },
    dismissLabel: { type: String, attribute: 'dismiss-label' },
  };

  static override styles = [...MetroPopup.styles, css`
    .surface { border-block-start: 3px solid var(--_metro-accent); }
    h2 {
      margin: 0 0 var(--_metro-space);
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .dismiss-tip {
      display: block;
      min-block-size: 2.75rem;
      margin-block-start: var(--_metro-space);
      margin-inline-start: auto;
      padding: .25rem .75rem;
      border: 2px solid currentColor;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .dismiss-tip:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
  `];

  declare heading: string;
  declare dismissLabel: string;

  constructor() {
    super();
    this.heading = '';
    this.dismissLabel = 'Got it';
  }

  protected override get accessibleLabel(): string { return this.label || this.heading || 'Help'; }

  protected override focusSurface(): void { this.focusContent({ preventScroll: true }); }

  protected override closeLayer(reason: MetroFlyoutCloseReason, restoreFocus = this.surface?.matches(':focus-within') === true): void {
    super.closeLayer(reason, restoreFocus);
  }

  protected override renderContent() {
    return html`
      ${this.heading ? html`<h2 part="heading">${this.heading}</h2>` : null}
      <div part="body"><slot></slot></div>
      <button type="button" class="dismiss-tip" part="dismiss" data-metro-close>${this.dismissLabel || 'Got it'}</button>
    `;
  }
}

defineElement('metro-teaching-tip', MetroTeachingTip);

declare global {
  interface HTMLElementTagNameMap { 'metro-teaching-tip': MetroTeachingTip; }
}
