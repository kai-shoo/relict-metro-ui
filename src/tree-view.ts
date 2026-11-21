import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';
import type { MetroItemActivateEvent, MetroSelectionChangeEvent } from './collection-control.js';
import { defineElement } from './define.js';
import { applyTreeItemState, clearTreeItemState, isTreeItem, treeItemName, type MetroTreeItem } from './tree-item.js';
import { metroTheme } from './theme.js';

export type MetroTreeSelectionMode = 'none' | 'single';
export type MetroTreeExpandEvent = CustomEvent<{ value: string; expanded: boolean; expandedValues: readonly string[] }>;

interface NodeRecord {
  item: MetroTreeItem;
  value: string;
  parent?: NodeRecord;
  children: NodeRecord[];
  depth: number;
}

interface TreeFocus { record: NodeRecord; target: HTMLElement; }

const embeddedControl = 'a[href],button,input,textarea,select,summary,[tabindex],[role="button"],[role="link"],'
  + '[contenteditable]:not([contenteditable="false"])';

export class MetroTreeView extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
    activatable: { type: Boolean, reflect: true },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    value: { attribute: false, noAccessor: true },
    expandedValues: { attribute: false, noAccessor: true },
  };

  static override get observedAttributes() { return [...super.observedAttributes, 'value', 'aria-label', 'aria-labelledby']; }

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      overflow: hidden auto;
      color: var(--_metro-fg);
      scrollbar-color: var(--_metro-border) transparent;
      scrollbar-width: thin;
    }
    .tree:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    @media (forced-colors: active) { .tree:focus-visible { outline-color: Highlight; } }
  `];

  declare label: string;
  declare disabled: boolean;
  declare activatable: boolean;
  declare selectionMode: MetroTreeSelectionMode;

  #value = '';
  #nextExpanded?: Set<string>;
  #roots: NodeRecord[] = [];
  #nodes = new Map<string, NodeRecord>();
  #visible: NodeRecord[] = [];
  #active = '';
  #lastFocus?: TreeFocus;
  #relocatedFocus = false;
  #recoverFocus?: { value?: string; target?: HTMLElement };
  #typed = '';
  #typedAt = 0;

  #observer = new MutationObserver(entries => {
    const item = this.#lastFocus?.record.item;
    if (item && entries.some(entry => Array.from(entry.removedNodes).some(node => node.contains(item)))) {
      this.#relocatedFocus = true;
    }
    this.requestUpdate();
  });

  constructor() {
    super();
    this.label = '';
    this.disabled = false;
    this.activatable = false;
    this.selectionMode = 'single';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['value', 'label', 'expanded', 'disabled', 'hidden', 'slot'] });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#lastFocus = undefined;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next) return;
    if (name === 'value') this.value = next ?? '';
    if (name === 'aria-label' || name === 'aria-labelledby') this.requestUpdate();
  }

  get value() {
    const choice = this.#nodes.get(this.#value);
    return this.selectionMode !== 'none' && choice && !choice.item.disabled ? choice.value : '';
  }

  set value(next: string) {
    this.#value = next || '';
    if (!this.matches(':focus-within')) this.#active = '';
    this.requestUpdate();
  }

  get expandedValues(): readonly string[] {
    return Array.from(this.#nodes.values()).filter(node => node.children.length && node.item.expanded).map(node => node.value);
  }

  set expandedValues(values: readonly string[]) {
    this.#nextExpanded = new Set(values);
    for (const record of this.#nodes.values()) {
      if (record.children.length) record.item.expanded = this.#nextExpanded.has(record.value);
    }
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    if (this.disabled) return;
    if (!this.focusItem(this.#active, options)) this.shadowRoot?.querySelector<HTMLElement>('.tree')?.focus(options);
  }

  focusItem(value: string, options?: FocusOptions): boolean {
    const record = this.#visible.find(entry => entry.value === value);
    if (this.disabled || !record || record.item.disabled) return false;
    this.#active = value;
    record.item.focus({ ...options, preventScroll: true });
    if (!options?.preventScroll) {
      record.item.shadowRoot?.querySelector('.row')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    this.requestUpdate();
    return record.item.matches(':focus');
  }

  #read(parent: Element, previous: Map<string, NodeRecord>, ancestor?: NodeRecord): NodeRecord[] {
    const entries: NodeRecord[] = [];
    for (const item of parent.children) {
      if (!isTreeItem(item) || item.hidden || (item.slot && item.slot !== 'children')) continue;
      const value = item.value;
      if (!value || this.#nodes.has(value)) continue;
      const record: NodeRecord = { item, value, parent: ancestor, children: [], depth: (ancestor?.depth ?? 0) + 1 };
      this.#nodes.set(value, record);
      record.children = this.#read(item, previous, record);
      if (record.children.length) {
        const last = previous.get(value)?.item;
        if (this.#nextExpanded) item.expanded = this.#nextExpanded.has(value);
        else if (last && last !== item && !item.expanded) item.expanded = last.expanded;
      }
      entries.push(record);
    }
    return entries;
  }

  #collectVisible(nodes: NodeRecord[]): void {
    for (const node of nodes) {
      this.#visible.push(node);
      if (node.item.expanded) this.#collectVisible(node.children);
    }
  }

  #nextFocus(previous: NodeRecord | undefined, oldOrder: NodeRecord[]): string {
    const available = new Set(this.#visible.filter(entry => !entry.item.disabled).map(entry => entry.value));
    if (available.has(this.#active)) return this.#active;
    let parent = this.#nodes.get(this.#active)?.parent ?? previous?.parent;
    while (parent) {
      if (available.has(parent.value)) return parent.value;
      parent = parent.parent;
    }
    const last = oldOrder.findIndex(node => node.value === this.#active);
    for (let distance = 1; last >= 0 && distance < oldOrder.length; distance++) {
      const next = oldOrder[last + distance]?.value;
      const before = oldOrder[last - distance]?.value;
      if (next && available.has(next)) return next;
      if (before && available.has(before)) return before;
    }
    return available.has(this.value) ? this.value : available.values().next().value ?? '';
  }

  protected override willUpdate(): void {
    const previous = this.#nodes;
    const oldVisible = this.#visible;
    const saved = this.#lastFocus;
    const hadFocus = this.matches(':focus-within');
    const active = this.#active;
    this.#nodes = new Map();
    this.#roots = this.#read(this, previous);
    if (this.#nodes.size) this.#nextExpanded = undefined;
    this.#visible = [];
    this.#collectVisible(this.#roots);
    if (previous.size || this.#nodes.size) this.#value = this.value;
    this.#active = this.#nextFocus(previous.get(active), oldVisible);

    const liveItems = new Set(Array.from(this.#nodes.values(), node => node.item));
    for (const old of previous.values()) {
      if (!liveItems.has(old.item)) clearTreeItemState(old.item, this);
    }
    const now = this.#nodes.get(this.#active);
    const savedNode = saved && this.#nodes.get(saved.record.value);
    const lost = saved && !hadFocus && !this.#externalFocus()
      && (this.#relocatedFocus || !savedNode || savedNode.item !== saved.record.item || !this.#visible.includes(savedNode) || savedNode.item.disabled);
    this.#relocatedFocus = false;
    if (!this.disabled && (hadFocus || lost) && (active !== this.#active || !hadFocus || (saved && saved.record.item !== now?.item))) {
      this.#recoverFocus = { value: this.#active, target: saved?.record.item === now?.item ? saved?.target : undefined };
    }
    this.#apply(this.#roots);
  }

  #apply(entries: NodeRecord[]): void {
    entries.forEach((node, index) => {
      applyTreeItemState(node.item, {
        owner: this, children: node.children.map(record => record.item), selected: this.selectionMode === 'none' ? undefined : node.value === this.#value,
        active: node.value === this.#active, disabled: this.disabled || node.item.disabled,
        level: node.depth, position: index + 1, size: entries.length,
      });
      this.#apply(node.children);
    });
  }

  protected override updated(): void {
    this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')?.assign(...this.#roots.map(node => node.item));
    const restore = this.#recoverFocus;
    this.#recoverFocus = undefined;
    if (!restore) return;
    const item = this.#nodes.get(restore.value ?? '')?.item;
    void (item?.updateComplete ?? Promise.resolve()).then(() => {
      if (!this.isConnected || this.disabled || this.#externalFocus()) return;
      if (restore.target?.isConnected && restore.target.getClientRects().length) {
        restore.target.focus({ preventScroll: true });
        if (this.matches(':focus-within')) return;
      }
      if (!restore.value || !this.focusItem(restore.value, { preventScroll: true })) {
        this.shadowRoot?.querySelector<HTMLElement>('.tree')?.focus({ preventScroll: true });
      }
    });
  }

  #externalFocus() {
    if (this.matches(':focus-within')) return false;
    const root = this.getRootNode() as ShadowRoot | Document;
    const active = root.activeElement;
    return Boolean(active && active !== this.ownerDocument.body && active !== this.ownerDocument.documentElement);
  }

  #eventNode(event: Event) {
    const path = event.composedPath();
    const index = path.findIndex(isTreeItem);
    if (index < 0) return;
    const item = path[index] as MetroTreeItem;
    const record = this.#nodes.get(item.value);
    if (record?.item !== item) return;
    return { record, origin: path.slice(0, index) };
  }

  #onFocus(event: FocusEvent): void {
    const hit = this.#eventNode(event);
    const target = event.composedPath()[0];
    if (!hit || !(target instanceof HTMLElement)) return;
    this.#lastFocus = { record: hit.record, target };
    if (hit.record.value === this.#active || hit.record.item.disabled) return;
    this.#active = hit.record.value;
    this.requestUpdate();
  }

  #onBlur(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node) {
      if (!this.contains(event.relatedTarget) && !this.shadowRoot?.contains(event.relatedTarget)) this.#lastFocus = undefined;
    } else {
      const last = this.#lastFocus;
      requestAnimationFrame(() => {
        if (this.#lastFocus === last && last?.record.item.isConnected && !this.matches(':focus-within')) this.#lastFocus = undefined;
      });
    }
  }

  #toggle(record: NodeRecord): void {
    if (!record.children.length || record.item.disabled || this.disabled) return;
    record.item.expanded = !record.item.expanded;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-expand-change', {
      detail: { value: record.value, expanded: record.item.expanded, expandedValues: this.expandedValues },
      bubbles: true, composed: true,
    }) satisfies MetroTreeExpandEvent);
  }

  #select(record: NodeRecord): void {
    if (this.selectionMode === 'none' || record.item.disabled || this.disabled || this.#value === record.value) return;
    this.#value = record.value;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-selection-change', {
      detail: { value: record.value, selectedValues: [record.value] }, bubbles: true, composed: true,
    }) satisfies MetroSelectionChangeEvent);
  }

  #activate(record: NodeRecord): void {
    this.dispatchEvent(new CustomEvent('metro-item-activate', {
      detail: { value: record.value }, bubbles: true, composed: true,
    }) satisfies MetroItemActivateEvent);
  }

  #onClick(event: MouseEvent): void {
    if (this.disabled || event.defaultPrevented || event.button !== 0) return;
    const hit = this.#eventNode(event);
    if (!hit || hit.record.item.disabled) return;
    const { record, origin } = hit;
    const disclosure = origin.some(target => target instanceof HTMLButtonElement
      && target.getRootNode() === record.item.shadowRoot && target.part.contains('disclosure'));
    if (disclosure) {
      this.focusItem(record.value, { preventScroll: true });
      this.#toggle(record);
    } else if (!origin.some(target => target instanceof HTMLElement && target.matches(embeddedControl))) {
      this.focusItem(record.value, { preventScroll: true });
      if (this.selectionMode !== 'none') this.#select(record);
      else if (this.activatable) this.#activate(record);
    }
  }

  #typeAhead(key: string, current: number, choices: NodeRecord[]): NodeRecord | undefined {
    const now = performance.now();
    const letter = key.toLocaleLowerCase();
    this.#typed = now - this.#typedAt > 650 ? letter : this.#typed + letter;
    this.#typedAt = now;
    const repeatLetter = Array.from(this.#typed).every(char => char === letter);
    const query = repeatLetter ? letter : this.#typed;
    const start = current + Number(repeatLetter);
    for (let offset = 0; offset < choices.length; offset++) {
      const choice = choices[(start + offset) % choices.length];
      if (treeItemName(choice.item).toLocaleLowerCase().startsWith(query)) return choice;
    }
    return undefined;
  }

  #onKey(event: KeyboardEvent): void {
    const hit = this.#eventNode(event);
    if (!hit || this.disabled || hit.record.item.disabled || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || hit.origin.some(target => target instanceof HTMLElement && target.matches(embeddedControl))) return;

    const { record } = hit;
    const choices = this.#visible.filter(node => !node.item.disabled);
    const index = choices.indexOf(record);
    const rtl = getComputedStyle(this).direction === 'rtl';
    let next: NodeRecord | undefined;
    switch (event.key) {
      case 'ArrowDown': next = choices[index + 1]; break;
      case 'ArrowUp': next = choices[index - 1]; break;
      case 'Home': next = choices[0]; break;
      case 'End': next = choices.at(-1); break;
      case rtl ? 'ArrowLeft' : 'ArrowRight':
        if (record.children.length && !record.item.expanded) this.#toggle(record);
        else next = record.children.find(node => !node.item.disabled);
        break;
      case rtl ? 'ArrowRight' : 'ArrowLeft':
        if (record.children.length && record.item.expanded) this.#toggle(record);
        else {
          next = record.parent;
          while (next?.item.disabled) next = next.parent;
        }
        break;
      case 'Enter':
        if (!event.repeat && this.activatable) this.#activate(record);
        else if (!event.repeat && this.selectionMode !== 'none') this.#select(record);
        break;
      case ' ':
        if (!event.repeat) this.#select(record);
        break;
      default:
        if (event.key.length !== 1) return;
        next = this.#typeAhead(event.key, index, choices);
        if (!next) return;
    }
    event.preventDefault();
    if (next) this.focusItem(next.value);
  }

  #accessibleName() {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const names = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    return this.getAttribute('aria-label') || this.label || nothing;
  }

  protected override render() {
    return html`<div class="tree" part="tree" role="tree" aria-label=${this.#accessibleName()}
      aria-disabled=${this.disabled ? 'true' : nothing} tabindex=${!this.disabled && !this.#active ? '0' : nothing}
      @focusin=${this.#onFocus} @focusout=${this.#onBlur} @keydown=${this.#onKey} @click=${this.#onClick}>
      <slot></slot>
    </div>${this.#roots.length ? nothing : html`<slot name="empty"></slot>`}`;
  }
}

defineElement('metro-tree-view', MetroTreeView);

declare global {
  interface HTMLElementTagNameMap { 'metro-tree-view': MetroTreeView; }
  interface HTMLElementEventMap { 'metro-expand-change': MetroTreeExpandEvent; }
}
