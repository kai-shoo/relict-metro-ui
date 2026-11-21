import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { keyed } from 'lit/directives/keyed.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export interface MetroFileRequestDetail { requestId: number; contextKey: string }
export interface MetroFileSelectDetail extends MetroFileRequestDetail { files: readonly File[] }
interface FileRequest extends MetroFileRequestDetail { generation: number }

const manual = { attribute: false, noAccessor: true } as const;
const observed = ['context-key', 'name', 'required', 'disabled', 'aria-label', 'aria-labelledby', 'aria-invalid'];

export class MetroFilePicker extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    accept: { type: String },
    multiple: { type: Boolean },
    capture: { type: String },
    label: { type: String },
    chooseLabel: { type: String, attribute: 'choose-label' },
    emptyLabel: { type: String, attribute: 'empty-label' },
    contextKey: manual,
    name: manual,
    required: manual,
    disabled: manual,
  };

  static override get observedAttributes() { return [...super.observedAttributes, ...observed]; }

  static override styles = [metroTheme, css`
    :host { display: inline-block; min-inline-size: 0; max-inline-size: 100%; color: var(--_metro-fg); }
    .field { display: grid; gap: .375rem; justify-items: start; padding-inline: var(--_metro-space); }
    .label { color: var(--_metro-muted); font-size: 1.25rem; overflow-wrap: anywhere; }
    .label[hidden] { display: none; }
    .pick { position: relative; max-inline-size: 100%; cursor: pointer; }
    input { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; margin: 0; opacity: 0; cursor: inherit; }
    .button {
      display: inline-flex;
      align-items: center;
      box-sizing: border-box;
      min-block-size: 3rem;
      padding: .25rem .625rem;
      border: 3px solid currentColor;
      color: inherit;
      font: 600 1.4167rem / 1.2 var(--_metro-font);
      overflow-wrap: anywhere;
    }
    input:focus-visible + .button { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .pick:active .button { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .pick:has(input:disabled) { color: var(--_metro-disabled); cursor: default; }
    .pick:has(input:disabled):active .button { background: transparent; color: inherit; }
    .summary { margin: 0; min-inline-size: 0; color: var(--_metro-muted); overflow-wrap: anywhere; }
    @media (forced-colors: active) { input:focus-visible + .button { outline-color: Highlight; } }
  `];

  declare accept: string;
  declare multiple: boolean;
  declare capture: string | null;
  declare label: string;
  declare chooseLabel: string;
  declare emptyLabel: string;

  #internals = this.attachInternals();
  #selected: readonly File[] = [];
  #fieldsetDisabled = false;
  #customMessage = '';
  #sequence = 0;
  #generation = 0;
  #inputKey = 0;
  #request: FileRequest | undefined;

  constructor() {
    super();
    this.accept = '';
    this.multiple = false;
    this.capture = null;
    this.label = '';
    this.chooseLabel = 'Choose files';
    this.emptyLabel = 'No files selected';
    this.addEventListener('click', event => {
      if (event.defaultPrevented || event.composedPath()[0] !== this) return;
      this.focus();
      this.#input?.click();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncForm();
  }

  override disconnectedCallback(): void {
    this.#generation++;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;
    if (name === 'context-key') this.#generation++;
    if (name === 'disabled' && this.disabled) this.#generation++;
    this.#syncForm();
    this.requestUpdate();
  }

  protected override updated(): void { this.#syncForm(); }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get contextKey() { return this.getAttribute('context-key') ?? ''; }
  set contextKey(value: string) { this.setAttribute('context-key', value); }

  get files(): readonly File[] { return [...this.#selected]; }
  get pickerAvailable(): boolean { return this.#input?.type === 'file'; }
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

  override focus(options?: FocusOptions): void { this.#input?.focus(options); }
  override blur(): void { this.#input?.blur(); }

  formResetCallback(): void { this.clear(); }
  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled;
    if (disabled) this.#generation++;
    this.#syncForm();
    this.requestUpdate();
  }

  clear(): void {
    this.#generation++;
    this.#selected = [];
    if (this.#input) this.#input.value = '';
    this.#syncForm();
    this.requestUpdate();
  }

  showPicker(): boolean {
    let input = this.#input;
    if (!input || !this.pickerAvailable || !this.isConnected || this.#controlDisabled || this.#currentRequest) return false;
    if (this.#request) {
      // A file input reports completion without a request ID. Retire it before opening a newer request.
      const wasFocused = this.shadowRoot?.activeElement === input;
      this.#request = undefined;
      this.#inputKey++;
      this.requestUpdate();
      this.performUpdate();
      input = this.#input;
      if (!input) return false;
      if (wasFocused) input.focus({ preventScroll: true });
    }
    input.accept = this.accept;
    input.multiple = this.multiple;
    if (this.capture === null) input.removeAttribute('capture');
    else input.setAttribute('capture', this.capture);
    if (typeof input.showPicker !== 'function') {
      input.click();
      return Boolean(this.#currentRequest);
    }
    this.#begin();
    try {
      input.showPicker();
      return true;
    } catch {
      this.#request = undefined;
      return false;
    }
  }

  get #input() { return this.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null; }
  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }
  get #currentRequest() { return this.#request?.generation === this.#generation ? this.#request : undefined; }

  #begin(): FileRequest {
    const request = { requestId: ++this.#sequence, contextKey: this.contextKey, generation: this.#generation };
    this.#request = request;
    return request;
  }

  #onClick(event: MouseEvent): void {
    if (event.defaultPrevented || this.#controlDisabled || this.#currentRequest) {
      event.preventDefault();
      return;
    }
    if (this.#request) {
      event.preventDefault();
      this.showPicker();
      return;
    }
    const request = this.#begin();
    queueMicrotask(() => {
      if (event.defaultPrevented && this.#request === request) this.#request = undefined;
    });
  }

  #complete(event: Event): void {
    event.stopPropagation();
    const input = event.currentTarget as HTMLInputElement;
    if (input !== this.#input) {
      input.value = '';
      return;
    }
    const request = this.#request ?? this.#begin();
    this.#request = undefined;
    if (!this.isConnected || this.#controlDisabled || request.generation !== this.#generation) {
      input.value = '';
      return;
    }
    const detail = { requestId: request.requestId, contextKey: request.contextKey };
    if (event.type === 'cancel') {
      this.dispatchEvent(new CustomEvent<MetroFileRequestDetail>('metro-file-cancel', { detail, bubbles: true, composed: true }));
      return;
    }
    this.#selected = Array.from(input.files ?? []);
    const files = this.files;
    this.#syncForm();
    this.requestUpdate();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent<MetroFileSelectDetail>('metro-file-select', {
      detail: { ...detail, files }, bubbles: true, composed: true,
    }));
  }

  #syncForm(): void {
    const input = this.#input;
    const disabled = this.#controlDisabled;
    if (input) input.disabled = disabled;
    let data: FormData | null = null;
    if (this.name && this.#selected.length) {
      data = new FormData();
      for (const file of this.#selected) data.append(this.name, file);
    }
    this.#internals.setFormValue(data, null);
    const valueMissing = this.required && !this.#selected.length && !disabled;
    const customError = Boolean(this.#customMessage) && !disabled;
    if (valueMissing || customError) {
      this.#internals.setValidity(
        { valueMissing, customError }, this.#customMessage || 'Choose a file.',
        input ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  #accessibleLabel(hasLabel: boolean): string | undefined {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const names = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    const explicit = this.getAttribute('aria-label');
    if (explicit || hasLabel) return explicit || undefined;
    return Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ') || this.chooseLabel;
  }

  protected override render() {
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    return html`
      <div class="field" part="control">
        <label class="label" part="label" for="picker" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <span class="pick" part="pick">
          ${keyed(this.#inputKey, html`<input type="file" id="picker" part="input" accept=${this.accept} ?multiple=${this.multiple}
            capture=${ifDefined(this.capture ?? undefined)} ?disabled=${this.#controlDisabled} ?required=${this.required}
            aria-label=${ifDefined(this.#accessibleLabel(hasLabel))} aria-describedby="files"
            aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
            @click=${this.#onClick} @input=${(event: Event) => event.stopPropagation()}
            @change=${this.#complete} @cancel=${this.#complete}>`)}
          <span class="button" part="button" aria-hidden="true">${this.chooseLabel}</span>
        </span>
        <p class="summary" id="files" part="summary" role="status">
          ${this.#selected.length ? this.#selected.map(file => file.name).join(', ') : this.emptyLabel}
        </p>
      </div>
    `;
  }
}

defineElement('metro-file-picker', MetroFilePicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-file-picker': MetroFilePicker }
  interface HTMLElementEventMap {
    'metro-file-select': CustomEvent<MetroFileSelectDetail>;
    'metro-file-cancel': CustomEvent<MetroFileRequestDetail>;
  }
}
