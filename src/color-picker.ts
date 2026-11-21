import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './dialog.js';
import type { MetroDialogCloseEvent } from './dialog.js';
import { metroTheme } from './theme.js';

export interface MetroColorSwatch {
  value: string;
  label: string;
}

const accents = [
  ['#a4c400', 'Lime'], ['#60a917', 'Green'], ['#008a00', 'Emerald'], ['#00aba9', 'Teal'],
  ['#1ba1e2', 'Cyan'], ['#0050ef', 'Cobalt'], ['#6a00ff', 'Indigo'], ['#aa00ff', 'Violet'],
  ['#f472d0', 'Pink'], ['#d80073', 'Magenta'], ['#a20025', 'Crimson'], ['#e51400', 'Red'],
  ['#fa6800', 'Orange'], ['#f0a30a', 'Amber'], ['#e3c800', 'Yellow'], ['#825a2c', 'Brown'],
  ['#6d8764', 'Olive'], ['#647687', 'Steel'], ['#76608a', 'Mauve'], ['#a0522d', 'Sienna'],
];

const channels = ['red', 'green', 'blue'] as const;
type Channel = typeof channels[number];

const observed = ['value', 'name', 'required', 'disabled', 'aria-label', 'aria-labelledby', 'aria-invalid'];
const manual = { attribute: false, noAccessor: true } as const;

