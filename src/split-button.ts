import { css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { MetroCommandEvent } from './command-bar.js';
import { defineElement } from './define.js';
import { MetroDropDownButton } from './drop-down-button.js';

export class MetroSplitButton extends MetroDropDownButton {
  static override properties = {
    ...MetroDropDownButton.properties,
    primaryCommand: { type: String, attribute: 'primary-command' },
  };

  static override styles = [...MetroDropDownButton.styles, css`
    #primary {
      padding-inline: min(.625rem, 2.25vi);
      border-inline-end-width: 0;
      hyphens: auto;
    }

    #trigger {
      flex: none;
      min-inline-size: 48px;
      padding-inline: 0;
      border-inline-start-width: 2px;
    }
  `];

  declare primaryCommand: string;

  constructor() {
    super();
    this.primaryCommand = 'primary';
  }

  get #primary(): HTMLButtonElement | null | undefined {
    return this.shadowRoot?.querySelector('#primary');
  }

  override focus(options?: FocusOptions): void {
    this.#primary?.focus(options);
  }

  override click(): void {
    this.#primary?.click();
  }

  protected override get resolvedMenuLabel(): string {
    return this.menuLabel || (this.label ? `${this.label} options` : 'More options');
  }

  protected override get triggerLabel(): string { return this.resolvedMenuLabel; }
  protected override get menuReturnFocus(): HTMLElement | null { return this.returnFocus ?? this.#primary ?? null; }

  #activate = (event: MouseEvent) => {
    if (event.defaultPrevented || this.disabled) return;
    this.dispatchEvent(new CustomEvent('metro-command', {
      detail: { id: this.primaryCommand }, bubbles: true, composed: true,
    }) satisfies MetroCommandEvent);
  };

  protected override renderPrimary() {
    return html`
      <button id="primary" type="button" part="primary" aria-label=${ifDefined(this.label || undefined)}
        ?disabled=${this.disabled} @click=${this.#activate}>
        <slot>${this.label || 'Action'}</slot>
      </button>
    `;
  }

  protected override renderTriggerText() { return undefined; }
}

defineElement('metro-split-button', MetroSplitButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-split-button': MetroSplitButton; }
}
