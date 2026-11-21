import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { restorableAnchorOffset } from './collection-anchor.js';
import './list-item.js';
import type { MetroListItem } from './list-item.js';
import type { MetroScrollAnchor } from './scroll-viewer.js';
import { metroTheme } from './theme.js';

export type MetroSelectionMode = 'none' | 'single' | 'multiple';

export interface MetroCollectionItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export type MetroSelectionChangeEvent = CustomEvent<{ value: string; selectedValues: readonly string[] }>;
export type MetroItemActivateEvent = CustomEvent<{ value: string }>;

interface Entry extends MetroCollectionItem { source?: MetroListItem; data?: MetroCollectionItem; }

const interactive = 'a[href],button,input,textarea,select,summary,audio[controls],video[controls],'
  + '[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[tabindex]';

export abstract class CollectionControl extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    activatable: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    items: { attribute: false },
    value: { attribute: false, noAccessor: true },
    selectedValues: { attribute: false, noAccessor: true },
  };

  static override get observedAttributes() { return [...super.observedAttributes, 'value', 'aria-label', 'aria-labelledby']; }

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      min-block-size: 0;
      overflow: hidden auto;
      color: var(--_metro-fg);
      scrollbar-color: var(--_metro-border) transparent;
      scrollbar-width: thin;
    }
    .collection { display: grid; gap: var(--_collection-gap, 0px); }
    .collection:focus-visible, .item:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .row { display: grid; grid-template-columns: repeat(var(--_columns), minmax(0, 1fr)); gap: var(--_collection-gap, 0px); }
    .item {
      display: flex;
      align-items: center;
      gap: var(--metro-collection-item-gap, 0.75rem);
      box-sizing: border-box;
      min-inline-size: 0;
      min-block-size: var(--metro-collection-item-height, 2.75rem);
      padding: var(--metro-collection-item-padding, 0.5rem var(--_metro-space));
      overflow-wrap: anywhere;
    }
    .item[data-enabled] { cursor: pointer; }
    .item[data-enabled]:active { background: var(--_metro-chrome); }
    .item[data-selected] { color: var(--metro-collection-selected, var(--_metro-accent-text)); }
    .item[data-disabled] { opacity: .45; }
    .content { flex: 1; min-inline-size: 0; }
    .mark {
      display: grid;
      flex: none;
      place-items: center;
      box-sizing: border-box;
      inline-size: 25.5px;
      block-size: 25.5px;
      border: 2px solid currentColor;
    }
    .item[data-selected] .mark::after {
      content: '';
      inline-size: 12px;
      block-size: 7px;
      border: solid currentColor;
      border-width: 0 0 2px 2px;
      transform: translateY(-2px) rotate(-45deg);
    }
    .empty { display: block; }
    @media (forced-colors: active) {
      .item[data-selected] { color: Highlight; }
      .item[data-disabled] { color: GrayText; opacity: 1; }
      .collection:focus-visible, .item:focus-visible { outline-color: Highlight; }
    }
  `];

  declare label: string;
  declare selectionMode: MetroSelectionMode;
  declare activatable: boolean;
  declare disabled: boolean;
  declare items: readonly MetroCollectionItem[] | null;

  #entries: Entry[] = [];
  #selection?: readonly string[];
  #active = '';
  #range: { start: string; initial: readonly string[] } | undefined;
  #cells = new Map<string, HTMLElement>();
  #renderedColumns = 1;
  #width = 0;
  #focusAfterRender = false;
  #columnsChanged = false;
  #savedAnchor: MetroScrollAnchor | null = null;
  #pointerOrigin = '';
  #typed = '';
  #typedAt = 0;
  #observer = new MutationObserver(() => this.requestUpdate());
  #resize = new ResizeObserver(entries => {
    this.#width = entries[0].contentRect.width;
    if (this.columnCount !== this.#renderedColumns) this.requestUpdate();
  });

  constructor() {
    super();
    this.label = '';
    this.selectionMode = this.defaultSelectionMode;
    this.activatable = false;
    this.disabled = false;
    this.items = null;
  }

  protected abstract get layout(): 'listbox' | 'list' | 'grid';
  protected get defaultSelectionMode(): MetroSelectionMode { return 'none'; }
  protected get columnCount() { return 1; }
  protected get availableWidth() { return this.#width || this.clientWidth; }
  protected get adaptiveLayout() { return this.layout === 'grid'; }
  protected renderDataItem(item: MetroCollectionItem, _index: number): unknown { return item.label || item.value; }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['value', 'disabled', 'label', 'hidden'] });
    if (this.adaptiveLayout) this.#resize.observe(this);
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#resize.disconnect();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next) return;
    if (name === 'value') this.value = next ?? '';
    if (name === 'aria-label' || name === 'aria-labelledby') this.requestUpdate();
  }

  get value(): string { return this.selectedValues[0] ?? ''; }
  set value(value: string) { this.selectedValues = value ? [value] : []; }

  get selectedValues(): readonly string[] { return this.#selected(this.#collect()); }
  set selectedValues(values: readonly string[]) {
    this.#selection = [...values];
    this.#range = undefined;
    if (!this.matches(':focus-within')) this.#active = '';
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    if (!this.focusItem(this.#active, options) && this.#operable) {
      this.shadowRoot?.querySelector<HTMLElement>('.collection')?.focus(options);
    }
  }

  focusItem(value: string, options?: FocusOptions): boolean {
    const cell = this.#cells.get(value);
    if (!cell || !this.#operable || !this.#entries.some(item => item.value === value && !item.disabled)) return false;
    cell.focus(options);
    return this.shadowRoot?.activeElement === cell;
  }

  getAnchor(): MetroScrollAnchor | null {
    const top = this.getBoundingClientRect().top + this.clientTop;
    const bottom = top + this.clientHeight;
    for (const [key, cell] of this.#cells) {
      const rect = cell.getBoundingClientRect();
      if (rect.height && rect.bottom > top && rect.top < bottom) return { key, offset: rect.top - top, axis: 'vertical' };
    }
    return null;
  }

  restoreAnchor(anchor: MetroScrollAnchor): boolean {
    const cell = this.#cells.get(anchor.key);
    if (!cell || anchor.axis !== 'vertical' || !Number.isFinite(anchor.offset)) return false;
    const top = this.getBoundingClientRect().top + this.clientTop;
    const rect = cell.getBoundingClientRect();
    if (!rect.height) return false;
    this.scrollBy({ top: rect.top - top - restorableAnchorOffset(anchor.offset, rect.height), behavior: 'instant' });
    return true;
  }

  get #mode(): MetroSelectionMode {
    const mode = this.selectionMode;
    return mode === 'none' || mode === 'single' || mode === 'multiple' ? mode : this.defaultSelectionMode;
  }

  get #operable() { return !this.disabled && (this.#mode !== 'none' || this.activatable); }

  get #accessibleName(): string | typeof nothing {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const text = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (text) return text;
    }
    return this.getAttribute('aria-label') || this.label || nothing;
  }

  #collect(): Entry[] {
    const seen = new Set<string>();
    const entries: Entry[] = this.items === null
      ? Array.from(this.children).filter((child): child is MetroListItem =>
        child.localName === 'metro-list-item' && !(child as MetroListItem).hidden)
        .map(source => ({ value: source.value, label: source.label, disabled: source.disabled, source }))
      : Array.from(this.items ?? [], item => ({ value: item.value, label: item.label, disabled: item.disabled, data: item }));
    return entries.filter(entry => {
      if (!entry.value || seen.has(entry.value)) return false;
      seen.add(entry.value);
      return true;
    });
  }

  #selected(entries: readonly Entry[]): string[] {
    if (this.#mode === 'none') return [];
    const requested = new Set(this.#selection);
    const keys = entries.filter(item => !item.disabled && requested.has(item.value)).map(item => item.value);
    return this.#mode === 'single' ? keys.slice(0, 1) : keys;
  }

  #nearest(previous: readonly Entry[], value: string, enabledOnly: boolean) {
    const previousIndex = previous.findIndex(item => item.value === value);
    if (previousIndex < 0) return undefined;
    const valid = new Set(this.#entries.filter(item => !enabledOnly || !item.disabled).map(item => item.value));
    for (let distance = 1; distance < previous.length; distance++) {
      const next = previous[previousIndex + distance]?.value;
      const before = previous[previousIndex - distance]?.value;
      if (next && valid.has(next)) return next;
      if (before && valid.has(before)) return before;
    }
    return this.#entries[Math.min(previousIndex, this.#entries.length - 1)]?.value;
  }

  protected override willUpdate(): void {
    const previous = this.#entries;
    const next = this.#collect();
    const columns = this.columnCount;
    this.#columnsChanged = columns !== this.#renderedColumns;
    const layoutChanged = this.#columnsChanged || previous.length !== next.length || next.some((entry, index) =>
      entry.value !== previous[index]?.value || entry.source !== previous[index]?.source || entry.label !== previous[index]?.label,
    );
    const anchor = layoutChanged ? this.getAnchor() : null;
    this.#focusAfterRender = this.matches(':focus-within');
    this.#entries = next;
    this.#renderedColumns = columns;
    if (anchor) {
      const key = next.some(item => item.value === anchor.key) ? anchor.key : this.#nearest(previous, anchor.key, false);
      this.#savedAnchor = key ? { ...anchor, key } : null;
    }

    const selected = this.#selected(next);
    if (previous.length || next.length) this.#selection = selected;
    if (!next.some(item => item.value === this.#range?.start && !item.disabled)) this.#range = undefined;
    if (!next.some(item => item.value === this.#active && !item.disabled)) {
      const nearest = this.#nearest(previous, this.#active, true);
      this.#active = next.find(item => item.value === nearest && !item.disabled)?.value
        ?? selected[0] ?? next.find(item => !item.disabled)?.value ?? '';
    }
  }

  protected override updated(): void {
    const sources = new Map(this.#entries.map(item => [item.value, item.source]));
    for (const slot of this.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot[data-entry]')) {
      const source = sources.get(slot.dataset.entry!);
      if (source && slot.assignedElements()[0] !== source) slot.assign(source);
    }
    this.#cells = new Map(Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>('[data-collection-value]'),
      cell => [cell.dataset.collectionValue!, cell]));
    if (this.#savedAnchor) this.restoreAnchor(this.#savedAnchor);
    this.#savedAnchor = null;
    if (this.#focusAfterRender && !this.disabled && this.#needsFocus()) {
      if (this.#operable) this.focus({ preventScroll: true });
      else this.#cells.get(this.#active)?.focus({ preventScroll: true });
    }
    if (this.#columnsChanged) this.#revealFocusedCell();
  }

  #revealFocusedCell(): void {
    const cell = this.#cells.get(this.#active);
    if (!cell?.matches(':focus-within')) return;
    const top = this.getBoundingClientRect().top + this.clientTop;
    const bottom = top + this.clientHeight;
    const bounds = cell.getBoundingClientRect();
    if (bounds.top < top || bounds.height > this.clientHeight) {
      this.scrollBy({ top: bounds.top - top, behavior: 'instant' });
    } else if (bounds.bottom > bottom) {
      this.scrollBy({ top: bounds.bottom - bottom, behavior: 'instant' });
    }
  }

  #needsFocus() {
    if (!this.matches(':focus-within')) return true;
    const active = this.shadowRoot?.activeElement;
    return active instanceof HTMLElement && (Boolean(active.closest('[data-disabled]'))
      || (Boolean(this.#active) && active.classList.contains('collection')));
  }

  #entryForEvent(event: Event, excludeControls: boolean): Entry | undefined {
    for (const target of event.composedPath()) {
      if (!(target instanceof HTMLElement)) continue;
      if (target.getRootNode() === this.shadowRoot && target.hasAttribute('data-collection-value')) {
        return this.#entries.find(item => item.value === target.dataset.collectionValue);
      }
      if (excludeControls && target.matches(interactive)) return undefined;
    }
    return undefined;
  }

  #onFocus(event: FocusEvent): void {
    const entry = this.#entryForEvent(event, false);
    if (!entry || entry.disabled || !this.#operable || entry.value === this.#active) return;
    this.#active = entry.value;
    this.requestUpdate();
  }

  #publish(keys: readonly string[]): void {
    const old = this.#selected(this.#entries);
    this.#selection = [...keys];
    const selectedValues = this.#selected(this.#entries);
    if (old.length === selectedValues.length && old.every((key, index) => key === selectedValues[index])) return;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-selection-change', {
      detail: { value: selectedValues[0] ?? '', selectedValues }, bubbles: true, composed: true,
    }) satisfies MetroSelectionChangeEvent);
  }

  #activate(value: string): void {
    this.dispatchEvent(new CustomEvent('metro-item-activate', {
      detail: { value }, bubbles: true, composed: true,
    }) satisfies MetroItemActivateEvent);
  }

  #select(from: string, to: string, extend = false, additive = false): void {
    const selected = this.#selected(this.#entries);
    if (this.#mode === 'single') this.#publish([to]);
    if (this.#mode !== 'multiple') return;
    if (!extend) {
      const next = selected.includes(to) ? selected.filter(value => value !== to) : [...selected, to];
      this.#range = { start: to, initial: next };
      this.#publish(next);
      return;
    }
    this.#range ??= { start: from, initial: selected };
    const start = this.#entries.findIndex(item => item.value === this.#range?.start);
    const end = this.#entries.findIndex(item => item.value === to);
    const keys = this.#entries.slice(Math.min(start, end), Math.max(start, end) + 1)
      .filter(item => !item.disabled).map(item => item.value);
    this.#publish(additive ? [...this.#range.initial, ...keys] : keys);
  }

  #onClick(event: MouseEvent): void {
    const previous = this.#pointerOrigin || this.#active;
    this.#pointerOrigin = '';
    if (!this.#operable || event.defaultPrevented || event.button !== 0) return;
    const entry = this.#entryForEvent(event, true);
    if (!entry || entry.disabled) return;
    this.focusItem(entry.value, { preventScroll: true });
    if (this.#mode === 'none') this.#activate(entry.value);
    else this.#select(previous || entry.value, entry.value, event.shiftKey, event.ctrlKey || event.metaKey);
  }

  #nextIndex(current: number, key: string, modifier: boolean): number {
    const count = this.#entries.length;
    const columns = this.#renderedColumns;
    const rowStart = Math.floor(current / columns) * columns;
    const rowEnd = Math.min(count - 1, rowStart + columns - 1);
    const grid = this.layout === 'grid';
    const rtl = grid && getComputedStyle(this).direction === 'rtl';
    let start: number, step: number, stop: number;
    switch (key) {
      case 'ArrowUp': start = current - columns; step = -columns; stop = 0; break;
      case 'ArrowDown': start = current + columns; step = columns; stop = count - 1; break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (!grid) return -1;
        step = (key === 'ArrowRight') !== rtl ? 1 : -1;
        start = current + step;
        stop = step > 0 ? rowEnd : rowStart;
        break;
      case 'Home': start = grid && !modifier ? rowStart : 0; step = 1; stop = grid && !modifier ? rowEnd : count - 1; break;
      case 'End': start = grid && !modifier ? rowEnd : count - 1; step = -1; stop = grid && !modifier ? rowStart : 0; break;
      default: return -1;
    }
    for (let index = start; step > 0 ? index <= stop : index >= stop; index += step) {
      if (this.#entries[index] && !this.#entries[index].disabled) return index;
    }
    return current;
  }

  #typeAhead(current: number, key: string): number {
    const now = performance.now();
    const letter = key.toLocaleLowerCase();
    this.#typed = now - this.#typedAt > 650 ? letter : this.#typed + letter;
    this.#typedAt = now;
    const repeated = Array.from(this.#typed).every(char => char === letter);
    const prefix = repeated ? letter : this.#typed;
    const start = current + Number(repeated);
    for (let offset = 0; offset < this.#entries.length; offset++) {
      const index = (start + offset) % this.#entries.length;
      const item = this.#entries[index];
      if (item.disabled) continue;
      const name = (item.label || item.source?.textContent || item.value).trim().toLocaleLowerCase();
      if (name.startsWith(prefix)) return index;
    }
    return -1;
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!this.#operable || event.defaultPrevented || event.altKey || event.isComposing) return;
    const entry = this.#entryForEvent(event, true);
    if (!entry || entry.disabled) return;
    const { key } = event;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && key.toLowerCase() === 'a' && this.#mode === 'multiple') {
      event.preventDefault();
      this.#range = undefined;
      this.#publish(this.#entries.filter(item => !item.disabled).map(item => item.value));
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (!event.repeat && this.activatable && (this.#mode === 'none' || key === 'Enter')) this.#activate(entry.value);
      else if (!event.repeat) this.#select(entry.value, entry.value, event.shiftKey, modifier);
      return;
    }
    const index = this.#entries.indexOf(entry);
    const next = this.layout === 'listbox' && !modifier && key.length === 1
      ? this.#typeAhead(index, key)
      : this.#nextIndex(index, key, modifier);
    if (next < 0) return;
    event.preventDefault();
    if (next === index) return;
    const value = this.#entries[next].value;
    this.focusItem(value);
    if (this.#mode === 'multiple' && event.shiftKey) this.#select(entry.value, value, true, modifier);
    else if (this.#mode === 'single' && this.layout === 'listbox' && !modifier) this.#publish([value]);
    else this.#range = undefined;
  }

  #renderItem(item: Entry, selected: Set<string>, role: string, index: number) {
    const disabled = this.disabled || item.disabled;
    const checked = selected.has(item.value);
    const active = item.value === this.#active;
    const focusable = !disabled && (this.#operable || (this.#focusAfterRender && active));
    const contentLabel = item.label || (disabled ? item.source?.textContent?.trim() || item.value : '');
    return html`
      <div class="item" part="item" data-collection-value=${item.value} role=${role}
        tabindex=${focusable ? (this.#operable && active ? 0 : -1) : nothing}
        aria-label=${contentLabel || nothing} aria-disabled=${disabled && role !== 'listitem' ? 'true' : nothing}
        aria-selected=${role !== 'listitem' && this.#mode !== 'none' ? String(checked) : nothing}
        ?data-disabled=${disabled} ?data-selected=${checked} ?data-enabled=${this.#operable && !disabled}>
        ${this.#mode === 'multiple' ? html`<span class="mark" part="mark" aria-hidden="true"></span>` : nothing}
        <div class="content" part="content" ?inert=${disabled}>
          ${item.source ? html`<slot data-entry=${item.value}></slot>` : this.renderDataItem(item.data ?? item, index)}
        </div>
      </div>
    `;
  }

  protected override render() {
    const selected = new Set(this.#selected(this.#entries));
    const listbox = this.layout === 'listbox' && this.#mode !== 'none';
    const grid = !listbox && (this.#mode !== 'none' || this.activatable);
    const role = listbox ? 'listbox' : grid ? 'grid' : 'list';
    const itemRole = listbox ? 'option' : grid ? 'gridcell' : 'listitem';
    const columns = this.#renderedColumns;
    const entries = this.#entries;
    const renderItems = (items: Entry[], offset = 0) => repeat(items, item => item.value,
      (item, index) => this.#renderItem(item, selected, itemRole, offset + index));
    const rows = Array.from({ length: Math.ceil(entries.length / columns) }, (_, i) => entries.slice(i * columns, (i + 1) * columns));
    return html`
      <div class="collection" part="viewport" role=${role} style="--_columns: ${columns}"
        aria-label=${this.#accessibleName}
        aria-disabled=${this.disabled && role !== 'list' ? 'true' : nothing}
        aria-multiselectable=${this.#mode === 'multiple' ? 'true' : nothing}
        tabindex=${this.#operable && !this.#active ? '0' : nothing}
        @focusin=${this.#onFocus} @pointerdown=${() => { this.#pointerOrigin = this.#active; }}
        @click=${this.#onClick} @keydown=${this.#onKeyDown}>
        ${grid || this.layout === 'grid' ? repeat(rows, row => row[0].value, (row, index) => html`
          <div class="row" part="row" role=${grid ? 'row' : 'presentation'}>${renderItems(row, index * columns)}</div>
        `) : renderItems(entries)}
      </div>
      ${entries.length === 0 ? html`<slot name="empty" class="empty"></slot>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'metro-selection-change': MetroSelectionChangeEvent;
    'metro-item-activate': MetroItemActivateEvent;
  }
}
