import { LitElement, css, html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';

export const choiceStyles = css`
  :host {
    display: inline-block;
    max-inline-size: 100%;
    color: var(--_metro-fg);
  }

  .choice {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--_metro-space);
    box-sizing: border-box;
    min-block-size: 4.5rem;
    padding: 1.25rem var(--_metro-space);
    font-size: 1.4167rem;
    line-height: 1.3;
    cursor: pointer;
  }

  .choice:has(input:disabled) {
    color: var(--_metro-disabled);
    cursor: default;
  }

  .choice-label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .choice-input {
    position: absolute;
    inset: 0;
    z-index: 1;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .choice-mark {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    flex: none;
    inline-size: 2rem;
    block-size: 2rem;
    border: 3px solid currentColor;
  }

  .choice:active input:enabled + .choice-mark {
    background: var(--_metro-accent);
    --_metro-choice-mark: var(--_metro-on-accent);
  }

  .choice-input:focus-visible + .choice-mark {
    outline: 2px solid var(--_metro-focus);
    outline-offset: 3px;
  }

  @media (forced-colors: active) {
    .choice-mark { color: CanvasText; }
    .choice:has(input:disabled) .choice-mark { color: GrayText; }
    .choice-input:focus-visible + .choice-mark { outline-color: Highlight; }
  }
`;

const formAttributes = ['checked', 'disabled', 'required', 'value', 'name', 'aria-label', 'aria-labelledby'];

export abstract class CheckControl extends LitElement {
  static readonly formAssociated = true;

  static override properties: PropertyDeclarations = {
    label: { type: String },
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...formAttributes];
  }

  declare label: string;
  #internals: ElementInternals;
  #checked = false;
  #dirtyChecked = false;
  #disabledByForm = false;
  #customMessage = '';

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.label = '';
    this.addEventListener('click', event => {
      if (event.defaultPrevented || event.composedPath()[0] !== this || this.controlDisabled) return;
      this.focus();
      this.controlInput?.click();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#synchronizeForm();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !formAttributes.includes(name)) return;

    if (name === 'checked' && !this.#dirtyChecked) {
      this.#checked = this.defaultChecked;
      this.checkedUpdated();
    }
    this.#synchronizeForm();
    this.requestUpdate();
  }

  protected override updated(): void {
    this.#synchronizeForm();
  }

  get checked() { return this.#checked; }
  set checked(value: boolean) {
    this.#dirtyChecked = true;
    this.#checked = Boolean(value);
    this.checkedUpdated();
    this.#synchronizeForm();
    this.requestUpdate();
  }

  get defaultChecked() { return this.hasAttribute('checked'); }
  set defaultChecked(value: boolean) { this.toggleAttribute('checked', value); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }

  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }

  get value() { return this.getAttribute('value') ?? 'on'; }
  set value(value: string) { this.setAttribute('value', value); }

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
    this.controlInput?.focus(options);
  }

  formDisabledCallback(disabled: boolean): void {
    this.#disabledByForm = disabled;
    this.#synchronizeForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.#dirtyChecked = false;
    this.#checked = this.defaultChecked;
    this.checkedUpdated();
    this.#synchronizeForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (state === 'checked' || state === 'unchecked') {
      this.checked = state === 'checked';
    }
  }

  protected get controlInput(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector('input') ?? null;
  }

  protected get controlDisabled() { return this.disabled || this.#disabledByForm; }
  protected get isMixed() { return false; }
  protected get inputRole(): 'switch' | undefined { return undefined; }

  protected checkedUpdated(): void {}
  protected updateMixed(_value: boolean): void {}

  #synchronizeForm(): void {
    this.#internals.setFormValue(this.checked ? this.value : null, this.checked ? 'checked' : 'unchecked');
    const valueMissing = this.required && !this.checked && !this.controlDisabled;
    const customError = Boolean(this.#customMessage) && !this.controlDisabled;
    const input = this.controlInput;
    if (input) {
      input.checked = this.checked;
      input.indeterminate = this.isMixed;
      input.disabled = this.controlDisabled;
      input.required = this.required;
    }

    if (!valueMissing && !customError) {
      this.#internals.setValidity({});
      return;
    }

    this.#internals.setValidity(
      { valueMissing, customError },
      this.#customMessage || input?.validationMessage || 'Please select this option.',
      input ?? undefined,
    );
  }

  #accessibleLabel(): string | undefined {
    const referenceIds = this.getAttribute('aria-labelledby')?.trim().split(/\s+/) ?? [];
    if (referenceIds.length) {
      const root = this.getRootNode();
      if (root instanceof Document || root instanceof ShadowRoot) {
        const text = referenceIds.map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
        if (text) return text;
      }
    }

    const ariaLabel = this.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    if (this.label || this.textContent?.trim()) return undefined;

    return Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ') || undefined;
  }

  #onInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.updateMixed(input.indeterminate);
    this.checked = input.checked;
  }

  #onChange(event: Event): void {
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  protected renderControl(mark: TemplateResult, state: TemplateResult | typeof nothing = nothing) {
    return html`
      <label class="choice" part="control">
        <input class="choice-input" part="input" type="checkbox"
          role=${ifDefined(this.inputRole)} aria-label=${ifDefined(this.#accessibleLabel())}
          .checked=${live(this.checked)} .indeterminate=${live(this.isMixed)}
          ?disabled=${this.controlDisabled} ?required=${this.required}
          @input=${this.#onInput} @change=${this.#onChange}>
        ${mark}
        <span class="choice-label" part="label"><slot @slotchange=${() => this.requestUpdate()}>${this.label}</slot>${state}</span>
      </label>
    `;
  }
}
