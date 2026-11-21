import { LitElement, css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroBreadcrumbItem {
  id: string;
  label: string;
  href?: string;
}

export type MetroBreadcrumbEvent = CustomEvent<{ id: string; href: string }>;

export class MetroBreadcrumbBar extends LitElement {
  static override properties = {
    label: { type: String },
    items: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }

    ol {
      display: flex;
      flex-wrap: wrap;
      gap: .25rem 0;
      align-items: baseline;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    li { display: flex; align-items: baseline; min-inline-size: 0; }
    a, .current, .text { overflow-wrap: anywhere; }
    a { color: inherit; text-underline-offset: .2em; }
    a:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .current { font-weight: 600; }
    .separator { margin-inline: .5em; color: var(--_metro-muted); }
  `];

  declare label: string;
  declare items: readonly MetroBreadcrumbItem[];

  constructor() {
    super();
    this.label = 'Breadcrumbs';
    this.items = [];
  }

  #follow(event: MouseEvent, item: MetroBreadcrumbItem): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey
      || event.shiftKey || item.href === undefined) return;
    const navigate = this.dispatchEvent(new CustomEvent('metro-breadcrumb', {
      detail: { id: item.id, href: item.href }, bubbles: true, composed: true, cancelable: true,
    }) satisfies MetroBreadcrumbEvent);
    if (!navigate) event.preventDefault();
  }

  protected override render() {
    if (!this.items.length) return html``;
    return html`
      <nav part="nav" aria-label=${this.label || 'Breadcrumbs'}>
        <ol part="list" role="list">
          ${repeat(this.items, item => item.id, (item, index) => html`
            <li part="item">
              ${index ? html`<span class="separator" part="separator" aria-hidden="true">/</span>` : null}
              ${index === this.items.length - 1
                ? html`<span class="current" part="current" aria-current="page">${item.label}</span>`
                : item.href === undefined
                  ? html`<span class="text" part="text">${item.label}</span>`
                  : html`<a part="link" href=${item.href} @click=${(event: MouseEvent) => this.#follow(event, item)}>${item.label}</a>`}
            </li>
          `)}
        </ol>
      </nav>
    `;
  }
}

defineElement('metro-breadcrumb-bar', MetroBreadcrumbBar);

declare global {
  interface HTMLElementTagNameMap { 'metro-breadcrumb-bar': MetroBreadcrumbBar; }
  interface HTMLElementEventMap { 'metro-breadcrumb': MetroBreadcrumbEvent; }
}