function parseHex(value: string): string {
  const hex = String(value).trim().replace(/^#/, '').toLowerCase();
  if (/^[\da-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[\da-f]{3}$/.test(hex)) return `#${Array.from(hex, digit => digit + digit).join('')}`;
  return '';
}

function parseChannel(value: string): number | null {
  return /^\d{1,3}$/.test(value) && Number(value) <= 255 ? Number(value) : null;
}

export class MetroColorPicker extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    value: manual,
    defaultValue: manual,
    name: manual,
    required: manual,
    disabled: manual,
    label: { type: String },
    placeholder: { type: String },
    palette: { attribute: false },
    dialogLabel: { type: String, attribute: 'dialog-label' },
    paletteLabel: { type: String, attribute: 'palette-label' },
    previewLabel: { type: String, attribute: 'preview-label' },
    hexLabel: { type: String, attribute: 'hex-label' },
    redLabel: { type: String, attribute: 'red-label' },
    greenLabel: { type: String, attribute: 'green-label' },
    blueLabel: { type: String, attribute: 'blue-label' },
    applyLabel: { type: String, attribute: 'apply-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    clearLabel: { type: String, attribute: 'clear-label' },
    invalidLabel: { type: String, attribute: 'invalid-label' },
  };

  static override get observedAttributes() { return [...super.observedAttributes, ...observed]; }

  static override styles = [metroTheme, css`
    :host { display: inline-block; min-inline-size: 0; max-inline-size: 100%; color: var(--_metro-fg); }
    .field { display: grid; padding-inline: var(--_metro-space); }
    .label { margin-block-end: .25rem; color: var(--_metro-muted); font-size: 1.25rem; overflow-wrap: anywhere; }
    .label[hidden] { display: none; }
    .field:has(.trigger:disabled) .label { color: var(--_metro-disabled); }

    .trigger {
      box-sizing: border-box;
      max-inline-size: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .25rem min(var(--_metro-space), 6%);
      min-block-size: var(--metro-picker-height, 72px);
      padding: .25rem min(var(--_metro-space), 6%);
      border: 3px solid var(--metro-picker-border, currentColor);
      border-radius: 0;
      background: var(--metro-picker-bg, transparent);
      color: inherit;
      font: 400 1.5833rem / 1.3 var(--_metro-font);
      text-align: start;
      cursor: pointer;
    }
    .trigger:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .trigger[aria-expanded="true"] { border-color: var(--_metro-accent); }
    .trigger:disabled { color: var(--_metro-disabled); border-color: currentColor; cursor: default; }

    .sample, .preview {
      display: block;
      box-sizing: border-box;
      border: 2px solid currentColor;
      background: var(--_sample, transparent);
    }
    .sample { flex: none; inline-size: 2rem; block-size: 2rem; }
    #value { min-inline-size: 0; overflow-wrap: anywhere; }
    #value[data-hex] {
      flex: 1 1 7ch;
      min-inline-size: min(100%, 7ch);
      container-type: inline-size;
      contain-intrinsic-inline-size: 7ch;
    }
    #value[data-hex] > span {
      font-size: min(1em, 21cqi);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .preview { block-size: 3rem; margin-block-end: .5rem; }

    .palette {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(44px, 100%), 1fr));
      gap: .25rem;
      margin-block: .5rem var(--_metro-space);
    }

    .swatch {
      box-sizing: border-box;
      appearance: none;
      inline-size: 100%;
      block-size: 44px;
      margin: 0;
      border: 2px solid var(--_metro-border);
      border-radius: 0;
      background: var(--_sample);
      cursor: pointer;
    }
    .swatch:checked {
      box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px #000;
      border-color: currentColor;
    }

    #picker::part(surface) {
      max-inline-size: calc(100% - 1rem);
      padding: min(calc(var(--_metro-space) * 2), 5vi);
    }
    .fields, .channels { display: grid; gap: .5rem; }
    .channels { grid-template-columns: repeat(auto-fit, minmax(min(5rem, 100%), 1fr)); }
    .fields label { display: grid; gap: .25rem; min-inline-size: 0; font-size: 1rem; overflow-wrap: anywhere; }
    .edit {
      box-sizing: border-box;
      scroll-margin-block: .5rem;
      min-inline-size: 0;
      inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem .5rem;
      border: 3px solid transparent;
      border-radius: 0;
      background: var(--metro-input-bg, var(--_metro-input-bg));
      color: var(--metro-input-fg, var(--_metro-input-fg));
      font: 400 1.25rem / 1.2 var(--_metro-font);
    }
    .edit:focus {
      border-color: var(--_metro-accent);
      background: var(--metro-input-focus-bg, light-dark(transparent, #fff));
      outline: none;
    }
    .trigger:focus-visible, .swatch:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .status { margin-block: .5rem 0; color: var(--_metro-muted); font-size: 1rem; overflow-wrap: anywhere; }
    .status:empty { margin: 0; }

    @media (forced-colors: active) {
      .sample, .preview, .swatch { forced-color-adjust: none; border-color: ButtonText; }
      .trigger:focus-visible, .swatch:focus-visible { outline-color: Highlight; }
      .edit { border-color: ButtonText; }
      .edit:focus { border-color: Highlight; }
    }
  `];

  declare label: string;
  declare placeholder: string;
  declare palette: readonly MetroColorSwatch[];
  declare dialogLabel: string;
  declare paletteLabel: string;
  declare previewLabel: string;
  declare hexLabel: string;
  declare redLabel: string;
  declare greenLabel: string;
  declare blueLabel: string;
  declare applyLabel: string;
  declare cancelLabel: string;
  declare clearLabel: string;
  declare invalidLabel: string;

  #internals = this.attachInternals();
  #current: string | undefined;
  #opened = false;
  #session = 0;
  #fieldsetDisabled = false;
  #customMessage = '';
  #candidate = '#000000';
  #preview = '#000000';
  #hex = '#000000';
  #rgb: Record<Channel, string> = { red: '0', green: '0', blue: '0' };

  constructor() {
    super();
    this.label = '';
    this.placeholder = 'Choose a color';
    this.palette = accents.map(([value, label]) => ({ value, label }));
    this.dialogLabel = 'Choose a color';
    this.paletteLabel = 'Accent colors';
    this.previewLabel = 'Color preview';
    this.hexLabel = 'HEX';
    this.redLabel = 'Red';
    this.greenLabel = 'Green';
    this.blueLabel = 'Blue';
    this.applyLabel = 'Apply';
    this.cancelLabel = 'Cancel';
    this.clearLabel = 'Clear';
    this.invalidLabel = 'Enter a 3- or 6-digit HEX color or RGB channels from 0 to 255.';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncForm();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#opened = false;
    this.#session++;
    const dialog = this.#dialog;
    if (dialog) dialog.open = false;
    this.requestUpdate();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;
    this.#syncForm();
    this.requestUpdate();
  }

  protected override updated(): void { this.#syncForm(); }

  get value() { return this.#current ?? parseHex(this.defaultValue); }
  set value(value: string) {
    this.#current = parseHex(value);
    this.#syncForm();
    this.requestUpdate();
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }
  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get open() { return this.#opened; }
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

  override focus(options?: FocusOptions): void { this.#trigger?.focus(options); }
  override blur(): void { this.#trigger?.blur(); }

  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled;
    this.#syncForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.close();
    this.#current = undefined;
    this.#syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  showPicker(): void {
    if (this.#opened || this.#controlDisabled || !this.isConnected) return;
    this.#writeDraft(this.value || '#000000');
    this.#opened = true;
    const session = ++this.#session;
    this.requestUpdate();
    void this.#present(session);
  }

  close(): void {
    if (!this.#opened) return;
    if (this.#dialog?.close()) return;
    this.#opened = false;
    this.#session++;
    this.requestUpdate();
  }

  async #present(session: number): Promise<void> {
    await this.updateComplete;
    const dialog = this.#dialog;
    if (!dialog || session !== this.#session || !this.#opened || this.#controlDisabled || !this.isConnected) return;
    dialog.show(this.#trigger ?? undefined);
    await dialog.updateComplete;
    if (session === this.#session && this.#opened) {
      const editor = this.shadowRoot?.querySelector<HTMLInputElement>('#hex');
      editor?.focus({ preventScroll: true });
      editor?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  get #trigger() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger') ?? null; }
  get #dialog() { return this.shadowRoot?.querySelector('metro-dialog') ?? null; }
  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }

  #syncForm(): void {
    const value = this.value;
    const disabled = this.#controlDisabled;
    const trigger = this.#trigger;
    if (trigger) trigger.disabled = disabled;
    if (disabled && this.#opened) this.close();
    this.#internals.setFormValue(value, value);
    const valueMissing = !disabled && this.required && !value;
    const customError = !disabled && Boolean(this.#customMessage);
    if (valueMissing || customError) {
      this.#internals.setValidity(
        { valueMissing, customError },
        this.#customMessage || 'Choose a color.',
        trigger ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  #writeDraft(color: string, rawHex = color): void {
    this.#candidate = color;
    this.#preview = color;
    this.#hex = rawHex;
    channels.forEach((channel, index) => {
      this.#rgb[channel] = String(parseInt(color.slice(index * 2 + 1, index * 2 + 3), 16));
    });
  }

  #onHex(event: Event): void {
    const raw = (event.currentTarget as HTMLInputElement).value;
    const color = parseHex(raw);
    if (color) this.#writeDraft(color, raw);
    else {
      this.#hex = raw;
      this.#candidate = '';
    }
    this.requestUpdate();
  }

  #onChannel(channel: Channel, value: string): void {
    this.#rgb[channel] = value;
    const values = channels.map(name => parseChannel(this.#rgb[name]));
    if (values.includes(null)) this.#candidate = '';
    else {
      this.#candidate = `#${values.map(component => Number(component).toString(16).padStart(2, '0')).join('')}`;
      this.#hex = this.#candidate;
      this.#preview = this.#candidate;
    }
    this.requestUpdate();
  }

  #onDraftEvent(event: Event): void { event.stopPropagation(); }

  #onKeydown(event: KeyboardEvent): void {
    const input = event.target;
    if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229 || !this.#candidate
      || !(input instanceof HTMLInputElement) || input.type === 'radio') return;
    event.preventDefault();
    this.shadowRoot?.querySelector<HTMLButtonElement>('[data-metro-value="apply"]')?.click();
  }

  #onClose(event: MetroDialogCloseEvent): void {
    event.stopPropagation();
    this.#opened = false;
    this.#session++;
    this.requestUpdate();
    if (event.detail.reason !== 'action' || this.#controlDisabled) return;
    const next = event.detail.value === 'apply' && this.#candidate ? this.#candidate
      : event.detail.value === 'clear' && !this.required ? '' : undefined;
    if (next === undefined || next === this.value) return;
    this.value = next;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #accessibleLabel(hasLabel: boolean): string {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const names = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    return this.getAttribute('aria-label')
      || (!hasLabel && Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' '))
      || '';
  }

  #swatches() {
    const swatches = new Map<string, MetroColorSwatch>();
    for (const swatch of this.palette) {
      const value = parseHex(swatch.value);
      if (value && !swatches.has(value)) swatches.set(value, { value, label: swatch.label || value });
    }
    return [...swatches.values()];
  }

  #renderDialog() {
    const swatches = this.#swatches();
    return html`
      <metro-dialog id="picker" .label=${this.dialogLabel} exportparts="surface:dialog, heading:dialog-heading, actions"
        @metro-before-close=${(event: Event) => event.stopPropagation()} @metro-close=${this.#onClose}>
        <div @input=${this.#onDraftEvent} @change=${this.#onDraftEvent} @keydown=${this.#onKeydown}>
          <div class="preview" part="preview" role="img" aria-label=${`${this.previewLabel}, ${this.#preview}`}
            style=${`--_sample: ${this.#preview}`}></div>
          ${swatches.length ? html`
            <div class="palette" part="palette" role="radiogroup" aria-label=${this.paletteLabel}>
              ${repeat(swatches, swatch => swatch.value, swatch => html`
                <input class="swatch" part="swatch" type="radio" name="palette"
                  aria-label=${swatch.label} title=${swatch.label}
                  style=${`--_sample: ${swatch.value}`} .checked=${live(this.#candidate === swatch.value)}
                  @input=${() => { this.#writeDraft(swatch.value); this.requestUpdate(); }}>
              `)}
            </div>
          ` : null}
          <div class="fields">
            <label>${this.hexLabel}
              <input class="edit" id="hex" part="hex" type="text" spellcheck="false" autocomplete="off" autocapitalize="off"
                aria-invalid=${String(!parseHex(this.#hex))} .value=${live(this.#hex)} @input=${this.#onHex}>
            </label>
            <div class="channels">
              ${channels.map(channel => html`
                <label>${this[`${channel}Label`]}
                  <input class="edit" part="channel" type="number" inputmode="numeric" min="0" max="255" step="1"
                    aria-invalid=${String(parseChannel(this.#rgb[channel]) === null)}
                    .value=${live(this.#rgb[channel])}
                    @input=${(event: Event) => this.#onChannel(channel, (event.currentTarget as HTMLInputElement).value)}>
                </label>
              `)}
            </div>
          </div>
          <p class="status" part="status" role="status">${this.#candidate ? '' : this.invalidLabel}</p>
        </div>
        ${!this.required && this.value ? html`
          <button type="button" slot="actions" part="clear" data-metro-value="clear">${this.clearLabel}</button>
        ` : null}
        <button type="button" slot="actions" part="cancel" data-metro-value="cancel">${this.cancelLabel}</button>
        <button type="button" slot="actions" part="apply" data-metro-value="apply" ?disabled=${!this.#candidate}>${this.applyLabel}</button>
      </metro-dialog>
    `;
  }

  protected override render() {
    const value = this.value;
    const text = value || this.placeholder;
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const label = this.#accessibleLabel(hasLabel);
    return html`
      <div class="field">
        <label class="label" id="label" part="label" for="trigger" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <button type="button" class="trigger" id="trigger" part="trigger"
          aria-haspopup="dialog" aria-controls=${ifDefined(this.#opened ? 'picker' : undefined)} aria-expanded=${String(this.#opened)}
          aria-label=${ifDefined(label ? `${label}, ${text}` : undefined)}
          aria-labelledby=${ifDefined(hasLabel && !label ? 'label value' : undefined)}
          aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
          ?disabled=${this.#controlDisabled} @click=${this.showPicker}>
          <span class="sample" part="sample" aria-hidden="true" style=${`--_sample: ${value || 'transparent'}`}></span>
          <span id="value" part="value" ?data-hex=${Boolean(value)}>${value ? html`<span>${value}</span>` : text}</span>
        </button>
      </div>
      ${this.#opened ? this.#renderDialog() : null}
    `;
  }
}

defineElement('metro-color-picker', MetroColorPicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-color-picker': MetroColorPicker; }
}
