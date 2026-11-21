import type { MetroCollectionItem } from './collection-control.js';

export class MetroSelectionSet<T extends MetroCollectionItem = MetroCollectionItem> extends EventTarget {
  #catalog = new Map<string, T>();
  #selected = new Set<string>();

  constructor(items: readonly T[] = []) {
    super();
    this.setCatalog(items);
  }

  get values(): readonly string[] { return [...this.#selected]; }
  get selectedItems(): readonly T[] { return this.values.map(value => this.#catalog.get(value)!); }
  has(value: string): boolean { return this.#selected.has(value); }

  setCatalog(items: readonly T[]): void {
    const catalog = new Map<string, T>();
    for (const item of items) if (item.value && !catalog.has(item.value)) catalog.set(item.value, item);
    const oldItems = this.selectedItems;
    this.#catalog = catalog;
    const changed = this.#set(this.values);
    if (!changed && this.selectedItems.some((item, index) => item !== oldItems[index])) this.dispatchEvent(new Event('change'));
  }

  toggle(value: string, selected = !this.has(value)): boolean {
    const item = this.#catalog.get(value);
    if (!item || item.disabled || this.has(value) === selected) return false;
    return this.#set(selected ? [...this.#selected, value] : this.values.filter(key => key !== value));
  }

  replaceScope(scope: readonly string[], selectedValues: readonly string[]): boolean {
    const keys = new Set(scope);
    const selected = new Set(selectedValues.filter(value => keys.has(value)));
    const next = this.values.filter(value => !keys.has(value) || selected.has(value));
    return this.#set([...next, ...selected]);
  }

  clear(): boolean { return this.#set([]); }

  #set(values: readonly string[]): boolean {
    const list = [...new Set(values)].filter(value => {
      const item = this.#catalog.get(value);
      return item && !item.disabled;
    });
    if (list.length === this.#selected.size && list.every(value => this.#selected.has(value))) return false;
    this.#selected = new Set(list);
    this.dispatchEvent(new Event('change'));
    return true;
  }
}
