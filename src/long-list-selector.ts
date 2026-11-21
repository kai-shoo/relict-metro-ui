import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { restorableAnchorOffset } from './collection-anchor.js';
import type { MetroCollectionItem, MetroItemActivateEvent, MetroSelectionChangeEvent, MetroSelectionMode } from './collection-control.js';
import { defineElement } from './define.js';
import './dialog.js';
import type { MetroDialog } from './dialog.js';
import './list-group.js';
import type { MetroListGroup, MetroListGroupData } from './list-group.js';
import type { MetroScrollAnchor } from './scroll-viewer.js';
import { metroTheme } from './theme.js';

export type { MetroListGroupData } from './list-group.js';

export interface MetroLongListAnchor extends MetroScrollAnchor {
  axis: 'vertical';
  group?: true;
}

export type MetroGroupJumpEvent = CustomEvent<{ value: string; itemValue: string | null }>;

interface Row {
  id: string;
  group: MetroListGroupData;
  item?: MetroCollectionItem;
  start: number;
  height: number;
  index: number;
}

const rowId = (value: string, group: boolean) => `${group ? 'group:' : 'item:'}${value}`;
const dimension = (value: number, fallback: number) => Number.isFinite(value) && value > 0 ? value : fallback;
const alphabetInitial = /^\p{L}\p{M}*$/u;

