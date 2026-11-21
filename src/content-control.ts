import { css, html } from 'lit';
import { defineElement } from './define.js';
import { MetroContentPresenter } from './content-presenter.js';

export class MetroContentControl extends MetroContentPresenter {
  static override styles = [...MetroContentPresenter.styles, css`
    .surface {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      min-inline-size: 0;
      padding: var(--metro-content-padding, 0);
      color: var(--metro-content-color, inherit);
      background: var(--metro-content-background, transparent);
    }
    header, footer, .content { min-inline-size: 0; }
    ::slotted(*), .content > * { max-inline-size: 100%; }
  `];

  protected override render() {
    return html`
      <div part="surface" class="surface">
        <header part="header"><slot name="header"></slot></header>
        <div part="content" class="content">${this.renderContent()}</div>
        <footer part="footer"><slot name="footer"></slot></footer>
      </div>
    `;
  }
}

defineElement('metro-content-control', MetroContentControl);

declare global {
  interface HTMLElementTagNameMap { 'metro-content-control': MetroContentControl; }
}
