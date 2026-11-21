import { css, html, nothing, type PropertyDeclarations } from 'lit';
import { live } from 'lit/directives/live.js';
import { defineElement } from './define.js';
import { clamp, manualProperty, NumericControl, numericStyles, parseNumber, roundNumber, type NumericValidity } from './numeric-control.js';
import { metroTheme } from './theme.js';

export class MetroNumberBox extends NumericControl<number | null> {
  static override properties: PropertyDeclarations = {
    min: manualProperty,
    max: manualProperty,
    step: manualProperty,
    required: manualProperty,
    readOnly: manualProperty,
    placeholder: { type: String },
    spinButtons: { attribute: 'spin-buttons', type: Boolean },
    incrementLabel: { attribute: 'increment-label', type: String },
    decrementLabel: { attribute: 'decrement-label', type: String },
  };

  static override styles = [metroTheme, numericStyles, css`
    .control { display: flex; flex-wrap: wrap; align-items: stretch; gap: 3px; }
    .step-buttons {
      display: flex;
      gap: 3px;
      max-inline-size: 100%;
      margin-inline-start: auto;
    }
    input {
      --_number-bg: var(--metro-number-box-background, light-dark(#00000026, #ffffffbf));
      flex: 1;
      box-sizing: border-box;
      inline-size: 0;
      min-inline-size: min(100%, calc(4ch + 1rem + 6px));
      min-block-size: 3rem;
      padding: 2px 0.5rem;
      border: 3px solid var(--_number-bg);
      border-radius: 0;
      background: var(--_number-bg);
      color: var(--metro-number-box-foreground, #111);
      font: inherit;
      font-size: 1.5833rem;
      background-clip: padding-box;
    }
    input:focus {
      outline: none;
      border-color: var(--_metro-accent);
      background-color: var(--metro-number-box-focus-background, light-dark(transparent, #fff));
    }
    input:read-only { color: var(--metro-number-box-readonly, #0009); }
    input:disabled { border-color: var(--_metro-disabled); color: var(--_metro-disabled); background: transparent; }
    input[aria-invalid] { border-color: var(--metro-status-error, light-dark(#a8001c, #ff8090)); }
    input::selection { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    button {
      display: grid;
      place-items: center;
      inline-size: 3rem;
      min-inline-size: 0;
      min-block-size: 3rem;
      border: 0;
      border-radius: 0;
      background: var(--_metro-chrome);
      color: inherit;
      font: inherit;
    }
    button:enabled:active { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    button:disabled { color: var(--_metro-disabled); }
    .error { display: block; margin-block-start: 0.25rem; color: var(--metro-status-error, light-dark(#a8001c, #ff8090)); }
    .error:empty { margin: 0; }
    @media (forced-colors: active) {
      input, button { border: 2px solid CanvasText; }
      input:focus, input[aria-invalid] { outline: 2px solid Highlight; outline-offset: 1px; }
      input:disabled, button:disabled { border-color: GrayText; }
    }
  `];

  declare placeholder: string;
  declare spinButtons: boolean;
  declare incrementLabel: string;
  declare decrementLabel: string;
  #draft: string | undefined;
  #showError = false;

  constructor() {
    super();
    this.placeholder = '';
    this.spinButtons = false;
    this.incrementLabel = 'Increase';
    this.decrementLabel = 'Decrease';
    this.addEventListener('invalid', () => {
      this.#showError = true;
      this.requestUpdate();
    });
  }