export class MetroLongListSelector extends LitElement {
  static override properties: PropertyDeclarations = {
    groups: { attribute: false },
    label: { type: String },
    jumpLabel: { type: String, attribute: 'jump-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    activatable: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    groupSelection: { type: Boolean, attribute: 'group-selection' },
    itemHeight: { type: Number, attribute: 'item-height' },
    groupHeight: { type: Number, attribute: 'group-height' },
    currentItem: { type: String, attribute: 'current-item' },
    value: { attribute: false, noAccessor: true },
    selectedValues: { attribute: false, noAccessor: true },
  };

  static override get observedAttributes() { return [...super.observedAttributes, 'value', 'aria-label']; }

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .viewport {
      position: relative;
      block-size: var(--metro-long-list-height, min(65dvh, 30rem));
      overflow: hidden auto;
      overflow-anchor: none;
      scrollbar-color: var(--_metro-border) transparent;
      scrollbar-width: thin;
    }
    .header, .after-rows, .footer { display: flow-root; }
    .grid[aria-rowcount="0"] { min-block-size: 1px; }
    .window { position: relative; }
    .row { position: absolute; inset-inline: 0; }
    .row[data-pinned] { z-index: 1; background: var(--_metro-bg); }
    .cell {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      block-size: 100%;
      gap: var(--_metro-space);
      overflow: hidden;
      padding-inline: var(--_metro-space);
    }
    .item-label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .cell[aria-current="true"]::before {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      border-inline-start: 3px solid var(--_metro-accent-text);
      pointer-events: none;
    }
    .cell[data-selected] { color: var(--_metro-accent-text); }
    .cell[data-disabled] { opacity: .45; }
    .cell[data-enabled] { cursor: pointer; }
    .cell[data-enabled]:active { background: var(--_metro-chrome); }
    .check {
      box-sizing: border-box;
      display: grid;
      flex: none;
      place-items: center;
      inline-size: 25.5px;
      block-size: 25.5px;
      border: 2px solid currentColor;
    }
    .cell[data-selected] .check::after {
      content: '';
      inline-size: .75rem;
      block-size: .45rem;
      border: solid currentColor;
      border-width: 0 0 2px 2px;
      transform: translateY(-2px) rotate(-45deg);
    }
    button {
      box-sizing: border-box;
      border-radius: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .overview {
      max-inline-size: max(0px, calc(100% - 2 * var(--_metro-space)));
      min-block-size: 2.75rem;
      margin: 0 var(--_metro-space) .5rem;
      padding-block: .25rem;
      padding-inline: min(.75rem, 5%);
      border: 2px solid currentColor;
      background: transparent;
      overflow-wrap: anywhere;
    }
    .group {
      min-inline-size: min(62px, 100%);
      block-size: min(62px, 100%);
      padding: 0 .5rem;
      border: 0;
      background: var(--metro-jump-tile-background, var(--_metro-accent));
      color: var(--metro-jump-tile-color, var(--_metro-on-accent));
      font-size: 1.75rem;
      text-align: start;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .group-select { inline-size: 1.6rem; block-size: 1.6rem; accent-color: var(--_metro-accent); }
    .jump-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(99px, 100%), 1fr));
      gap: 6px;
      padding-block: .5rem;
    }
    .jump-grid:not(:has(> .jump-tile:not([data-initial]))) {
      grid-template-columns: repeat(auto-fill, min(99px, 100%));
    }
    .jump-grid:not(:has(> .jump-tile:not([data-initial]))) > .jump-tile {
      aspect-ratio: 1;
      min-block-size: 0;
    }
    .jump-tile {
      min-block-size: 99px;
      padding: .5rem;
      border: 0;
      overflow-wrap: anywhere;
      background: var(--metro-jump-tile-background, var(--_metro-accent));
      color: var(--metro-jump-tile-color, var(--_metro-on-accent));
      font-size: clamp(1.35rem, 8vi, 3rem);
    }
    .jump-tile:disabled { background: var(--_metro-bg); color: var(--_metro-disabled); }
    button[data-initial] {
      display: grid;
      align-content: end;
      justify-content: start;
      padding-block: 0;
      padding-inline: 8px 0;
      line-height: 1.15;
    }
    .group[data-initial] {
      min-inline-size: 0;
      inline-size: min(100%, var(--_initial-tile));
      font-size: calc(var(--_initial-tile) * 48 / 62);
      font-weight: 350;
    }
    .jump-tile[data-initial] { font-size: min(3rem, 72px); font-weight: 600; }
    button:disabled { cursor: default; opacity: .6; }
    :is(button, input, .grid, .cell):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    @media (forced-colors: active) {
      .cell[data-disabled] { color: GrayText; opacity: 1; }
      .cell[data-selected] { color: Highlight; }
      .cell[aria-current="true"]::before { border-color: Highlight; }
      :is(button, input, .grid, .cell):focus-visible { outline-color: Highlight; }
    }
  `];

  declare groups: readonly MetroListGroupData[] | null;
  declare label: string;
  declare jumpLabel: string;
  declare cancelLabel: string;
  declare selectionMode: MetroSelectionMode;
  declare activatable: boolean;
  declare disabled: boolean;
  declare groupSelection: boolean;
  declare itemHeight: number;
  declare groupHeight: number;
  declare currentItem: string;

  #groups: MetroListGroupData[] = [];
  #rows: Row[] = [];
  #byId = new Map<string, Row>();
  #totalHeight = 0;
  #viewportHeight = 400;
  #leading = 0;
  #trailing = 0;
  #scrollTop = 0;
  #applyScroll: number | undefined;
  #active = '';
  #focusTo = '';
  #selection: readonly string[] = [];
  #range: { start: string; initial: readonly string[] } | undefined;
  #pointerOrigin = '';
  #typed = '';
  #typedAt = 0;
  #changed = true;
  #jumpOpen = false;
  #jumpAnchor: MetroLongListAnchor | null = null;
  #jumpTarget: string | undefined;
  #chosenGroup: string | null = null;

  #observer = new MutationObserver(() => {
    if (this.groups !== null) return;
    this.#changed = true;
    this.requestUpdate();
  });

  #resize = new ResizeObserver(() => this.#measureLayout());

  constructor() {
    super();
    this.groups = null;
    this.label = '';
    this.jumpLabel = 'Groups';
    this.cancelLabel = 'Cancel';
    this.selectionMode = 'none';
    this.activatable = false;
    this.disabled = false;
    this.groupSelection = false;
    this.itemHeight = 56;
    this.groupHeight = 78;
    this.currentItem = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'hidden'] });
    this.#observeLayout();
    this.#changed = true;
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#resize.disconnect();
    this.#typed = '';
    this.#jumpOpen = false;
    this.#jumpAnchor = null;
    this.#jumpTarget = undefined;
    this.#chosenGroup = null;
    const dialog = this.#dialog;
    if (dialog) dialog.open = false;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next) return;
    if (name === 'value') this.value = next ?? '';
    if (name === 'aria-label') this.requestUpdate();
  }

  get value() { return this.selectedValues[0] ?? ''; }
  set value(value: string) { this.selectedValues = value ? [value] : []; }
  get selectedValues(): readonly string[] { return this.#selected(this.#selection); }
  set selectedValues(values: readonly string[]) {
    this.#selection = [...values];
    this.#range = undefined;
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    if (this.disabled) return;
    const current = this.#tabStop(this.#window());
    if (current) this.#focusRow(current, !options?.preventScroll);
    else this.#grid?.focus(options);
  }

  focusItem(value: string): boolean {
    const row = this.#byId.get(rowId(value, false));
    if (this.disabled || !row || row.item?.disabled) return false;
    this.#typed = '';
    this.#measureLayout();
    this.#focusRow(row);
    return true;
  }

  getAnchor(): MetroLongListAnchor | null {
    return this.#anchorAt(this.#viewport?.scrollTop ?? this.#scrollTop);
  }

  #anchorAt(scrollTop: number): MetroLongListAnchor | null {
    const top = scrollTop - this.#leading;
    const row = this.#rows[this.#rowAt(top)];
    return row && row.start < top + this.#viewportHeight
      ? { key: row.item?.value ?? row.group.value, offset: row.start - top, axis: 'vertical',
      ...(row.item ? {} : { group: true }) } : null;
  }

  restoreAnchor(anchor: MetroLongListAnchor): boolean {
    const row = this.#byId.get(rowId(anchor.key, Boolean(anchor.group)));
    if (anchor.axis !== 'vertical' || !Number.isFinite(anchor.offset) || !row) return false;
    this.#restoreRowOffset(row, anchor.offset);
    return true;
  }

  #restoreRowOffset(row: Row, offset: number): void {
    this.#position(this.#leading + row.start - restorableAnchorOffset(offset, row.height));
  }

  jumpToGroup(value: string): boolean {
    const header = this.#byId.get(rowId(value, true));
    if (this.disabled || !header) return false;
    this.#typed = '';
    this.#position(this.#leading + header.start);
    const first = header.group.items.find(item => !item.disabled);
    const row = first && this.#byId.get(rowId(first.value, false));
    this.#focusRow(row && this.#leading + row.start < this.#scrollTop + this.#viewportHeight ? row : header, false);
    return true;
  }

  get #viewport() { return this.shadowRoot?.querySelector<HTMLElement>('.viewport'); }
  get #grid() { return this.shadowRoot?.querySelector<HTMLElement>('.grid'); }
  get #dialog() { return this.shadowRoot?.querySelector<MetroDialog>('metro-dialog'); }
  get #mode(): MetroSelectionMode {
    return this.selectionMode === 'single' || this.selectionMode === 'multiple' ? this.selectionMode : 'none';
  }

  #readGroups(): MetroListGroupData[] {
    const sources = this.groups ?? Array.from(this.children).filter((child): child is MetroListGroup =>
      child.localName === 'metro-list-group' && !(child as HTMLElement).hidden && !child.slot);
    const groups = new Set<string>();
    const items = new Set<string>();
    return Array.from(sources).filter(group => {
      if (!group.value || groups.has(group.value)) return false;
      groups.add(group.value);
      return true;
    }).map(group => {
      const entries = group.items.filter(item => {
        if (!item.value || items.has(item.value)) return false;
        items.add(item.value);
        return true;
      });
      return { value: group.value, label: group.label || group.value, items: entries };
    });
  }

  #rebuild(revealFocused: boolean): void {
    const old = this.#rows;
    const anchor = this.getAnchor();
    const visibleFocus = revealFocused ? this.#visibleFocusedRow() : undefined;
    const hadFocus = this.#grid?.matches(':focus-within');
    const focused = this.shadowRoot?.activeElement;
    const focusedId = focused instanceof HTMLElement ? focused.dataset.rowFocus : undefined;
    const rows: Row[] = [];
    let start = 0;
    const itemHeight = dimension(this.itemHeight, 56);
    const groupHeight = dimension(this.groupHeight, 78);
    this.#groups = this.#readGroups();
    for (const group of this.#groups) {
      if (!group.items.length) continue;
      rows.push({ id: rowId(group.value, true), group, start, height: groupHeight, index: rows.length });
      start += groupHeight;
      for (const item of group.items) {
        rows.push({ id: rowId(item.value, false), group, item, start, height: itemHeight, index: rows.length });
        start += itemHeight;
      }
    }
    this.#rows = rows;
    this.#byId = new Map(rows.map(row => [row.id, row]));
    this.#totalHeight = start;
    if (this.#range) {
      const start = this.#byId.get(this.#range.start);
      if (!start || start.item?.disabled) this.#range = undefined;
    }
    if (anchor) {
      const id = rowId(anchor.key, Boolean(anchor.group));
      const row = this.#byId.get(id) ?? this.#nearest(old, id, false);
      if (row) this.#restoreRowOffset(row, anchor.offset);
    }

    const current = this.#byId.get(this.#active);
    if (!current || current.item?.disabled) {
      const next = this.#nearest(old, this.#active, true) ?? rows.find(row => !row.item?.disabled);
      this.#active = next?.id ?? '';
      if (hadFocus) this.#focusTo = next?.id ?? 'grid';
    } else if (focusedId === current.id) {
      if (visibleFocus?.id === current.id) this.#revealRow(current);
      this.#focusTo = current.id;
    }
  }

  #nearest(previous: Row[], id: string, enabled: boolean): Row | undefined {
    const index = previous.findIndex(row => row.id === id);
    if (index < 0) return undefined;
    for (let distance = 1; distance < previous.length; distance++) {
      for (const old of [previous[index + distance], previous[index - distance]]) {
        const current = old && this.#byId.get(old.id);
        if (current && (!enabled || !current.item?.disabled)) return current;
      }
    }
    return undefined;
  }

  #selected(values: readonly string[]): string[] {
    if (this.#mode === 'none') return [];
    const selected = [...new Set(values)].map(value => this.#byId.get(rowId(value, false)))
      .filter((row): row is Row & { item: MetroCollectionItem } => Boolean(row?.item && !row.item.disabled))
      .sort((first, second) => first.index - second.index)
      .map(row => row.item.value);
    return this.#mode === 'single' ? selected.slice(0, 1) : selected;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.#changed || changed.has('groups') || changed.has('itemHeight') || changed.has('groupHeight')) {
      const hadRows = this.#rows.length > 0;
      this.#changed = false;
      this.#rebuild(changed.has('itemHeight') || changed.has('groupHeight'));
      if (hadRows || this.#rows.length) this.#selection = this.#selected(this.#selection);
    }
    if (changed.has('selectionMode')) {
      this.#range = undefined;
      if (this.#rows.length) this.#selection = this.#selected(this.#selection);
    }
  }

  protected override firstUpdated(): void {
    this.#observeLayout();
  }

  #observeLayout(): void {
    for (const element of this.shadowRoot?.querySelectorAll('.viewport, .header, .after-rows') ?? []) {
      this.#resize.observe(element, { box: 'border-box' });
    }
    this.#measureLayout();
  }

  #measureLayout(): void {
    const viewport = this.#viewport;
    const grid = this.#grid;
    const tail = this.shadowRoot?.querySelector<HTMLElement>('.after-rows');
    if (!viewport || !grid || !tail) return;
    const top = viewport.scrollTop;
    const height = viewport.clientHeight;
    const leading = grid.offsetTop;
    const trailing = tail.offsetHeight;
    if (height === this.#viewportHeight && leading === this.#leading && trailing === this.#trailing) return;
    const focused = height !== this.#viewportHeight ? this.#visibleFocusedRow() : undefined;
    const anchor = top > 0 && leading !== this.#leading ? this.#anchorAt(top) : null;
    this.#viewportHeight = height;
    this.#leading = leading;
    this.#trailing = trailing;
    if (anchor) this.restoreAnchor(anchor);
    else if (this.#applyScroll === undefined) this.#scrollTop = top;
    if (focused) this.#revealRow(focused);
    this.requestUpdate();
  }

  protected override updated(): void {
    const viewport = this.#viewport;
    if (!viewport) return;
    if (this.#applyScroll !== undefined) {
      viewport.scrollTop = this.#applyScroll;
      this.#applyScroll = undefined;
      if (this.#scrollTop !== viewport.scrollTop) {
        this.#scrollTop = viewport.scrollTop;
        this.requestUpdate();
      }
    }
    const focus = this.#focusTo;
    this.#focusTo = '';
    if (!focus || this.disabled) return;
    const target = focus === 'grid' ? this.#grid : this.#focusElement(focus);
    target?.focus({ preventScroll: true });
  }

  #position(top: number): void {
    const height = this.#viewport?.clientHeight || this.#viewportHeight;
    this.#scrollTop = Math.max(0, Math.min(top, this.#leading + this.#totalHeight + this.#trailing - height));
    this.#applyScroll = this.#scrollTop;
    this.requestUpdate();
  }

  #onScroll(): void {
    const top = this.#viewport?.scrollTop;
    if (top === undefined || this.#applyScroll !== undefined || top === this.#scrollTop) return;
    this.#scrollTop = top;
    this.requestUpdate();
  }

  #rowAt(top: number): number {
    let low = 0;
    let high = this.#rows.length;
    while (low < high) {
      const index = (low + high) >>> 1;
      const row = this.#rows[index];
      if (row.start + row.height <= top) low = index + 1;
      else high = index;
    }
    return low;
  }

  #canPin(header: Row): boolean {
    // Leave room for an item below the header, including in compact viewports.
    return header.height + this.#rows[header.index + 1].height <= this.#viewportHeight;
  }

  #pinnedHeader() {
    const top = this.#scrollTop - this.#leading;
    const first = this.#rows[this.#rowAt(top)];
    if (!first?.item) return undefined;
    const row = this.#byId.get(rowId(first.group.value, true));
    if (!row || !this.#canPin(row)) return undefined;
    const next = this.#rows[row.index + 1 + row.group.items.length];
    const start = Math.min(top, (next?.start ?? this.#totalHeight) - row.height);
    return { row, start };
  }

  #window(pinned = this.#pinnedHeader()?.row): Row[] {
    const top = this.#scrollTop - this.#leading;
    const start = this.#rowAt(top);
    const end = this.#rowAt(top + this.#viewportHeight);
    const rows = this.#rows.slice(Math.max(0, start - 3), end + 4);
    const active = this.#byId.get(this.#active);
    const focused = Boolean(this.#grid?.matches(':focus-within') || this.#focusTo);
    // The pinned header is the original grid row, even after it leaves overscan.
    if (pinned && !rows.includes(pinned)) rows.unshift(pinned);
    if (active && !rows.includes(active) && focused) {
      rows.push(active);
      rows.sort((a, b) => a.index - b.index);
    }
    return rows;
  }

  #focusElement(id: string): HTMLElement | undefined {
    return Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>('[data-row-focus]') ?? [])
      .find(element => element.dataset.rowFocus === id);
  }

  #tabStop(rows: Row[]): Row | undefined {
    const enabled = rows.filter(row => !row.item?.disabled);
    const active = enabled.find(row => row.id === this.#active);
    if (active && (this.#focusTo || this.#grid?.matches(':focus-within'))) return active;
    const top = this.#scrollTop - this.#leading;
    const bottom = top + this.#viewportHeight;
    const pinned = this.#pinnedHeader();
    const unobscuredTop = pinned ? pinned.start + pinned.row.height : top;
    const contained = (row: Row) => row.start >= unobscuredTop && row.start + row.height <= bottom;
    if (active && contained(active)) return active;
    return enabled.find(contained)
      ?? enabled.find(row => row.start < bottom && row.start + row.height > unobscuredTop)
      ?? enabled[0];
  }

  #visibleFocusedRow(): Row | undefined {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    const row = this.#byId.get(active?.dataset.rowFocus ?? '');
    if (!row) return undefined;
    const start = this.#leading + row.start;
    if (start >= this.#scrollTop - 1 && start + Math.min(row.height, this.#viewportHeight)
      <= this.#scrollTop + this.#viewportHeight + 1) return row;
    return undefined;
  }

  #revealRow(row: Row): void {
    const start = this.#leading + row.start;
    const header = row.item && this.#byId.get(rowId(row.group.value, true));
    const reserve = header && this.#canPin(header) ? header.height : 0;
    const pinned = this.#pinnedHeader();
    const unobscuredTop = pinned ? this.#leading + pinned.start + pinned.row.height : this.#scrollTop;
    if (start < (row.item ? unobscuredTop : this.#scrollTop) || row.height > this.#viewportHeight) {
      this.#position(start - reserve);
    }
    else if (start + row.height > this.#scrollTop + this.#viewportHeight) {
      this.#position(start + row.height - this.#viewportHeight);
    }
  }

  #focusRow(row: Row, scroll = true): void {
    this.#active = row.id;
    if (scroll) this.#revealRow(row);
    this.#focusTo = row.id;
    this.requestUpdate();
  }

  #onFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const id = target.dataset.rowFocus ?? target.closest<HTMLElement>('[data-row]')?.dataset.row;
    if (!id || id === this.#active) return;
    this.#active = id;
    this.requestUpdate();
  }

  #publish(values: readonly string[]): void {
    const previous = this.selectedValues;
    this.#selection = this.#selected(values);
    if (previous.length === this.#selection.length && previous.every((value, index) => value === this.#selection[index])) return;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-selection-change', {
      detail: { value: this.value, selectedValues: [...this.#selection] }, bubbles: true, composed: true,
    }) satisfies MetroSelectionChangeEvent);
  }

  #activate(row: Row): void {
    if (!this.activatable || !row.item || row.item.disabled || this.disabled) return;
    this.dispatchEvent(new CustomEvent('metro-item-activate', {
      detail: { value: row.item.value }, bubbles: true, composed: true,
    }) satisfies MetroItemActivateEvent);
  }

  #select(row: Row, extend = false, from = row.id, additive = false): void {
    if (!row.item || row.item.disabled || this.#mode === 'none') return;
    const key = row.item.value;
    if (this.#mode === 'single') {
      this.#publish([key]);
      return;
    }
    if (!extend) {
      const values = this.selectedValues;
      const next = values.includes(key) ? values.filter(value => value !== key) : [...values, key];
      this.#range = { start: row.id, initial: next };
      this.#publish(next);
      return;
    }
    this.#range ??= { start: from, initial: this.selectedValues };
    const start = this.#byId.get(this.#range.start)?.index ?? row.index;
    const values = this.#rows.slice(Math.min(start, row.index), Math.max(start, row.index) + 1)
      .flatMap(entry => entry.item && !entry.item.disabled ? [entry.item.value] : []);
    this.#publish(additive ? [...this.#range.initial, ...values] : values);
  }

  #onItemClick(row: Row, event: MouseEvent): void {
    const origin = this.#pointerOrigin || this.#active || row.id;
    this.#pointerOrigin = '';
    if (this.disabled || row.item?.disabled || event.defaultPrevented || event.button !== 0) return;
    if (this.#mode === 'none') this.#activate(row);
    else this.#select(row, event.shiftKey, origin, event.ctrlKey || event.metaKey);
  }

  #typeAhead(current: Row, key: string): Row | undefined {
    const now = performance.now();
    const letter = key.toLocaleLowerCase();
    this.#typed = now - this.#typedAt > 650 ? letter : this.#typed + letter;
    this.#typedAt = now;
    const repeated = Array.from(this.#typed).every(char => char === letter);
    const prefix = repeated ? letter : this.#typed;
    const start = current.index + Number(repeated);
    for (let offset = 0; offset < this.#rows.length; offset++) {
      const row = this.#rows[(start + offset) % this.#rows.length];
      const item = row.item;
      if (item && !item.disabled && (item.label || item.value).trim().toLocaleLowerCase().startsWith(prefix)) return row;
    }
    return undefined;
  }

  #onKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.altKey || this.disabled) return;
    const row = this.#byId.get((event.target as HTMLElement).dataset.rowFocus ?? '');
    if (!row) return;
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key;
    if (modifier && key.toLowerCase() === 'a' && this.#mode === 'multiple') {
      event.preventDefault();
      this.#range = undefined;
      this.#publish(this.#rows.flatMap(entry => entry.item && !entry.item.disabled ? [entry.item.value] : []));
      return;
    }
    if (row.item && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      if (event.repeat) return;
      if (this.#mode === 'none' || (key === 'Enter' && this.activatable)) this.#activate(row);
      else this.#select(row, event.shiftKey, row.id, modifier);
      return;
    }
    let index: number;
    let direction: number;
    switch (key) {
      case 'Home': index = 0; direction = 1; break;
      case 'End': index = this.#rows.length - 1; direction = -1; break;
      case 'ArrowUp': index = row.index - 1; direction = -1; break;
      case 'ArrowDown': index = row.index + 1; direction = 1; break;
      case 'PageUp': index = this.#rowAt(Math.max(0, row.start - this.#viewportHeight)); direction = -1; break;
      case 'PageDown': index = Math.min(this.#rows.length - 1, this.#rowAt(row.start + this.#viewportHeight)); direction = 1; break;
      default: {
        const next = !modifier && key.length === 1 && key !== ' ' ? this.#typeAhead(row, key) : undefined;
        if (next) {
          event.preventDefault();
          this.#range = undefined;
          this.#focusRow(next);
        }
        return;
      }
    }
    event.preventDefault();
    this.#typed = '';
    while (this.#rows[index]?.item?.disabled) index += direction;
    const next = this.#rows[index];
    if (!next || next === row) return;
    this.#focusRow(next);
    if (event.shiftKey && this.#mode === 'multiple') this.#select(next, true, row.id, modifier);
    else this.#range = undefined;
  }

  #toggleGroup(group: MetroListGroupData): void {
    const selection = new Set(this.selectedValues);
    const enabled = group.items.filter(item => !item.disabled);
    const checked = enabled.every(item => selection.has(item.value));
    for (const item of enabled) {
      if (checked) selection.delete(item.value);
      else selection.add(item.value);
    }
    this.#publish([...selection]);
  }

  #showJump(event: MouseEvent): void {
    if (this.#jumpOpen) return;
    const trigger = event.currentTarget as HTMLElement;
    this.#jumpAnchor = this.getAnchor();
    this.#jumpTarget = trigger.dataset.rowFocus;
    this.#jumpOpen = true;
    this.requestUpdate();
    void this.updateComplete.then(() => { if (this.#jumpOpen && this.isConnected) this.#dialog?.show(trigger); });
  }

  #chooseGroup(value: string): void {
    this.#chosenGroup = value;
    if (!this.#dialog?.close()) this.#chosenGroup = null;
  }

  #closeJump(): void {
    const choice = this.#chosenGroup;
    const anchor = this.#jumpAnchor;
    const trigger = this.#jumpTarget;
    this.#chosenGroup = null;
    this.#jumpAnchor = null;
    this.#jumpTarget = undefined;
    this.#jumpOpen = false;
    this.requestUpdate();
    if (choice && this.jumpToGroup(choice)) {
      const group = this.#byId.get(rowId(choice, true))?.group;
      const itemValue = group?.items.find(item => !item.disabled)?.value ?? null;
      this.dispatchEvent(new CustomEvent('metro-group-jump', { detail: { value: choice, itemValue },
        bubbles: true, composed: true }) satisfies MetroGroupJumpEvent);
      return;
    }
    if (anchor) this.restoreAnchor(anchor);
    const invoker = trigger && this.#byId.get(trigger);
    if (invoker) this.#focusRow(invoker, false);
    else this.shadowRoot?.querySelector<HTMLButtonElement>('.overview')?.focus({ preventScroll: true });
  }

  #renderRow(row: Row, selected: Set<string>, active: string, pinnedStart?: number) {
    const item = row.item;
    const tabIndex = !this.disabled ? (row.id === active ? '0' : '-1') : nothing;
    return html`<div class="row" part="row" role="row" aria-rowindex=${row.index + 1} data-row=${row.id}
      ?data-pinned=${pinnedStart !== undefined}
      style="inset-block-start: ${pinnedStart ?? row.start}px; block-size: ${row.height}px">
      ${item ? html`
        <div class="cell" part="item" role="gridcell" data-row-focus=${row.id}
          tabindex=${item.disabled ? nothing : tabIndex} aria-label=${item.label || item.value}
          aria-current=${item.value === this.currentItem ? 'true' : nothing}
          aria-selected=${this.#mode !== 'none' ? String(selected.has(item.value)) : nothing}
          aria-disabled=${item.disabled || this.disabled ? 'true' : nothing}
          ?data-disabled=${item.disabled || this.disabled} ?data-selected=${selected.has(item.value)}
          ?data-enabled=${!this.disabled && !item.disabled && (this.#mode !== 'none' || this.activatable)}
          @click=${(event: MouseEvent) => this.#onItemClick(row, event)}>
          ${this.#mode === 'multiple' ? html`<span class="check" part="mark" aria-hidden="true"></span>` : nothing}
          <span class="item-label" part="item-label">${item.label || item.value}</span>
        </div>` : this.#renderHeader(row, selected, tabIndex)}
    </div>`;
  }

  #renderHeader(row: Row, selected: Set<string>, tabIndex: string | typeof nothing) {
    const { group } = row;
    const showCheck = this.groupSelection && this.#mode === 'multiple';
    const enabled = showCheck ? group.items.filter(item => !item.disabled) : [];
    const count = enabled.reduce((total, item) => total + Number(selected.has(item.value)), 0);
    return html`<div class="cell" part="group" role="gridcell">
      <button type="button" part="group-button" class="group" data-row-focus=${row.id} tabindex=${tabIndex}
        ?data-initial=${alphabetInitial.test(group.label)} style=${`--_initial-tile:${Math.min(62, row.height)}px`}
        ?disabled=${this.disabled} aria-haspopup="dialog" @click=${this.#showJump}>${group.label}</button>
      ${showCheck ? html`<input type="checkbox" class="group-select" part="group-select" aria-label=${group.label}
        .checked=${live(enabled.length > 0 && count === enabled.length)} .indeterminate=${live(count > 0 && count < enabled.length)}
        ?disabled=${this.disabled || enabled.length === 0} @change=${() => this.#toggleGroup(group)}>` : nothing}
    </div>`;
  }

  protected override render() {
    const pinned = this.#pinnedHeader();
    const visible = this.#window(pinned?.row);
    const active = this.#tabStop(visible)?.id ?? '';
    const selected = new Set(this.selectedValues);
    const jumpLabel = this.jumpLabel || 'Groups';
    const anchorGroup = this.#rows[this.#rowAt(this.#scrollTop - this.#leading)]?.group.value;
    return html`
      <button type="button" part="overview" class="overview" aria-haspopup="dialog"
        ?disabled=${this.disabled || !this.#rows.length} @click=${this.#showJump}>${jumpLabel}</button>
      <div class="viewport" part="viewport" tabindex="-1" @scroll=${this.#onScroll}>
        <div class="header" part="header"><slot name="header"></slot></div>
        <div class="grid" role="grid" aria-label=${this.getAttribute('aria-label') || this.label || nothing}
          aria-rowcount=${this.#rows.length} aria-colcount="1" tabindex=${!active && !this.disabled ? '0' : nothing}
          aria-disabled=${this.disabled ? 'true' : nothing} aria-multiselectable=${this.#mode === 'multiple' ? 'true' : nothing}
          @focusin=${this.#onFocus} @focusout=${() => this.requestUpdate()}
          @keydown=${this.#onKey} @pointerdown=${() => { this.#pointerOrigin = this.#active; }}>
          <div class="window" role="presentation" style="block-size: ${this.#totalHeight}px">
             ${repeat(visible, row => row.id, row => this.#renderRow(row, selected, active,
               pinned?.row === row ? pinned.start : undefined))}
          </div>
        </div>
        <div class="after-rows">
          ${this.#rows.length ? nothing : html`<slot name="empty"></slot>`}
          <div class="footer" part="footer"><slot name="footer"></slot></div>
        </div>
      </div>
      <metro-dialog .label=${jumpLabel} @metro-close=${this.#closeJump} exportparts="surface:jump-dialog, heading:jump-heading">
        <div class="jump-grid" part="jump-grid">
          ${this.#jumpOpen ? repeat(this.#groups, group => group.value, group => html`
            <button type="button" class="jump-tile" part="jump-tile" ?disabled=${!group.items.length}
              ?data-initial=${alphabetInitial.test(group.label)}
              ?autofocus=${group.value === anchorGroup} @click=${() => this.#chooseGroup(group.value)}>${group.label}</button>
          `) : nothing}
        </div>
        <button type="button" slot="actions" data-metro-value="cancel">${this.cancelLabel || 'Cancel'}</button>
      </metro-dialog>
    `;
  }
}

defineElement('metro-long-list-selector', MetroLongListSelector);

declare global {
  interface HTMLElementTagNameMap { 'metro-long-list-selector': MetroLongListSelector; }
  interface HTMLElementEventMap { 'metro-group-jump': MetroGroupJumpEvent; }
}
