import { DateTimeControl } from './date-time-control.js';
import { defineElement } from './define.js';

export type { MetroDateTimePickerLabels, MetroDateTimePresentation } from './date-time-control.js';

export class MetroTimePicker extends DateTimeControl {
  constructor() { super('time'); }
}

defineElement('metro-time-picker', MetroTimePicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-time-picker': MetroTimePicker; }
}
