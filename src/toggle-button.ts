import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroToggleButton extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  };

  static override styles = [metroTheme, metroButtonStyles, css`
    button[aria-pressed="true"]:enabled {
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }

    button[aria-pressed="true"]:disabled {
      border-color: var(--_metro-disabled);
      background: var(--_metro-disabled);
      color: var(--_metro-bg);
    }

    @media (forced-colors: active) {
      button[aria-pressed="true"]:enabled {
        forced-color-adjust: none;
        border-color: ButtonText;
        background: Highlight;
        color: HighlightText;
      }
    }
  `];

  declare checked: boolean;
  declare disabled: boolean;
  declare label: string;

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
    this.label = '';
  }

  override click(): void {
    this.shadowRoot?.querySelector('button')?.click();
  }

  #toggle = (event: MouseEvent) => {
    if (this.disabled || event.defaultPrevented) return;
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  protected override render() {
    return html`
      <button type="button" part="button" aria-pressed=${this.checked}
        aria-label=${ifDefined(this.label || undefined)} ?disabled=${this.disabled} @click=${this.#toggle}>
        <slot>${this.label}</slot>
      </button>
    `;
  }
}

defineElement('metro-toggle-button', MetroToggleButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-toggle-button': MetroToggleButton; }
}
