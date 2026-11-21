import { defineElement } from './define.js';
import { TextControl } from './text-control.js';

export type MetroTextBoxType = 'text' | 'search' | 'email' | 'url' | 'tel';

const textTypes = new Set<MetroTextBoxType>(['text', 'search', 'email', 'url', 'tel']);

export class MetroTextBox extends TextControl {
  static override properties = {
    type: { type: String, reflect: true },
    multiline: { type: Boolean, reflect: true },
    rows: { type: Number, reflect: true },
  };

  declare type: MetroTextBoxType;
  declare multiline: boolean;
  declare rows: number;

  constructor() {
    super();
    this.type = 'text';
    this.multiline = false;
    this.rows = 3;
  }

  protected override get editorType() {
    return textTypes.has(this.type) ? this.type : 'text';
  }

  protected override get editorRows() {
    if (!this.multiline) return 0;
    return Number.isFinite(this.rows) && this.rows >= 1 ? Math.floor(this.rows) : 3;
  }
}

defineElement('metro-text-box', MetroTextBox);

declare global {
  interface HTMLElementTagNameMap {
    'metro-text-box': MetroTextBox;
  }
}
