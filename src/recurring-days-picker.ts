import { dateAt, dateLocale, localeFirstDay, offsetDays } from './calendar-date.js';
import { defineElement } from './define.js';
import { PickerControl, type PickerChoice } from './picker-control.js';

const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type MetroWeekday = typeof weekdays[number];

export class MetroRecurringDaysPicker extends PickerControl {
  static override properties = {
    locale: { type: String },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    everyDayLabel: { type: String, attribute: 'every-day-label' },
    selectedDays: { attribute: false, noAccessor: true },
  };

  declare locale: string;
  declare firstDayOfWeek: number | null;
  declare everyDayLabel: string;

  constructor() {
    super();
    this.locale = '';
    this.firstDayOfWeek = null;
    this.everyDayLabel = 'Every day';
    this.placeholder = 'Does not repeat';
    this.dialogLabel = 'Repeat on';
  }

  get value() { return this.selectedDays.join(' '); }
  set value(value: string) { this.currentSelection = String(value).trim().split(/\s+/); }

  get selectedDays(): readonly MetroWeekday[] { return this.currentSelection as readonly MetroWeekday[]; }
  set selectedDays(days: readonly MetroWeekday[]) { this.currentSelection = days; }

  protected override get multipleMode() { return true; }
  protected override get initialSelection() { return this.defaultValue.trim().split(/\s+/); }

  protected override orderSelection(values: string[]): MetroWeekday[] {
    return weekdays.filter(day => values.includes(day));
  }

  protected override summarize(selection: readonly PickerChoice[]): string {
    if (selection.length === weekdays.length) return this.everyDayLabel;
    const locale = dateLocale(this.locale, this);
    const list = new Intl.ListFormat(locale, { type: 'conjunction', style: 'short' });
    return list.format(selection.map(choice => choice.shortLabel ?? choice.label));
  }

  protected override get choices(): readonly PickerChoice[] {
    const locale = dateLocale(this.locale, this);
    const firstDay = this.firstDayOfWeek !== null && Number.isInteger(this.firstDayOfWeek)
      && this.firstDayOfWeek >= 0 && this.firstDayOfWeek <= 6 ? this.firstDayOfWeek : localeFirstDay(locale);
    const fullName = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    const shortName = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    const monday = dateAt(2024, 0, 1);
    return weekdays.map((_, index) => {
      const day = (index + firstDay + 6) % weekdays.length;
      const date = offsetDays(monday, day);
      return { value: weekdays[day], label: fullName.format(date), shortLabel: shortName.format(date) };
    });
  }
}

defineElement('metro-recurring-days-picker', MetroRecurringDaysPicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-recurring-days-picker': MetroRecurringDaysPicker; }
}
