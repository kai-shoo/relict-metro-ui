import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { calendarLimits, dateLocale, isAvailableDate, parseCalendarDate } from './calendar-date.js';
import './calendar-view.js';
import { defineElement } from './define.js';
import './dialog.js';
import type { MetroDialogCloseEvent } from './dialog.js';
import { metroTheme } from './theme.js';

const observed = ['value', 'min', 'max', 'name', 'required', 'disabled', 'lang', 'aria-label', 'aria-labelledby', 'aria-invalid'];
const manual = { attribute: false, noAccessor: true } as const;

function revealAfterFocus(reveal: () => void): void {
  queueMicrotask(reveal);
  // WebKit can apply native focus scrolling after the first animation frame.
  requestAnimationFrame(() => requestAnimationFrame(reveal));
}

export class MetroCalendarDatePicker extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    value: manual,
    defaultValue: manual,
    min: manual,
    max: manual,
    name: manual,
    disabled: manual,
    required: manual,
    locale: { type: String },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    disabledDates: { attribute: false },
    label: { type: String },
    placeholder: { type: String },
    dialogLabel: { type: String, attribute: 'dialog-label' },
    applyLabel: { type: String, attribute: 'apply-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    clearLabel: { type: String, attribute: 'clear-label' },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
  };

  static override get observedAttributes() { return [...super.observedAttributes, ...observed]; }

  static override styles = [metroTheme, css`
    :host { display: inline-block; max-inline-size: 100%; color: var(--_metro-fg); }
    .field { display: grid; grid-template-columns: minmax(0, 1fr); padding-inline: var(--_metro-space); }
    .label {
      margin-block-end: .25rem;
      color: var(--_metro-muted);
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    .label[hidden] { display: none; }
    .field:has(.trigger:disabled) .label { color: var(--_metro-disabled); }

    .trigger {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--_metro-space);
      inline-size: 100%;
      min-block-size: var(--metro-picker-height, 72px);
      padding: .25rem var(--_metro-space);
      border: 3px solid var(--metro-picker-border, currentColor);
      border-radius: 0;
      background: var(--metro-picker-bg, transparent);
      color: var(--metro-picker-fg, var(--_metro-fg));
      font: 400 1.5833rem / 1.3 var(--_metro-font);
      text-align: start;
      cursor: pointer;
    }

    .trigger[aria-expanded="true"] { border-color: var(--_metro-accent); }
    .trigger:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .trigger:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .trigger:disabled { color: var(--_metro-disabled); border-color: currentColor; cursor: default; }
    #value { min-inline-size: 0; overflow-wrap: anywhere; }

    .icon {
      display: block;
      position: relative;
      flex: none;
      box-sizing: border-box;
      inline-size: 1.25rem;
      block-size: 1.125rem;
      border: 2px solid currentColor;
    }
    .icon::before {
      content: '';
      position: absolute;
      inset: .225rem 0 auto;
      border-block-start: 2px solid currentColor;
    }

    #picker::part(surface) {
      max-inline-size: calc(100% - 1rem);
      padding: min(calc(var(--_metro-space) * 2), 5vi);
    }

    #picker::part(actions) {
      gap: min(var(--_metro-space), 3dvh);
      margin-block-start: min(var(--_metro-space), 3dvh);
    }

    button[slot="actions"] {
      margin-block-start: 0;
      scroll-margin-block: 6px;
    }
    metro-calendar-view { display: block; margin-inline: auto; }

    @media (min-height: 360px) {
      metro-calendar-view::part(header) {
        position: sticky;
        inset-block-start: 0;
        z-index: 1;
        background: var(--_metro-chrome);
      }

      metro-calendar-view::part(month) { font-size: 1.125rem; line-height: 1.2; }
      metro-calendar-view::part(previous),
      metro-calendar-view::part(next) { min-block-size: 44px; font-size: 1.25rem; }
    }

    @media (forced-colors: active) {
      .trigger:focus-visible { outline-color: Highlight; }
      .trigger:disabled { border-color: GrayText; }
    }
  `];

  declare locale: string;
  declare firstDayOfWeek: number | null;
  declare disabledDates: readonly string[];
  declare label: string;
  declare placeholder: string;
  declare dialogLabel: string;
  declare applyLabel: string;
  declare cancelLabel: string;
  declare clearLabel: string;
  declare previousLabel: string;
  declare nextLabel: string;

  #internals = this.attachInternals();
  #currentValue: string | undefined;
  #draft = '';
  #opened = false;
  #session = 0;
  #fieldsetDisabled = false;
  #customMessage = '';

  constructor() {
    super();
    this.locale = '';
    this.firstDayOfWeek = null;
    this.disabledDates = [];
    this.label = '';
    this.placeholder = 'Choose a date';
    this.dialogLabel = 'Choose a date';
    this.applyLabel = 'Apply';
    this.cancelLabel = 'Cancel';
    this.clearLabel = 'Clear';
    this.previousLabel = 'Previous month';
    this.nextLabel = 'Next month';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncForm();
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
    if (name === 'value' && this.#opened && this.#currentValue === undefined) this.#draft = this.value;
    this.#syncForm();
    this.requestUpdate();
  }

  protected override updated(): void { this.#syncForm(); }

  get value() {
    if (this.#currentValue !== undefined) return this.#currentValue;
    const value = this.defaultValue;
    return parseCalendarDate(value) ? value : '';
  }
  set value(value: string) {
    this.#currentValue = parseCalendarDate(value) ? value : '';
    if (this.#opened) this.#draft = this.#currentValue;
    this.#syncForm();
    this.requestUpdate();
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }

  get min() { return this.getAttribute('min') ?? ''; }
  set min(value: string) { this.setAttribute('min', value); }

  get max() { return this.getAttribute('max') ?? ''; }
  set max(value: string) { this.setAttribute('max', value); }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }

  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }

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
    this.#currentValue = undefined;
    this.#syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  showPicker(): void {
    if (!this.isConnected || this.#opened || this.#controlDisabled) return;
    this.#draft = this.value;
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
    if (session !== this.#session || !this.#opened || this.#controlDisabled || !this.isConnected) return;
    const dialog = this.#dialog;
    const calendar = this.#calendar;
    if (!dialog || !calendar) return;
    // Day-to-day focus changes stay inside the calendar's shadow root.
    calendar.shadowRoot?.addEventListener('focusin', this.#onDayFocus);
    dialog.show(this.#trigger ?? undefined);
    await dialog.updateComplete;
    await calendar.updateComplete;
    if (session !== this.#session || !this.#opened) return;
    calendar.showDate(this.#draft);
    await calendar.updateComplete;
    if (session === this.#session && this.#opened) {
      calendar.focus({ preventScroll: true });
      this.#revealFocusedDay();
    }
  }

  get #trigger() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger') ?? null; }
  get #dialog() { return this.shadowRoot?.querySelector('metro-dialog') ?? null; }
  get #calendar() { return this.shadowRoot?.querySelector('metro-calendar-view') ?? null; }
  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }
  get #limits() { return calendarLimits(this.min, this.max, this.disabledDates); }

  #draftValid(): boolean {
    const date = parseCalendarDate(this.#draft);
    return date !== null && isAvailableDate(date, this.#limits);
  }

  #syncForm(): void {
    const value = this.value;
    const date = parseCalendarDate(value);
    const limits = this.#limits;
    const disabled = this.#controlDisabled;
    const trigger = this.#trigger;
    if (trigger) trigger.disabled = disabled;
    if (disabled && this.#opened) this.close();
    this.#internals.setFormValue(value, value);
    if (disabled) {
      this.#internals.setValidity({});
      return;
    }
    const valueMissing = this.required && !value;
    const rangeUnderflow = date !== null && date < limits.min;
    const rangeOverflow = date !== null && date > limits.max;
    const unavailable = Boolean(value) && limits.blocked.has(value);
    const customError = unavailable || Boolean(this.#customMessage);
    if (valueMissing || rangeUnderflow || rangeOverflow || customError) {
      const message = this.#customMessage || (valueMissing ? 'Choose a date.' : 'Choose an available date.');
      this.#internals.setValidity({ valueMissing, rangeUnderflow, rangeOverflow, customError }, message, trigger ?? undefined);
    } else {
      this.#internals.setValidity({});
    }
  }

  #onDraft(event: Event): void {
    event.stopPropagation();
    if (!this.#opened || !this.#calendar) return;
    this.#draft = this.#calendar.value;
    this.requestUpdate();
  }

  #onClose(event: MetroDialogCloseEvent): void {
    event.stopPropagation();
    this.#opened = false;
    this.#session++;
    const { reason, value } = event.detail;
    this.requestUpdate();
    if (reason !== 'action' || this.#controlDisabled) return;
    const selected = value === 'apply' && this.#draftValid() ? this.#draft
      : value === 'clear' && !this.required ? '' : undefined;
    if (selected === undefined || selected === this.value) return;
    this.value = selected;
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

  #onActionFocus = (event: FocusEvent) => {
    const action = event.target;
    if (action instanceof HTMLButtonElement && action.slot === 'actions') {
      revealAfterFocus(() => {
        if (this.#opened && action.matches(':focus')) {
          action.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        }
      });
    }
  };

  #onDayFocus = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches('[part~="day"]')) revealAfterFocus(this.#revealFocusedDay);
  };

  #revealFocusedDay = () => {
    const root = this.#calendar?.shadowRoot;
    const day = root?.activeElement;
    if (!this.#opened || !day?.matches('[part~="day"]')) return;
    const header = root?.querySelector<HTMLElement>('[part="header"]');
    const surface = this.#dialog?.shadowRoot?.querySelector('dialog');
    if (!header || !surface) return;
    const date = day.getBoundingClientRect();
    const bounds = surface.getBoundingClientRect();
    const sticky = getComputedStyle(header).position === 'sticky' && header.offsetHeight + date.height + 8 < surface.clientHeight;
    const top = sticky ? Math.max(bounds.top, header.getBoundingClientRect().bottom) + 4 : bounds.top + 4;
    const bottom = bounds.top + surface.clientHeight - 4;
    const offset = date.top < top ? date.top - top : Math.max(0, date.bottom - bottom);
    if (offset) surface.scrollBy({ top: offset, behavior: 'instant' });
  };

  protected override render() {
    const locale = dateLocale(this.locale, this);
    const date = parseCalendarDate(this.value);
    const formatted = date
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC', calendar: 'gregory' }).format(date)
      : this.placeholder;
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const label = this.#accessibleLabel(hasLabel);
    return html`
      <div class="field">
        <label class="label" id="label" part="label" for="trigger" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <button type="button" class="trigger" id="trigger" part="trigger" aria-haspopup="dialog"
          aria-controls="picker" aria-expanded=${String(this.#opened)}
          aria-label=${ifDefined(label ? `${label}, ${formatted}` : undefined)}
          aria-labelledby=${ifDefined(hasLabel && !label ? 'label value' : undefined)}
          aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
          ?disabled=${this.#controlDisabled} @click=${this.showPicker}>
          <span id="value" part="value">${formatted}</span><span class="icon" aria-hidden="true"></span>
        </button>
      </div>
      <metro-dialog id="picker" .label=${this.dialogLabel} exportparts="surface:dialog, heading:dialog-heading, actions"
        @metro-before-close=${(event: Event) => event.stopPropagation()} @metro-close=${this.#onClose}
        @focusin=${this.#onActionFocus}>
        <metro-calendar-view .locale=${locale} .firstDayOfWeek=${this.firstDayOfWeek} .value=${this.#draft}
          .min=${this.min} .max=${this.max} .disabledDates=${this.disabledDates} .disabled=${this.#controlDisabled}
          .previousLabel=${this.previousLabel} .nextLabel=${this.nextLabel}
          exportparts="month:calendar-month, grid:calendar-grid, day:calendar-day, selected:calendar-selected"
          @input=${this.#onDraft} @change=${(event: Event) => event.stopPropagation()}></metro-calendar-view>
        ${this.required ? null : html`<button slot="actions" type="button" part="clear" data-metro-value="clear"
          ?disabled=${!this.#draft && !this.value}>${this.clearLabel}</button>`}
        <button slot="actions" type="button" part="cancel" data-metro-value="cancel">${this.cancelLabel}</button>
        <button slot="actions" type="button" part="apply" data-metro-value="apply" ?disabled=${!this.#draftValid()}>${this.applyLabel}</button>
      </metro-dialog>
    `;
  }
}

defineElement('metro-calendar-date-picker', MetroCalendarDatePicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-calendar-date-picker': MetroCalendarDatePicker; }
}
