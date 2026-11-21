export function dateAt(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = dateAt(year, month - 1, day);
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date : null;
}

export function dateKey(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarToday(): Date {
  const now = new Date();
  return dateAt(now.getFullYear(), now.getMonth(), now.getDate());
}

export function offsetDays(date: Date, offset: number): Date {
  return dateAt(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset);
}

export function offsetMonths(date: Date, offset: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + offset;
  const days = dateAt(year, month + 1, 0).getUTCDate();
  return dateAt(year, month, Math.min(date.getUTCDate(), days));
}

const earliest = dateAt(1, 0, 1);
const latest = dateAt(9999, 11, 31);

export interface CalendarLimits {
  min: Date;
  max: Date;
  blocked: ReadonlySet<string>;
}

export function calendarLimits(min: string, max: string, blocked: readonly string[]): CalendarLimits {
  return { min: parseCalendarDate(min) ?? earliest, max: parseCalendarDate(max) ?? latest, blocked: new Set(blocked) };
}

export function inDateBounds(date: Date, limits: CalendarLimits): boolean {
  return date >= limits.min && date <= limits.max;
}

export function isAvailableDate(date: Date, limits: CalendarLimits): boolean {
  return inDateBounds(date, limits) && !limits.blocked.has(dateKey(date));
}

export function clampDate(date: Date, limits: CalendarLimits): Date {
  if (limits.min > limits.max) return date;
  return date < limits.min ? limits.min : date > limits.max ? limits.max : date;
}

export function scanDates(start: Date, direction: number, limits: CalendarLimits): Date | undefined {
  let date = start;
  while (inDateBounds(date, limits)) {
    if (isAvailableDate(date, limits)) return date;
    date = offsetDays(date, direction);
  }
  return undefined;
}

export function dateLocale(locale: string, host: HTMLElement): string {
  const requested = locale || host.closest('[lang]')?.getAttribute('lang') || host.ownerDocument.documentElement.lang;
  try {
    return new Intl.DateTimeFormat(requested || undefined).resolvedOptions().locale;
  } catch {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  }
}

export function localeFirstDay(locale: string): number {
  const info = new Intl.Locale(locale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
  if (firstDay !== undefined) return firstDay % 7;
  const region = info.maximize().region;
  return region === 'US' || region === 'CA' || region === 'JP' ? 0 : 1;
}
