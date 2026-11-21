import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

const headingSelector = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

export class MetroPage extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      background: var(--_metro-bg);
      color: var(--_metro-fg);
    }

    article { container-type: inline-size; }

    .heading {
      margin-block: 0 var(--_metro-space);
      font-size: min(clamp(2rem, 10vi, 3.5rem), max(1.5rem, 18cqi));
      font-weight: 300;
      line-height: 1;
      text-wrap: balance;
      hyphens: auto;
      overflow-wrap: anywhere;
    }

    .heading[hidden] { display: none; }

    article[data-wp8] {
      position: relative;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      block-size: 100%;
    }

    article[data-wp8] [part="body"] {
      grid-area: 2 / 1;
      min-inline-size: 0;
      overflow: auto;
    }

    article[data-wp8] .heading { grid-area: 1 / 1; }

    slot[name="commands"]::slotted(metro-command-bar[profile="wp8"]) {
      grid-area: 3 / 1;
      z-index: 1;
    }

    slot[name="commands"]::slotted(metro-command-bar[profile="wp8"][data-wp8-overlay]) {
      position: absolute;
      inset: auto 0 0;
      grid-area: auto;
    }

    article[data-wp8="vertical"] {
      grid-template: auto minmax(0, 1fr) / minmax(0, 1fr) auto;
    }

    slot[name="commands"]::slotted(metro-command-bar[profile="wp8"][orientation="vertical"]) { grid-area: 1 / 2 / -1; }

    slot[name="commands"]::slotted(metro-command-bar[profile="wp8"][orientation="vertical"][data-wp8-overlay]) {
      inset: auto;
      inset-block: 0;
      inset-inline-end: 0;
      grid-area: auto;
    }
  `];

  declare value: string;
  declare label: string;

  #commandBarLayout = new MutationObserver(records => {
    if (records.some(record => record.target.parentNode === this &&
      (record.target as Element).matches('metro-command-bar[slot="commands"]'))) this.requestUpdate();
  });

  constructor() {
    super();
    this.value = '';
    this.label = '';
  }

  override connectedCallback() {
    super.connectedCallback();
    this.#commandBarLayout.observe(this, { subtree: true, attributeFilter: ['profile', 'orientation'] });
    this.requestUpdate();
  }

  override disconnectedCallback() {
    this.#commandBarLayout.disconnect();
    super.disconnectedCallback();
  }

  override focus(options?: FocusOptions): void {
    const heading = this.shadowRoot?.querySelector<HTMLElement>('.heading:not([hidden])');
    (heading ?? this.shadowRoot?.querySelector<HTMLElement>('article'))?.focus(options);
  }

  protected override render() {
    const wp8 = this.querySelector(':scope > metro-command-bar[slot="commands"][profile="wp8"]');
    const orientation = wp8 ? (wp8.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal') : undefined;
    const title = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const titled = this.label || title?.assignedNodes().some(
      node => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim(),
    );
    const authoredHeading = title?.assignedElements().some(
      element => element.matches(headingSelector) || element.querySelector(headingSelector),
    );
    return html`
      <article part="page" tabindex="-1" data-wp8=${ifDefined(orientation)}>
        <div class="heading" part="heading" tabindex="-1" ?hidden=${!titled}
          role=${authoredHeading ? 'group' : 'heading'} aria-level=${ifDefined(authoredHeading ? undefined : '1')}
          aria-labelledby=${ifDefined(authoredHeading ? 'title' : undefined)}>
          <slot id="title" name="title" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </div>
        <div part="body"><slot></slot></div>
        <slot name="commands" @slotchange=${() => this.requestUpdate()}></slot>
      </article>
    `;
  }
}

defineElement('metro-page', MetroPage);

declare global {
  interface HTMLElementTagNameMap { 'metro-page': MetroPage; }
}
