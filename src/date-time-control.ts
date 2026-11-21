import { LitElement, css, html, type PropertyDeclarations } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { dateLocale } from './calendar-date.js';
import './dialog.js';
import { formatPhoneDateTime, initialPhoneDateTime, phoneDateTimeColumns, shiftedColumnValue,
  type MetroDateTimeColumn, type MetroDateTimePickerLabels } from './phone-date-time.js';
import { PhonePickerWheels, phonePickerStyles } from './phone-picker-wheels.js';
import { metroTheme } from './theme.js';

type DateTimeType = 'date' | 'time';
export type { MetroDateTimePickerLabels } from './phone-date-time.js';
export type MetroDateTimePresentation = 'native' | 'phone';

const nativeAttributes = ['name', 'min', 'max', 'step', 'required', 'readonly', 'autocomplete', 'lang', 'aria-invalid'];
const observed = [...nativeAttributes, 'value', 'disabled', 'aria-label', 'aria-labelledby'];
const manualProperty = { attribute: false, noAccessor: true } as const;

export abstract class DateTimeControl extends LitElement {
  static readonly formAssociated = true;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    description: { type: String },
    presentation: { type: String, reflect: true },
    locale: { type: String },
    dialogLabel: { type: String, attribute: 'dialog-label' },
    applyLabel: { type: String, attribute: 'apply-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    placeholder: { type: String },
    pickerLabels: { attribute: false },
    value: manualProperty,
    defaultValue: manualProperty,
    min: manualProperty,
    max: manualProperty,
    step: manualProperty,
    name: manualProperty,
    disabled: manualProperty,
    required: manualProperty,
    readOnly: manualProperty,
    autocomplete: manualProperty,
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...observed];
  }

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      max-inline-size: 100%;
      color: var(--_metro-fg);
    }

    .field { display: grid; padding-inline: var(--_metro-space); }
    .label, .description { color: var(--_metro-muted); overflow-wrap: anywhere; }
    .label { margin-block-end: 0.25rem; font-size: 1.25rem; }
    .description { margin-block-start: 0.25rem; font-size: 0.9375rem; }
    [hidden] { display: none; }

    .input {
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: var(--metro-picker-height, 72px);
      padding: 0.25rem var(--_metro-space);
      border: 3px solid var(--metro-picker-border, currentColor);
      border-radius: 0;
      background: var(--metro-picker-bg, transparent);
      color: var(--metro-picker-fg, var(--_metro-fg));
      font: 400 1.5833rem / 1.3 var(--_metro-font);
    }

    .input:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .input:focus-within { border-color: var(--_metro-accent); }
    .input:read-only:enabled { color: var(--_metro-muted); }
    .input:disabled { color: var(--_metro-disabled); border-color: currentColor; opacity: 1; }
    .field:has(.input:disabled) :is(.label, .description) { color: var(--_metro-disabled); }

    @media (forced-colors: active) {
      .input:focus-visible { outline-color: Highlight; }
      .input:focus-within { border-color: Highlight; }
      .input:disabled { border-color: GrayText; }
    }
  `, phonePickerStyles];

  declare label: string;
  declare description: string;
  declare presentation: MetroDateTimePresentation;
  declare locale: string;
  declare dialogLabel: string;
  declare applyLabel: string;
  declare cancelLabel: string;
  declare placeholder: string;
  declare pickerLabels: MetroDateTimePickerLabels;
  #internals = this.attachInternals();
  #input: HTMLInputElement;
  #dirty = false;
  #fieldsetDisabled = false;
  #draft: string | undefined;
  #focusedWheel: HTMLElement | undefined;
  #wheels = new PhonePickerWheels((id, amount) => this.#changeDraft(id, amount));

  constructor(type: DateTimeType) {
    super();
    this.label = '';
    this.description = '';
    this.presentation = 'native';
    this.locale = '';
    this.dialogLabel = '';
    this.applyLabel = 'Done';
    this.cancelLabel = 'Cancel';
    this.placeholder = type === 'date' ? 'Choose a date' : 'Choose a time';
    this.pickerLabels = {};
    this.#input = this.ownerDocument.createElement('input');
    this.#input.type = type;
    this.#input.id = 'value';
    this.#input.className = 'input';
    this.#input.part.add('input');
    this.#input.addEventListener('input', event => this.#onEdit(event));
    this.#input.addEventListener('change', event => this.#onEdit(event));
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.#syncForm();
  }

  override disconnectedCallback() {
    this.closePicker();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null) {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;

    if (name === 'value') {
      if (next === null) this.#input.removeAttribute('value');
      else this.#input.defaultValue = next;
      if (!this.#dirty) {
        this.closePicker();
        this.#input.value = this.defaultValue;
      }
    } else if (nativeAttributes.includes(name)) {
      if (next === null) this.#input.removeAttribute(name);
      else this.#input.setAttribute(name, next);
    }
    this.#syncForm();
    this.requestUpdate();
  }

  get value() { return this.#input.value; }
  set value(value: string) {
    if (value !== this.value) this.closePicker();
    this.#dirty = true;
    this.#input.value = String(value);
    this.#syncForm();
    this.requestUpdate();
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }
  get min() { return this.getAttribute('min') ?? ''; }
  set min(value: string) { this.setAttribute('min', value); }
  get max() { return this.getAttribute('max') ?? ''; }
  set max(value: string) { this.setAttribute('max', value); }
  get step(): number | 'any' {
    const step = this.getAttribute('step');
    if (step === 'any') return step;
    const number = Number(step);
    return number > 0 && Number.isFinite(number) ? number : this.#input.type === 'date' ? 1 : 60;
  }
  set step(value: number | 'any') { this.setAttribute('step', String(value)); }
  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(value: boolean) { this.toggleAttribute('readonly', value); }
  get autocomplete() { return this.getAttribute('autocomplete') ?? ''; }
  set autocomplete(value: string) { this.setAttribute('autocomplete', value); }

  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  setCustomValidity(message: string) {
    this.#input.setCustomValidity(message);
    this.#syncForm();
  }

  get pickerOpen() { return this.#draft !== undefined; }

  showPicker() {
    if (this.presentation !== 'phone') {
      this.#input.showPicker?.();
      return;
    }
    if (!this.isConnected || this.#input.disabled || this.readOnly || this.pickerOpen) return;
    this.#draft = initialPhoneDateTime(this.#input);
    this.requestUpdate();
  }

  closePicker() {
    if (!this.pickerOpen) return false;
    this.#wheels.clear();
    this.#draft = undefined;
    if (this.#dialog?.open) this.#dialog.close();
    this.requestUpdate();
    return true;
  }

  override focus(options?: FocusOptions) { (this.#trigger ?? this.#input).focus(options); }
  override blur() { (this.#trigger ?? this.#input).blur(); }

  formDisabledCallback(disabled: boolean) {
    this.#fieldsetDisabled = disabled;
    this.#syncForm();
    this.requestUpdate();
  }

  formResetCallback() {
    this.closePicker();
    this.#dirty = false;
    this.#input.value = this.defaultValue;
    this.#syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null) {
    if (typeof state === 'string') this.value = state;
  }

  #syncForm() {
    this.#input.disabled = this.disabled || this.#fieldsetDisabled;
    if (this.#input.disabled || this.readOnly || this.presentation !== 'phone') this.closePicker();
    const value = this.#input.value;
    this.#internals.setFormValue(value, value);
    if (this.#input.willValidate && !this.#input.validity.valid) {
      const anchor = this.#trigger ?? (this.shadowRoot?.contains(this.#input) ? this.#input : undefined);
      this.#internals.setValidity(this.#input.validity, this.#input.validationMessage, anchor);
    } else {
      this.#internals.setValidity({});
    }
  }

  #onEdit(event: Event) {
    this.#dirty = true;
    this.#syncForm();
    if (event.composed) return;
    event.stopPropagation();
    this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }));
  }

  #accessibleLabel(hasLabel: boolean): string {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const names = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    return this.getAttribute('aria-label') ||
      (!hasLabel && Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ')) || '';
  }

  get #trigger() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.phone-trigger'); }
  get #dialog() { return this.shadowRoot?.querySelector('metro-dialog'); }
  get #locale() { return dateLocale(this.locale, this); }

  #draftInput() {
    const input = this.#input.cloneNode() as HTMLInputElement;
    input.value = this.#draft ?? '';
    return input;
  }

  #columns() {
    return phoneDateTimeColumns(this.#input, this.#draft ?? '', this.#locale, this.step, this.pickerLabels);
  }

  #changeDraft(id: MetroDateTimeColumn, amount: number | 'first' | 'last') {
    if (!this.pickerOpen) return;
    const column = this.#columns().find(column => column.id === id);
    if (!column) return;
    const value = amount === 'first' ? column.min : amount === 'last' ? column.max :
      column.loop ? shiftedColumnValue(column, amount) : Math.max(column.min, Math.min(column.max, column.value + amount));
    if (value === undefined || value === column.value) return;
    this.#draft = column.change(value);
    this.requestUpdate();
  }

  #apply = () => {
    if (!this.#dialog || !this.pickerOpen) return;
    this.#wheels.settleAll(this.#dialog);
    const draft = this.#draftInput();
    if (!draft.value || !draft.validity.valid) return;
    this.closePicker();
    if (draft.value === this.value) return;
    this.value = draft.value;
    for (const type of ['input', 'change']) this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  };

  #closed = (event: Event) => {
    event.stopPropagation();
    this.closePicker();
  };

  protected override willUpdate() {
    const active = this.shadowRoot?.activeElement;
    this.#focusedWheel = active instanceof HTMLElement && active.matches('.wheel') ? active : undefined;
  }

  protected override updated() {
    this.#syncForm();
    const dialog = this.#dialog;
    const focusedWheel = this.#focusedWheel;
    this.#focusedWheel = undefined;
    if (this.pickerOpen && dialog && !dialog.open) {
      dialog.show(this.#trigger ?? undefined);
      void dialog.updateComplete.then(() => {
        if (!this.isConnected || !this.pickerOpen || !dialog.open) return;
        dialog.querySelector<HTMLElement>('.wheel')?.focus({ preventScroll: true });
        this.#wheels.centerAll(dialog);
        // Native modal autofocus can scroll a tall wheel over the picker title.
        dialog.shadowRoot?.querySelector('dialog')?.scrollTo({ top: 0, behavior: 'instant' });
      });
    } else if (this.pickerOpen && dialog?.open && focusedWheel && !this.shadowRoot?.activeElement) {
      const target = focusedWheel.isConnected ? focusedWheel : dialog.querySelector<HTMLElement>('.wheel');
      target?.focus();
    }
  }

  protected override render() {
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const hasDescription = Boolean(this.description || this.querySelector(':scope > [slot="description"]'));
    const accessibleLabel = this.#accessibleLabel(hasLabel);
    if (accessibleLabel) this.#input.setAttribute('aria-label', accessibleLabel);
    else this.#input.removeAttribute('aria-label');
    if (hasDescription) this.#input.setAttribute('aria-describedby', 'description');
    else this.#input.removeAttribute('aria-describedby');
    const phone = this.presentation === 'phone';
    this.#input.hidden = phone;

    return html`
      <div class="field" part="control">
        <label class="label" for=${phone ? 'phone-trigger' : 'value'} part="label" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        ${phone ? this.#phoneTrigger(hasLabel, accessibleLabel, hasDescription) : null}
        ${this.#input}
        <span class="description" id="description" part="description" ?hidden=${!hasDescription}>
          <slot name="description" @slotchange=${() => this.requestUpdate()}>${this.description}</slot>
        </span>
      </div>
      ${phone ? this.#phoneDialog(accessibleLabel) : null}
    `;
  }

  #phoneTrigger(hasLabel: boolean, accessibleLabel: string, hasDescription: boolean) {
    const value = this.value ? formatPhoneDateTime(this.#input, this.value, this.#locale) : this.placeholder;
    const name = accessibleLabel || (hasLabel ? undefined : this.placeholder);
    return html`
      <button id="phone-trigger" class="input phone-trigger" type="button" part="trigger"
        aria-haspopup="dialog" aria-expanded=${this.pickerOpen} ?disabled=${this.#input.disabled}
        aria-disabled=${this.readOnly ? 'true' : 'false'} aria-label=${ifDefined(name)}
        aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
        aria-describedby=${hasDescription ? 'phone-value description' : 'phone-value'} @click=${() => this.showPicker()}>
        <span id="phone-value" part="display-value">${value}</span><span class="phone-trigger-icon" aria-hidden="true"></span>
      </button>
    `;
  }

  #phoneDialog(accessibleLabel: string) {
    const slotted = this.querySelector(':scope > [slot="label"]')?.textContent?.trim();
    const title = this.dialogLabel || accessibleLabel || slotted || this.label || this.placeholder;
    const draft = this.pickerOpen ? this.#draftInput() : undefined;
    const invalid = Boolean(draft && (!draft.value || !draft.validity.valid));
    return html`
      <metro-dialog class="phone-dialog" exportparts="surface: picker-surface, heading: picker-heading, actions: picker-actions"
        .label=${title} @metro-close=${this.#closed} @metro-before-close=${(event: Event) => event.stopPropagation()}>
        ${draft ? this.#wheels.render(this.#columns()) : null}
        ${draft ? html`<p class="phone-picker-error" role="status" part="picker-status">${draft.validationMessage}</p>` : null}
        <button class="phone-action" part="apply" slot="actions" type="button" ?disabled=${invalid} @click=${this.#apply}>${this.applyLabel}</button>
        <button class="phone-action" part="cancel" slot="actions" type="button" @click=${this.closePicker}>${this.cancelLabel}</button>
      </metro-dialog>
    `;
  }
}
