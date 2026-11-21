import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './option.js';
import type { MetroOption } from './option.js';
import { pickerChevron } from './picker-chevron.js';
import { metroTheme } from './theme.js';

const formAttributes = ['value', 'name', 'required', 'disabled', 'aria-label', 'aria-labelledby', 'aria-invalid'];

export class MetroComboBox extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    label: { type: String },
    placeholder: { type: String },
    emptyLabel: { type: String, attribute: 'empty-label' },
    value: { attribute: false, noAccessor: true },
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...formAttributes];
  }

  static override styles = [metroTheme, pickerChevron, css`
    :host {
      display: inline-block;
      min-inline-size: 0;
      max-inline-size: 100%;
      color: var(--_metro-fg);
    }

    .field {
      display: grid;
      gap: .5rem;
      padding-inline: var(--_metro-space);
    }

    .label {
      color: var(--_metro-muted);
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }

    .label[hidden] { display: none; }
    .field:has(select:disabled) .label { color: var(--_metro-disabled); }

    .control { position: relative; min-inline-size: 0; color: inherit; }

    select {
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: 3.25rem;
      padding-block: .375rem;
      padding-inline: .5rem 2.25rem;
      border: 3px solid currentColor;
      border-radius: 0;
      appearance: none;
      background: transparent;
      color: inherit;
      font: 400 1.4167rem / 1.3 var(--_metro-font);
      text-overflow: ellipsis;
      cursor: pointer;
    }

    select:focus {
      border-color: var(--_metro-accent);
      background: var(--metro-input-focus-bg, light-dark(transparent, #fff));
      color: light-dark(var(--_metro-fg), #000);
      outline: none;
    }

    select:disabled {
      color: var(--_metro-disabled);
      opacity: 1;
      cursor: default;
    }

    option { background-color: var(--_metro-bg); color: var(--_metro-fg); }
    option:disabled { color: var(--_metro-disabled); }

    .chevron {
      position: absolute;
      inset-block: 0;
      inset-inline-end: .85rem;
      margin-block: auto;
    }

    select:focus + .chevron { color: light-dark(var(--_metro-fg), #000); }
    select:disabled + .chevron { color: var(--_metro-disabled); }

    @media (forced-colors: active) {
      select { border-color: ButtonText; }
      select:focus { border-color: Highlight; }
      select:disabled { border-color: GrayText; }
      .chevron, select:focus + .chevron { color: ButtonText; }
      select:disabled + .chevron { color: GrayText; }
    }
  `];

  declare label: string;
  declare placeholder: string;
  declare emptyLabel: string;
  #internals = this.attachInternals();
  #requestedValue: string | undefined;
  #fieldsetDisabled = false;
  #customMessage = '';

  #optionsObserver = new MutationObserver(records => {
    if (!records.some(record => record.target !== this || record.type === 'childList')) return;
    this.#syncForm();
    this.requestUpdate();
  });

  constructor() {
    super();
    this.label = '';
    this.placeholder = '';
    this.emptyLabel = 'No options available';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#optionsObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'slot'],
    });
    this.#syncForm();
  }

  override disconnectedCallback(): void {
    this.#optionsObserver.disconnect();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !formAttributes.includes(name)) return;
    this.#syncForm();
    this.requestUpdate();
  }

  protected override updated(): void { this.#syncForm(); }

  get value(): string { return this.#resolveValue(this.#options()); }
  set value(value: string) {
    this.#requestedValue = String(value);
    this.#syncForm();
    this.requestUpdate();
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }

  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }

  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  setCustomValidity(message: string): void {
    this.#customMessage = String(message);
    this.#syncForm();
  }

  override focus(options?: FocusOptions): void { this.#select?.focus(options); }
  override blur(): void { this.#select?.blur(); }

  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled;
    this.#syncForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.#requestedValue = undefined;
    this.#syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  get #select() { return this.shadowRoot?.querySelector('select') ?? null; }
  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }

  #options(): MetroOption[] {
    const values = new Set<string>();
    return Array.from(this.children).filter((child): child is MetroOption => {
      if (child.localName !== 'metro-option') return false;
      const option = child as MetroOption;
      if (!option.value || values.has(option.value)) return false;
      values.add(option.value);
      return true;
    });
  }

  #resolveValue(options: MetroOption[]): string {
    const requested = this.#requestedValue ?? this.getAttribute('value');
    if (requested === null && !this.placeholder) return options.find(option => !option.disabled)?.value ?? '';
    if (requested && options.some(option => option.value === requested && !option.disabled)) return requested;
    return '';
  }

  #syncForm(): void {
    const value = this.value;
    this.#internals.setFormValue(value || null, value);
    const select = this.#select;
    if (select) {
      select.disabled = this.#controlDisabled;
      select.required = this.required;
      if (select.selectedIndex === -1 || select.value !== value) select.value = value;
      select.setCustomValidity(this.#customMessage);
    }
    const valueMissing = this.required && !value && !this.#controlDisabled;
    const customError = Boolean(this.#customMessage) && !this.#controlDisabled;
    if (valueMissing || customError) {
      this.#internals.setValidity(
        { valueMissing, customError },
        this.#customMessage || select?.validationMessage || 'Please select an option.',
        select ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  #accessibleLabel(hasLabel: boolean): string | undefined {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const text = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (text) return text;
    }
    const explicit = this.getAttribute('aria-label');
    if (explicit || hasLabel) return explicit || undefined;
    return Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ') || undefined;
  }

  #onInput(event: Event): void {
    this.value = (event.currentTarget as HTMLSelectElement).value;
    if (!event.composed) this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  #onChange(event: Event): void {
    this.value = (event.currentTarget as HTMLSelectElement).value;
    if (event.composed) return;
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  protected override render() {
    const options = this.#options();
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const placeholder = options.some(option => !option.disabled) ? this.placeholder : this.emptyLabel;
    return html`
      <div class="field">
        <label class="label" part="label" for="select" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <div class="control" part="control">
          <select id="select" part="select" aria-label=${ifDefined(this.#accessibleLabel(hasLabel))}
            aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
            ?disabled=${this.#controlDisabled} ?required=${this.required}
            @input=${this.#onInput} @change=${this.#onChange}>
            <option value="" disabled hidden>${placeholder}</option>
            ${repeat(options, option => option, option => html`
              <option value=${option.value} ?disabled=${option.disabled}>
                ${option.label || option.textContent?.trim() || option.value}
              </option>
            `)}
          </select>
          <span class="chevron" part="indicator" aria-hidden="true"></span>
        </div>
      </div>
    `;
  }
}

defineElement('metro-combo-box', MetroComboBox);

declare global {
  interface HTMLElementTagNameMap {
    'metro-combo-box': MetroComboBox;
  }
}
