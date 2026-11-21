import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { choiceStyles } from './check-control.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';
import './radio.js';
import type { MetroRadio } from './radio.js';

const formAttributes = ['value', 'disabled', 'required', 'name', 'aria-label'];

export class MetroRadioGroup extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    label: { type: String },
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...formAttributes];
  }

  static override styles = [metroTheme, choiceStyles, css`
    fieldset {
      min-inline-size: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    legend {
      padding-inline: var(--_metro-space);
      color: var(--_metro-muted);
      font-size: 1.25rem;
    }

    legend[hidden] { display: none; }

    .choice-mark { border-radius: 50%; }

    .dot {
      display: none;
      inline-size: 1rem;
      block-size: 1rem;
      border-radius: 50%;
      background: var(--_metro-choice-mark, currentColor);
    }

    input:checked + .choice-mark .dot { display: block; }

    @media (forced-colors: active) {
      .dot { forced-color-adjust: none; background: CanvasText; }
      input:disabled + .choice-mark .dot { background: GrayText; }
    }
  `];

  declare label: string;
  #internals: ElementInternals;
  #chosen: string | null = null;
  #disabledByForm = false;
  #customMessage = '';
  #focusedValue?: string;

  #observer = new MutationObserver(() => {
    this.#synchronizeForm();
    this.requestUpdate();
  });

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.label = '';
    this.addEventListener('click', event => {
      if (event.defaultPrevented || event.composedPath()[0] !== this) return;
      this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'slot'],
    });
    this.#synchronizeForm();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !formAttributes.includes(name)) return;
    this.#synchronizeForm();
    this.requestUpdate();
  }

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedValue = active instanceof HTMLInputElement ? active.value : undefined;
  }

  protected override updated(): void {
    this.#synchronizeForm();
    const value = this.#focusedValue;
    this.#focusedValue = undefined;
    if (value === undefined || this.#effectiveDisabled || this.shadowRoot?.activeElement?.matches('input:enabled')) return;
    const same = Array.from(this.renderRoot.querySelectorAll<HTMLInputElement>('input:enabled')).find(input => input.value === value);
    if (same) same.focus();
    else this.focus();
  }

  get value(): string {
    const value = this.#chosen ?? this.defaultValue;
    const selected = this.#options().find(option => option.value === value);
    return selected && !selected.disabled ? value : '';
  }

  set value(value: string) {
    this.#chosen = String(value);
    this.#synchronizeForm();
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
    this.#synchronizeForm();
  }

  override focus(options?: FocusOptions) {
    if (this.#effectiveDisabled) return;
    const input = this.shadowRoot?.querySelector<HTMLInputElement>('input:checked:not(:disabled)')
      ?? this.shadowRoot?.querySelector<HTMLInputElement>('input:not(:disabled)');
    input?.focus(options);
  }

  formDisabledCallback(disabled: boolean): void {
    this.#disabledByForm = disabled;
    this.#synchronizeForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.#chosen = null;
    this.#synchronizeForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  get #effectiveDisabled() { return this.disabled || this.#disabledByForm; }

  #options() {
    const values = new Set<string>();
    return Array.from(this.children).filter((child): child is MetroRadio => {
      if (child.localName !== 'metro-radio') return false;
      const option = child as MetroRadio;
      if (!option.value || values.has(option.value)) return false;
      values.add(option.value);
      return true;
    });
  }

  #synchronizeForm(): void {
    const value = this.value;
    this.#internals.setFormValue(value || null, value);
    const disabled = this.#effectiveDisabled;
    const valueMissing = this.required && !disabled && !value;
    const customError = Boolean(this.#customMessage) && !disabled;
    const fieldset = this.shadowRoot?.querySelector('fieldset');
    if (fieldset) fieldset.disabled = disabled;
    if (!valueMissing && !customError) {
      this.#internals.setValidity({});
      return;
    }

    const input = this.shadowRoot?.querySelector<HTMLInputElement>('input:not(:disabled)');
    this.#internals.setValidity(
      { valueMissing, customError },
      this.#customMessage || input?.validationMessage || 'Please select an option.',
      input ?? undefined,
    );
  }

  #onInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.getRootNode() === this.shadowRoot && input.checked) {
      this.value = input.value;
    }
  }

  #onChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement) || event.target.getRootNode() !== this.shadowRoot || event.composed) return;
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  protected override render() {
    const value = this.value;
    const hasLegend = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const externalLabel = hasLegend ? '' : Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ');
    const ariaLabel = this.getAttribute('aria-label') ?? (externalLabel || undefined);
    return html`
      <fieldset part="group" role="radiogroup" ?disabled=${this.#effectiveDisabled}
        aria-required=${String(this.required)} aria-label=${ifDefined(ariaLabel)}
        @input=${this.#onInput} @change=${this.#onChange}>
        <legend part="legend" ?hidden=${!hasLegend}><slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot></legend>
        ${repeat(this.#options(), option => option.value, option => html`
          <label class="choice" part="option">
            <input class="choice-input" part="input" type="radio" name="choice" .value=${option.value}
              .checked=${live(option.value === value)} ?disabled=${option.disabled} ?required=${this.required}>
            <span class="choice-mark" part="indicator" aria-hidden="true"><span class="dot" part="dot"></span></span>
            <span class="choice-label" part="label">${option.label || option.textContent?.trim() || option.value}</span>
          </label>
        `)}
      </fieldset>
    `;
  }
}

defineElement('metro-radio-group', MetroRadioGroup);

declare global {
  interface HTMLElementTagNameMap {
    'metro-radio-group': MetroRadioGroup;
  }
}