  get min() { return this.numberAttribute('min'); }
  set min(value: number | null) { this.setNumberAttribute('min', value); }
  get max() { return this.numberAttribute('max'); }
  set max(value: number | null) { this.setNumberAttribute('max', value); }
  get step(): number | 'any' {
    if (this.getAttribute('step') === 'any') return 'any';
    const value = this.numberAttribute('step');
    return value !== null && value > 0 ? value : 1;
  }
  set step(value: number | 'any') {
    if (value === 'any') this.setAttribute('step', value);
    else this.setNumberAttribute('step', value);
  }
  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(value: boolean) { this.toggleAttribute('readonly', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get draft() { return this.#draft ?? (this.value === null ? '' : String(this.value)); }

  stepUp(amount = 1) { this.value = this.#steppedValue(this.value, amount); }
  stepDown(amount = 1) { this.stepUp(-amount); }

  protected override get controlReadOnly() { return this.readOnly; }
  protected override normalizeValue(value: number | null) {
    return value !== null && Number.isFinite(value) ? value : null;
  }
  protected override valueUpdated() {
    this.#draft = undefined;
    this.#showError = false;
  }

  #readDraft(): number | null { return parseNumber(this.draft.replace(',', '.')); }

  protected override localValidity(): NumericValidity | undefined {
    const value = this.#readDraft();
    if (value === null) {
      if (this.draft.trim()) return { flags: { badInput: true }, message: 'Enter a number.' };
      if (this.required) return { flags: { valueMissing: true }, message: 'Enter a value.' };
      return undefined;
    }
    const { min, max, step } = this;
    const rangeUnderflow = min !== null && value < min;
    const rangeOverflow = max !== null && value > max;
    if (rangeUnderflow || rangeOverflow) {
      const message = min !== null && max !== null ? `Enter a number between ${min} and ${max}.`
        : rangeUnderflow ? `Enter a number greater than or equal to ${min}.`
          : `Enter a number less than or equal to ${max}.`;
      return { flags: { rangeUnderflow, rangeOverflow }, message };
    }
    if (step !== 'any') {
      const offset = (value - (min ?? 0)) / step;
      if (roundNumber(offset) !== Math.round(offset)) {
        return { flags: { stepMismatch: true }, message: `Enter a number in increments of ${step} from ${min ?? 0}.` };
      }
    }
    return undefined;
  }

  #steppedValue(value: number | null, amount: number): number | null {
    if (!Number.isFinite(amount) || Math.trunc(amount) === 0) return value;
    const { min, max, step } = this;
    if (min !== null && max !== null && min > max) return value;
    if (step === 'any') return clamp((value ?? 0) + Math.trunc(amount), min ?? -Infinity, max ?? Infinity);
    const base = min ?? 0;
    const offset = roundNumber(((value ?? 0) - base) / step) + Math.trunc(amount);
    const index = amount > 0 ? Math.floor(offset) : Math.ceil(offset);
    const upper = max === null ? Infinity : base + Math.floor(roundNumber((max - base) / step)) * step;
    return roundNumber(clamp(base + index * step, min ?? -Infinity, upper));
  }

  #setUserValue(value: number | null) {
    const changed = this.value !== value;
    this.value = value;
    if (changed) {
      this.emitValueEvent('input');
      this.emitValueEvent('change');
    }
  }

  #commitDraft() {
    if (this.controlReadOnly || this.controlDisabled || this.#draft === undefined) return;
    if (!this.validity.valid) {
      this.#showError = true;
      this.requestUpdate();
      return;
    }
    this.#setUserValue(this.#readDraft());
  }

  #spin(amount: number) {
    if (this.controlReadOnly || this.controlDisabled) return;
    this.#setUserValue(this.#steppedValue(this.#readDraft() ?? this.value, amount));
    this.focus({ preventScroll: true });
  }

  #onInput(event: Event) {
    event.stopPropagation();
    this.#draft = (event.currentTarget as HTMLInputElement).value;
    this.syncForm();
    this.requestUpdate();
  }

  #onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || this.controlReadOnly || this.controlDisabled) return;
    switch (event.key) {
      case 'Enter': this.#commitDraft(); break;
      case 'ArrowUp': this.#spin(1); break;
      case 'ArrowDown': this.#spin(-1); break;
      case 'Escape':
        if (this.#draft === undefined) return;
        this.valueUpdated();
        this.syncForm();
        this.requestUpdate();
        event.stopPropagation();
        break;
      default: return;
    }
    event.preventDefault();
  }

  override render() {
    const error = this.#showError ? this.validationMessage : '';
    const preventBlur = (event: MouseEvent) => event.preventDefault();
    const announcedValue = this.validity.rangeOverflow || this.validity.rangeUnderflow ? this.value : this.#readDraft();
    return html`${this.renderLabel()}
      <div class="control" part="control">
        <input id="number" part="input" type="text" inputmode="decimal" role="spinbutton"
          .value=${live(this.draft)} placeholder=${this.placeholder} ?readonly=${this.readOnly}
          ?disabled=${this.controlDisabled} ?required=${this.required}
          aria-label=${this.accessibleLabel()} aria-valuemin=${this.min ?? nothing} aria-valuemax=${this.max ?? nothing}
          aria-valuenow=${announcedValue ?? nothing} aria-invalid=${error ? 'true' : nothing}
          aria-describedby=${error ? 'error' : nothing}
          @input=${this.#onInput} @blur=${this.#commitDraft} @keydown=${this.#onKeyDown}>
        ${this.spinButtons ? html`
          <div class="step-buttons">
            <button part="decrement" type="button" tabindex="-1" aria-label=${this.decrementLabel}
              ?disabled=${this.controlDisabled || this.readOnly} @mousedown=${preventBlur} @click=${() => this.#spin(-1)}>−</button>
            <button part="increment" type="button" tabindex="-1" aria-label=${this.incrementLabel}
              ?disabled=${this.controlDisabled || this.readOnly} @mousedown=${preventBlur} @click=${() => this.#spin(1)}>+</button>
          </div>
        ` : nothing}
      </div>
      <span class="error" part="error" id="error" role="status">${error}</span>`;
  }
}

defineElement('metro-number-box', MetroNumberBox);

declare global {
  interface HTMLElementTagNameMap { 'metro-number-box': MetroNumberBox; }
}
