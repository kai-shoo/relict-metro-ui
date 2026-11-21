import { defineElement } from './define.js';
import './option.js';
import type { MetroOption } from './option.js';
import { PickerControl, type PickerChoice } from './picker-control.js';

export class MetroListPicker extends PickerControl {
  static override properties = {
    multiple: { type: Boolean, reflect: true },
    fullScreen: { type: Boolean, reflect: true, attribute: 'full-screen' },
    selectedValues: { attribute: false, noAccessor: true },
  };

  declare multiple: boolean;
  declare fullScreen: boolean;

  #observer = new MutationObserver(records => {
    if (records.some(record => record.target !== this || record.type === 'childList')) this.choicesChanged();
  });

  constructor() {
    super();
    this.multiple = false;
    this.fullScreen = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'selected', 'slot'],
    });
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    super.disconnectedCallback();
  }

  get value() { return this.selectedValues[0] ?? ''; }
  set value(value: string) { this.selectedValues = value ? [value] : []; }

  get selectedValues() { return this.currentSelection; }
  set selectedValues(values: readonly string[]) { this.currentSelection = values; }

  protected override get multipleMode() { return this.multiple; }
  protected override get fullScreenMode() { return this.fullScreen; }

  protected override get initialSelection(): readonly string[] {
    const selected = this.#options().filter(option => option.hasAttribute('selected')).map(option => option.value);
    if (this.multiple && selected.length) return selected;
    return this.defaultValue ? [this.defaultValue] : selected;
  }

  protected override get choices(): readonly PickerChoice[] {
    return this.#options().map(option => ({
      value: option.value,
      label: option.label || option.textContent?.trim() || option.value,
      disabled: option.disabled,
    }));
  }

  #options(): MetroOption[] {
    const seen = new Set<string>();
    return Array.from(this.children).filter((child): child is MetroOption => {
      if (child.localName !== 'metro-option') return false;
      const option = child as MetroOption;
      if (!option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }
}

defineElement('metro-list-picker', MetroListPicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-picker': MetroListPicker; }
}
