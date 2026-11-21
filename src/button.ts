import { LitElement, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroButtonType = 'button' | 'submit' | 'reset';

export class MetroButton extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties = {
    disabled: { attribute: false, noAccessor: true },
    type: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
    label: { type: String },
    formNoValidate: { type: Boolean, attribute: 'formnovalidate' },
  };

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'disabled'];
  }

  static override styles = [metroTheme, metroButtonStyles];

  declare type: MetroButtonType;
  declare name: string;
  declare value: string;
  declare label: string;
  declare formNoValidate: boolean;

  #internals = this.attachInternals();
  #formDisabled = false;

  constructor() {
    super();
    this.type = 'button';
    this.name = '';
    this.value = '';
    this.label = '';
    this.formNoValidate = false;
  }

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  get disabled(): boolean { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'disabled') this.requestUpdate();
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  override click(): void {
    this.shadowRoot?.querySelector('button')?.click();
  }

  #activate(event: MouseEvent): void {
    const type = this.type;
    const form = this.form;
    if (!form || this.disabled || this.#formDisabled || (type !== 'submit' && type !== 'reset')) return;

    // Leave authors the same chance to cancel the bubbling click as for a native button.
    setTimeout(() => {
      if (event.defaultPrevented || this.form !== form || this.disabled || this.#formDisabled) return;
      if (type === 'reset') {
        form.reset();
        return;
      }

      const submitter = this.ownerDocument.createElement('button');
      submitter.type = 'submit';
      submitter.name = this.name;
      submitter.value = this.value;
      submitter.formNoValidate = this.formNoValidate;
      submitter.hidden = true;
      form.append(submitter);
      try {
        form.requestSubmit(submitter);
      } finally {
        submitter.remove();
      }
    });
  }

  protected override render() {
    return html`
      <button type="button" part="button" aria-label=${ifDefined(this.label || undefined)}
        ?disabled=${this.disabled || this.#formDisabled} @click=${this.#activate}>
        <slot></slot>
      </button>
    `;
  }
}

defineElement('metro-button', MetroButton);

declare global {
  interface HTMLElementTagNameMap {
    'metro-button': MetroButton;
  }
}
