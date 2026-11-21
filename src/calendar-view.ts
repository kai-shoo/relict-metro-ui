import { LitElement, css, html, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  calendarLimits, calendarToday, clampDate, dateAt, dateKey, dateLocale, isAvailableDate,
  localeFirstDay, offsetDays, offsetMonths, parseCalendarDate, scanDates,
} from './calendar-date.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export class MetroCalendarView extends LitElement {
  static override properties = {
    value: { type: String, noAccessor: true },
    min: { type: String, reflect: true },
    max: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    locale: { type: String },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    disabledDates: { attribute: false },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    lang: { type: String, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      inline-size: min(100%, 24rem);
      color: var(--_metro-fg);
      container-type: inline-size;
    }

    .header {
      display: grid;
      grid-template-columns: min(2.75rem, 24%) minmax(0, 1fr) min(2.75rem, 24%);
      align-items: center;
      gap: .25rem;
      margin-block-end: .25rem;
    }

    .month {
      margin: 0;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 300;
      overflow-wrap: anywhere;
    }

    .days { overflow-x: auto; }
    .grid {
      inline-size: 100%;
      /* Seven pairs of digits, their button borders and the table spacing. */
      min-inline-size: calc(14ch + 28px + 1rem);
      table-layout: fixed;
      border-spacing: .125rem;
      font-size: 1.125rem;
      font-variant-numeric: tabular-nums;
    }
    .weekday { padding: .25rem 0; color: var(--_metro-muted); font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
    td { padding: 0; }

    button {
      box-sizing: border-box;
      display: grid;
      place-items: center;
      inline-size: 100%;
      min-block-size: var(--metro-calendar-cell-size, 2.75rem);
      padding: 0;
      border: 2px solid transparent;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 400 1.125rem / 1.2 var(--_metro-font);
      cursor: pointer;
    }

    .month-button { border-color: currentColor; font-size: 1.75rem; }
    .month-button:dir(rtl) span { transform: scaleX(-1); }
    @container (inline-size < 13rem) {
      .month { grid-area: 1 / 1 / 2 / -1; }
      .month-button:first-child { grid-area: 2 / 1; }
      .month-button:last-child { grid-area: 2 / 3; }
    }
    .day { font-variant-numeric: tabular-nums; }
    .day[data-outside] { color: var(--_metro-muted); }
    .day[aria-current="date"] { border-color: var(--_metro-accent); }
    [aria-selected="true"] > .day, button:active:enabled {
      border-color: var(--_metro-accent);
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }

    button:disabled { color: var(--_metro-disabled); cursor: default; }
    .day:disabled { color: var(--_metro-disabled); border-color: transparent; }
    button:focus-visible, .grid:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 1px; }

    @media (forced-colors: active) {
      button:focus-visible, .grid:focus-visible { outline-color: Highlight; }
      [aria-selected="true"] > .day, button:active:enabled {
        forced-color-adjust: none;
        background: Highlight;
        color: HighlightText;
      }
    }
  `];

  declare min: string;
  declare max: string;
  declare disabled: boolean;
  declare locale: string;
  declare firstDayOfWeek: number | null;
  declare disabledDates: readonly string[];
  declare previousLabel: string;
  declare nextLabel: string;

  #value = '';
  #cursor: Date | undefined;
  #focusOnUpdate = false;

  constructor() {
    super();
    this.min = '';
    this.max = '';
    this.disabled = false;
    this.locale = '';
    this.firstDayOfWeek = null;
    this.disabledDates = [];
    this.previousLabel = 'Previous month';
    this.nextLabel = 'Next month';
  }

  get value() { return this.#value; }
  set value(value: string) {
    const key = parseCalendarDate(value) ? value : '';
    if (key === this.#value) return;
    const previous = this.#value;
    this.#value = key;
    this.requestUpdate('value', previous);
  }

  showDate(value: string): void {
    this.#placeCursor(parseCalendarDate(value) ?? calendarToday());
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    if (this.disabled) return;
    const target = this.shadowRoot?.querySelector<HTMLElement>('.day[tabindex="0"], .grid[data-no-focus]');
    if (target) {
      target.focus(options);
      if (target.matches('.day')) this.#revealDay(target);
    }
    else if (!this.hasUpdated && this.isConnected) void this.updateComplete.then(() => this.focus(options));
  }

  protected override willUpdate(changes: PropertyValues): void {
    const active = this.shadowRoot?.activeElement;
    if (!this.#cursor || changes.has('value') || changes.has('min') || changes.has('max') || changes.has('disabledDates')) {
      this.#focusOnUpdate ||= Boolean(active?.matches('.day, .grid'));
      const selected = changes.has('value') || !this.#cursor ? parseCalendarDate(this.value) : null;
      this.#placeCursor(selected ?? this.#cursor ?? calendarToday());
    }
    const focusedDate = active?.getAttribute('data-date');
    if (focusedDate && focusedDate !== dateKey(this.#date)) this.#focusOnUpdate = true;
    if (active?.matches('.month-button') && !this.#canChangeMonth(active.getAttribute('part') === 'previous' ? -1 : 1)) {
      this.#focusOnUpdate = true;
    }
  }

  protected override updated(): void {
    if (!this.#focusOnUpdate) return;
    this.#focusOnUpdate = false;
    this.focus();
  }

  #revealDay(day: HTMLElement): void {
    const viewport = day.closest<HTMLElement>('.days');
    if (!viewport) return;
    const left = viewport.getBoundingClientRect().left + viewport.clientLeft;
    const right = left + viewport.clientWidth;
    const cell = day.getBoundingClientRect();
    const delta = cell.left < left ? cell.left - left : Math.max(0, cell.right - right);
    if (delta) viewport.scrollBy({ left: delta, behavior: 'instant' });
  }

  #placeCursor(date: Date): void {
    const limits = this.#limits;
    const bounded = clampDate(date, limits);
    this.#cursor = scanDates(bounded, 1, limits) ?? scanDates(bounded, -1, limits) ?? bounded;
  }

  get #limits() { return calendarLimits(this.min, this.max, this.disabledDates); }
  get #date() { return this.#cursor ?? calendarToday(); }
  get #firstDay() {
    if (this.firstDayOfWeek !== null && Number.isInteger(this.firstDayOfWeek)
      && this.firstDayOfWeek >= 0 && this.firstDayOfWeek <= 6) return this.firstDayOfWeek;
    return localeFirstDay(dateLocale(this.locale, this));
  }

  #canChangeMonth(offset: number): boolean {
    const { min, max } = this.#limits;
    const year = this.#date.getUTCFullYear();
    const month = this.#date.getUTCMonth() + offset;
    return !this.disabled && min <= max && dateAt(year, month, 1) <= max && dateAt(year, month + 1, 0) >= min;
  }

  #changeMonth(offset: number, focus = false): void {
    if (!this.#canChangeMonth(offset)) return;
    this.#moveCursor(offsetMonths(this.#date, offset), offset, focus);
  }

  #moveCursor(target: Date, direction: number, focus: boolean): void {
    const limits = this.#limits;
    const bounded = clampDate(target, limits);
    const date = scanDates(bounded, direction < 0 ? -1 : 1, limits);
    if (!date) return;
    this.#cursor = date;
    this.#focusOnUpdate = focus;
    this.requestUpdate();
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || this.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!(event.target instanceof HTMLButtonElement) || !event.target.matches('.day')) return;
    const cursor = this.#date;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const daysIntoWeek = (cursor.getUTCDay() - this.#firstDay + 7) % 7;
    let offset: number;
    switch (event.key) {
      case 'ArrowLeft': offset = rtl ? 1 : -1; break;
      case 'ArrowRight': offset = rtl ? -1 : 1; break;
      case 'ArrowUp': offset = -7; break;
      case 'ArrowDown': offset = 7; break;
      case 'Home': offset = -daysIntoWeek; break;
      case 'End': offset = 6 - daysIntoWeek; break;
      case 'PageUp':
      case 'PageDown':
        event.preventDefault();
        this.#changeMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true);
        return;
      default: return;
    }
    event.preventDefault();
    this.#moveCursor(offsetDays(cursor, offset), offset, true);
  }

  #select(date: Date): void {
    if (this.disabled || !isAvailableDate(date, this.#limits)) return;
    this.#cursor = date;
    this.#focusOnUpdate = true;
    this.requestUpdate();
    const value = dateKey(date);
    if (value === this.value) return;
    this.value = value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  protected override render() {
    const cursor = this.#date;
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const locale = dateLocale(this.locale, this);
    const limits = this.#limits;
    const today = dateKey(calendarToday());
    const monthName = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC', calendar: 'gregory' });
    const dateName = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC', calendar: 'gregory' });
    const weekdayName = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC', calendar: 'gregory' });
    const fullWeekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC', calendar: 'gregory' });
    const number = new Intl.NumberFormat(locale, { useGrouping: false });
    const firstOfMonth = dateAt(year, month, 1);
    const start = offsetDays(firstOfMonth, -((firstOfMonth.getUTCDay() - this.#firstDay + 7) % 7));
    const noFocus = this.disabled || !isAvailableDate(cursor, limits);
    return html`
      <div class="header" part="header">
        <button class="month-button" part="previous" type="button"
          aria-label=${this.previousLabel} ?disabled=${!this.#canChangeMonth(-1)} @click=${() => this.#changeMonth(-1)}>
          <span aria-hidden="true">‹</span>
        </button>
        <div class="month" id="month" part="month" aria-live="polite">${monthName.format(cursor)}</div>
        <button class="month-button" part="next" type="button"
          aria-label=${this.nextLabel} ?disabled=${!this.#canChangeMonth(1)} @click=${() => this.#changeMonth(1)}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div class="days" tabindex="-1">
        <table class="grid" part="grid" role="grid" aria-labelledby="month"
          aria-disabled=${String(this.disabled)} tabindex="-1" ?data-no-focus=${noFocus} @keydown=${this.#onKeydown}>
          <thead>
            <tr>
              ${Array.from({ length: 7 }, (_, index) => {
                const date = offsetDays(start, index);
                return html`<th class="weekday" part="weekday" scope="col"
                  aria-label=${fullWeekday.format(date)}>${weekdayName.format(date)}</th>`;
              })}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: 6 }, (_, week) => html`
              <tr>${Array.from({ length: 7 }, (_, index) => {
                const date = offsetDays(start, week * 7 + index);
                const key = dateKey(date);
                const unavailable = this.disabled || !isAvailableDate(date, limits);
                const selected = key === this.value && !unavailable;
                if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return html`<td aria-disabled="true"></td>`;
                return html`<td aria-selected=${String(selected)} aria-disabled=${String(unavailable)}>
                  <button class="day" part=${selected ? 'day selected' : 'day'} type="button" data-date=${key}
                    ?data-outside=${date.getUTCMonth() !== month} ?disabled=${unavailable}
                    tabindex=${!unavailable && +date === +cursor ? '0' : '-1'}
                    aria-current=${ifDefined(key === today ? 'date' : undefined)}
                    aria-label=${dateName.format(date)} @click=${() => this.#select(date)}>${number.format(date.getUTCDate())}</button>
                </td>`;
              })}</tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

defineElement('metro-calendar-view', MetroCalendarView);

declare global {
  interface HTMLElementTagNameMap { 'metro-calendar-view': MetroCalendarView; }
}
