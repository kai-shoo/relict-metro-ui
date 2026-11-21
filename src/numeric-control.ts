import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';

export const numericStyles = css`
  :host { display: block; color: var(--_metro-fg); max-inline-size: 100%; }
  .label { display: block; margin-block-end: 0.25rem; overflow-wrap: anywhere; }
  .label:empty, .label[hidden] { display: none; }
  .label[data-disabled] { color: var(--_metro-disabled); }
`;

export function parseNumber(value: string | null): number | null {
  if (value === null || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function roundNumber(value: number): number {
  return Number(value.toPrecision(15));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface NumericValidity {
  flags: ValidityStateFlags;
  message: string;
}

const observed = ['value', 'min', 'max', 'step', 'disabled', 'readonly', 'required', 'aria-label', 'aria-labelledby'];
export const manualProperty = { attribute: false, noAccessor: true } as const;

export abstract class NumericControl<T extends number | null> extends LitElement {
  static readonly formAssociated = true;
  static override properties: PropertyDeclarations = {
    label: { type: String },
    value: manualProperty,
    defaultValue: manualProperty,
    name: manualProperty,
    disabled: manualProperty,
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...observed];
  }

  declare label: string;
  #internals = this.attachInternals();
  #value: T | undefined;
  #fieldsetDisabled = false;
  #customError = '';
  #slotLabel = false;

  constructor() {
    super();
    this.label = '';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && !this.controlDisabled && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.syncForm();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null) {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;
    if (name === 'value' && this.#value === undefined) this.valueUpdated();
    if (this.#value !== undefined && ['min', 'max', 'step'].includes(name)) {
      this.#value = this.normalizeValue(this.#value);
    }
    this.syncForm();
    this.requestUpdate();
  }

  protected override updated() { this.syncForm(); }

  get value(): T { return this.#value === undefined ? this.defaultValue : this.#value; }
  set value(value: T) {
    this.#value = this.normalizeValue(value);
    this.valueUpdated();
    this.syncForm();
    this.requestUpdate();
  }

  get defaultValue(): T { return this.normalizeValue(this.numberAttribute('value')); }
  set defaultValue(value: T) { this.setNumberAttribute('value', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  setCustomValidity(message: string) {
    this.#customError = String(message);
    this.syncForm();
    this.requestUpdate();
  }

  override focus(options?: FocusOptions) { this.input?.focus(options); }

  formDisabledCallback(disabled: boolean) {
    this.#fieldsetDisabled = disabled;
    this.syncForm();
    this.requestUpdate();
  }

  formResetCallback() {
    this.#value = undefined;
    this.valueUpdated();
    this.syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null) {
    if (typeof state === 'string') this.value = this.normalizeValue(parseNumber(state));
  }

  protected get input() { return this.shadowRoot?.querySelector('input') ?? null; }
  protected get controlDisabled() { return this.#fieldsetDisabled || this.disabled; }
  protected get controlReadOnly() { return false; }
  protected get submittableValue() { return this.value === null ? null : String(this.value); }
  protected abstract normalizeValue(value: number | null): T;
  protected valueUpdated() {}
  protected localValidity(): NumericValidity | undefined { return undefined; }

  protected syncForm() {
    this.#internals.setFormValue(this.submittableValue, this.value === null ? '' : String(this.value));
    const error = this.controlDisabled || this.controlReadOnly ? undefined : this.localValidity();
    if (this.#customError && !this.controlDisabled && !this.controlReadOnly) {
      this.#internals.setValidity({ ...error?.flags, customError: true }, this.#customError, this.input ?? undefined);
    } else if (error) {
      this.#internals.setValidity(error.flags, error.message, this.input ?? undefined);
    } else {
      this.#internals.setValidity({});
    }
  }

  protected numberAttribute(name: string) { return parseNumber(this.getAttribute(name)); }
  protected setNumberAttribute(name: string, value: number | null) {
    if (value !== null && Number.isFinite(value)) this.setAttribute(name, String(value));
    else this.removeAttribute(name);
  }

  protected accessibleLabel(): string | typeof nothing {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const text = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (text) return text;
    }
    return this.getAttribute('aria-label') ||
      (!this.label && !this.#slotLabel && Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ')) ||
      nothing;
  }

  protected renderLabel() {
    return html`<label class="label" part="label" for="number" ?hidden=${!this.label && !this.#slotLabel}
      ?data-disabled=${this.controlDisabled}>
      <slot name="label" @slotchange=${(event: Event) => {
        this.#slotLabel = (event.currentTarget as HTMLSlotElement).assignedNodes({ flatten: true })
          .some(node => node.textContent?.trim());
        this.requestUpdate();
      }}>${this.label}</slot>
    </label>`;
  }

  protected emitValueEvent(type: 'input' | 'change') {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }
}
