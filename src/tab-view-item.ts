import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';

export class MetroTabViewItem extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    closable: { type: Boolean, reflect: true },
  };

  static override styles = css`:host { display: block; min-inline-size: 0; }`;

  declare value: string;
  declare label: string;
  declare disabled: boolean;
  declare closable: boolean;
  session: unknown;
  #lastFocus?: HTMLElement;
  #focusKey?: string;

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.disabled = false;
    this.closable = false;
    this.addEventListener('focusin', event => {
      const path = event.composedPath();
      const local = path.slice(0, path.indexOf(this));
      const target = local.find(node => node instanceof HTMLElement);
      if (target) {
        this.#lastFocus = target;
        const keyed = local.find((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.dataset.metroFocus));
        this.#focusKey = keyed?.dataset.metroFocus;
      }
    });
  }

  get focusKey(): string | undefined { return this.#focusKey; }

  restoreFocus(key = this.#focusKey): boolean {
    const previous = this.#lastFocus;
    const target = key === this.#focusKey && previous?.isConnected && previous.getClientRects().length
      ? previous
      : key && Array.from(this.querySelectorAll<HTMLElement>('[data-metro-focus]'))
        .find(node => node.dataset.metroFocus === key && node.getClientRects().length);
    if (!target) return false;
    target.focus({ preventScroll: true });
    return target.matches(':focus-within');
  }

  protected override render() { return html`<slot></slot>`; }
}

defineElement('metro-tab-view-item', MetroTabViewItem);

declare global {
  interface HTMLElementTagNameMap { 'metro-tab-view-item': MetroTabViewItem; }
}
