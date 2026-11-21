import { DateTimeControl } from './date-time-control.js';
import { defineElement } from './define.js';

export type { MetroDateTimePickerLabels, MetroDateTimePresentation } from './date-time-control.js';

export class MetroDatePicker extends DateTimeControl {
  constructor() { super('date'); }
}

defineElement('metro-date-picker', MetroDatePicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-date-picker': MetroDatePicker; }
}
