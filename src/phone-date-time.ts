import { calendarToday, dateAt, dateKey } from './calendar-date.js';

export type MetroDateTimeColumn = 'day' | 'month' | 'year' | 'hour' | 'minute' | 'second' | 'fraction' | 'period';
export type MetroDateTimePickerLabels = Partial<Record<MetroDateTimeColumn, string>>;

const names: Record<MetroDateTimeColumn, string> = {
  day: 'Day', month: 'Month', year: 'Year', hour: 'Hour', minute: 'Minute', second: 'Second',
  fraction: 'Milliseconds', period: 'Day period',
};

export interface PhoneDateTimeColumn {
  id: MetroDateTimeColumn;
  name: string;
  min: number;
  max: number;
  value: number;
  loop: boolean;
  number: (value: number) => string;
  caption?: (value: number) => string;
  change: (value: number) => string;
}

const dateFormat = { timeZone: 'UTC', calendar: 'gregory' } as const;
const pad = (value: number) => String(value).padStart(2, '0');

export function shiftedColumnValue(column: PhoneDateTimeColumn, offset: number): number | undefined {
  const value = column.value + offset;
  if (!column.loop) return value < column.min || value > column.max ? undefined : value;
  const count = column.max - column.min + 1;
  return column.min + ((value - column.min) % count + count) % count;
}

export function formatPhoneDateTime(input: HTMLInputElement, value: string, locale: string) {
  if (input.type === 'date') {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat(locale, { ...dateFormat, dateStyle: 'medium' }).format(date) : value;
  }
  const parts = parseTime(value);
  const format = { ...dateFormat, hour: 'numeric', minute: '2-digit' } satisfies Intl.DateTimeFormatOptions;
  const options: Intl.DateTimeFormatOptions = parts.fraction
    ? { ...format, second: '2-digit', fractionalSecondDigits: 3 }
    : parts.second ? { ...format, second: '2-digit' } : format;
  return new Intl.DateTimeFormat(locale, options).format(timeDate(parts));
}

