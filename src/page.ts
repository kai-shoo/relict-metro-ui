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
  `];

  declare value: string;
  declare label: string;

  constructor() {
    super();
    this.value = '';
    this.label = '';
  }

  override focus(options?: FocusOptions): void {
    const heading = this.shadowRoot?.querySelector<HTMLElement>('.heading:not([hidden])');
    (heading ?? this.shadowRoot?.querySelector<HTMLElement>('article'))?.focus(options);
  }

  protected override render() {
    const title = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const titled = this.label || title?.assignedNodes().some(
      node => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim(),
    );
    const authoredHeading = title?.assignedElements().some(
      element => element.matches(headingSelector) || element.querySelector(headingSelector),
    );
    return html`
      <article part="page" tabindex="-1">
        <div class="heading" part="heading" tabindex="-1" ?hidden=${!titled}
          role=${authoredHeading ? 'group' : 'heading'} aria-level=${ifDefined(authoredHeading ? undefined : '1')}
          aria-labelledby=${ifDefined(authoredHeading ? 'title' : undefined)}>
          <slot id="title" name="title" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </div>
        <div part="body"><slot></slot></div>
        <slot name="commands"></slot>
      </article>
    `;
  }
}

defineElement('metro-page', MetroPage);

declare global {
  interface HTMLElementTagNameMap { 'metro-page': MetroPage; }
}
