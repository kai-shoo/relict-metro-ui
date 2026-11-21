import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export type MetroContent = string | number | Node | null;

export class MetroContentPresenter extends LitElement {
  static override properties = { content: { attribute: false } };
  static override styles = [css`
    :host { display: block; min-inline-size: 0; overflow-wrap: anywhere; }
    :host([hidden]) { display: none; }
  `];

  declare content: MetroContent;

  constructor() {
    super();
    this.content = null;
  }

  protected renderContent() { return this.content ?? html`<slot></slot>`; }

  protected override render() { return html`<div part="content">${this.renderContent()}</div>`; }
}

defineElement('metro-content-presenter', MetroContentPresenter);

declare global {
  interface HTMLElementTagNameMap { 'metro-content-presenter': MetroContentPresenter; }
}