export function initialPhoneDateTime(input: HTMLInputElement) {
  if (input.value) return input.value;
  if (input.min) {
    const candidate = input.cloneNode() as HTMLInputElement;
    candidate.value = input.min;
    if (candidate.value) return candidate.value;
  }
  if (input.type === 'date') return dateKey(calendarToday());
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function phoneDateTimeColumns(
  input: HTMLInputElement, value: string, locale: string, step: number | 'any', labels: MetroDateTimePickerLabels,
): PhoneDateTimeColumn[] {
  const columns = input.type === 'date' ? dateColumns(input, value, locale) : timeColumns(input, value, locale, step);
  return columns.map(column => ({ ...column, name: labels[column.id] || names[column.id] }));
}

type Column = Omit<PhoneDateTimeColumn, 'name'>;

function parseDate(value: string): Date | undefined {
  if (!/^\d{4,}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = dateAt(year, month - 1, day);
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date : undefined;
}

function dateColumns(input: HTMLInputElement, value: string, locale: string): Column[] {
  const date = parseDate(value) ?? calendarToday();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const equivalentYear = (y: number) => 2000 + y % 400;
  const daysInMonth = (y: number, m: number) => dateAt(equivalentYear(y), m + 1, 0).getUTCDate();
  const replace = (y: number, m: number, d: number) => {
    const result = dateAt(y, m, Math.min(d, daysInMonth(y, m)));
    return Number.isFinite(result.getTime()) ? dateKey(result) : value;
  };
  const number = new Intl.NumberFormat(locale, { useGrouping: false }).format;
  const monthName = new Intl.DateTimeFormat(locale, { ...dateFormat, month: 'short' });
  const weekday = new Intl.DateTimeFormat(locale, { ...dateFormat, weekday: 'short' });
  const columns: Record<'day' | 'month' | 'year', Column> = {
    day: { id: 'day', value: day, min: 1, max: daysInMonth(year, month), loop: true, number,
      caption: next => weekday.format(dateAt(equivalentYear(year), month, next)), change: next => replace(year, month, next) },
    month: { id: 'month', value: month + 1, min: 1, max: 12, loop: true, number,
      caption: next => monthName.format(dateAt(2000, next - 1, 1)), change: next => replace(year, next - 1, day) },
    year: { id: 'year', value: year, min: Math.min(year, parseDate(input.min)?.getUTCFullYear() ?? 1),
      max: Math.max(year, parseDate(input.value)?.getUTCFullYear() ?? 1,
        parseDate(input.max)?.getUTCFullYear() ?? 9999), loop: false, number,
      change: next => replace(next, month, day) },
  };
  const order = new Intl.DateTimeFormat(locale, { ...dateFormat, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(date);
  return order.flatMap(({ type }) => type === 'day' || type === 'month' || type === 'year' ? [columns[type]] : []);
}

type Clock = Record<'hour' | 'minute' | 'second' | 'fraction', number>;

function parseTime(value: string): Clock {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(value)) {
    return { hour: 0, minute: 0, second: 0, fraction: 0 };
  }
  const [hour, minute, second = '0', fraction = ''] = value.split(/[:.]/);
  return { hour: +hour, minute: +minute, second: +second, fraction: +fraction.padEnd(3, '0') };
}

function timeDate(clock: Clock) {
  const date = new Date(0);
  date.setUTCHours(clock.hour, clock.minute, clock.second, clock.fraction);
  return date;
}

function writeTime({ hour, minute, second, fraction }: Clock) {
  const principal = `${pad(hour)}:${pad(minute)}`;
  const subsecond = fraction ? `.${String(fraction).padStart(3, '0').replace(/0+$/, '')}` : '';
  return second || fraction ? `${principal}:${pad(second)}${subsecond}` : principal;
}

function timeColumns(input: HTMLInputElement, value: string, locale: string, step: number | 'any'): Column[] {
  const clock = parseTime(value);
  const precision = [clock, ...[input.min, input.max, input.value, input.defaultValue].map(parseTime)];
  const fractions = step === 'any' || step % 1 !== 0 || precision.some(({ fraction }) => fraction !== 0);
  const seconds = fractions || step % 60 !== 0 || precision.some(({ second }) => second !== 0);
  const formatter = new Intl.DateTimeFormat(locale, {
    ...dateFormat, hour: 'numeric', minute: 'numeric', second: seconds ? 'numeric' : undefined,
    fractionalSecondDigits: fractions ? 3 : undefined,
  });
  const cycle = formatter.resolvedOptions().hourCycle;
  const twelve = cycle === 'h11' || cycle === 'h12';
  const zero = cycle === 'h11' || cycle === 'h23';
  const period = clock.hour < 12 ? 0 : 1;
  const hour = twelve ? clock.hour % 12 : clock.hour;
  const periodLabel = (next: number) => formatter.formatToParts(timeDate({ ...clock, hour: next ? 13 : 1 }))
    .find(part => part.type === 'dayPeriod')?.value || (next ? 'PM' : 'AM');
  const number = (minimumIntegerDigits: number) => new Intl.NumberFormat(locale, { minimumIntegerDigits, useGrouping: false }).format;
  const numeric = (id: keyof Clock, min: number, max: number, digits = 2): Column => ({
    id, min, max, value: clock[id], loop: true, number: number(digits), change: next => writeTime({ ...clock, [id]: next }),
  });
  const columns: Record<string, Column> = {
    hour: { ...numeric('hour', zero ? 0 : 1, (twelve ? 12 : 24) - Number(zero), 1),
      value: hour || (zero ? 0 : twelve ? 12 : 24),
      change: next => writeTime({ ...clock, hour: twelve ? next % 12 + 12 * period : next % 24 }) },
    minute: numeric('minute', 0, 59), second: numeric('second', 0, 59),
    fractionalSecond: numeric('fraction', 0, 999, 3),
    dayPeriod: { id: 'period', min: 0, max: 1, value: period, loop: false, number: periodLabel,
      change: next => writeTime({ ...clock, hour: clock.hour % 12 + 12 * next }) },
  };
  return formatter.formatToParts(timeDate(clock)).flatMap(({ type }) => columns[type] ? [columns[type]] : []);
}
