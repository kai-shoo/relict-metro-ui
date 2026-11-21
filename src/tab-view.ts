import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { observeAncestorDirection } from './ancestor-direction.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';
import './tab-view-item.js';
import type { MetroTabViewItem } from './tab-view-item.js';

export interface MetroTabCloseDetail {
  value: string;
  session: unknown;
  waitUntil(decision: boolean | PromiseLike<boolean>): void;
}

export interface MetroTabTransferDetail {
  value: string;
  session: unknown;
  from: MetroTabView;
  to: MetroTabView;
  index: number;
}

export interface MetroTabDestination {
  target: MetroTabView;
  index?: number;
  /** Supply a destination-owned view when moving a session to another document. */
  item?: MetroTabViewItem;
}

type TransferTarget = MetroTabDestination | null;
type TransferResolver = TransferTarget | (() => TransferTarget | PromiseLike<TransferTarget>);

export interface MetroTabDetachDetail {
  readonly value: string;
  readonly session: unknown;
  readonly from: MetroTabView;
  accept(destination: TransferTarget | PromiseLike<TransferTarget>): Promise<boolean>;
}

export interface MetroTabDragAdapter {
  peers(): readonly MetroTabView[];
  canReceive?(detail: MetroTabTransferDetail): boolean;
  createItem(detail: MetroTabTransferDetail): MetroTabViewItem | null | PromiseLike<MetroTabViewItem | null>;
}

interface TabOperations {
  item: MetroTabViewItem;
  close?: Promise<boolean>;
  transfer?: Promise<boolean>;
}

interface TabDrag {
  owner: MetroTabView;
  item: MetroTabViewItem;
  document: Document;
  token: string;
  listeners: AbortController;
  preview?: MetroTabView;
}

const tabOperations = Symbol.for('windows-phone-metro-ui.tab-operations');
const receiveTab = Symbol.for('windows-phone-metro-ui.tab-receive');
const finishClose = Symbol.for('windows-phone-metro-ui.tab-close');
const getActiveDrag = Symbol.for('windows-phone-metro-ui.tab-active-drag');
const clearDropPreview = Symbol.for('windows-phone-metro-ui.tab-clear-drop-preview');
const tabMime = 'application/x-metro-tab';
const detachDistance = 32;
type ManagedItem = MetroTabViewItem & { [tabOperations]?: TabOperations };
const tabDrags = new WeakMap<Document, TabDrag>();

function endDrag(drag: TabDrag): void {
  drag.preview?.[clearDropPreview](drag);
  drag.listeners.abort();
  if (tabDrags.get(drag.document) === drag) tabDrags.delete(drag.document);
}

function operations(item: ManagedItem): TabOperations {
  return item[tabOperations] ??= { item };
}

function closestTabView(event: Event): EventTarget | undefined {
  return event.composedPath().find(node => (node as Element).localName === 'metro-tab-view');
}

export class MetroTabView extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions, slotAssignment: 'manual',
  };

  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String },
    closeLabel: { type: String, attribute: 'close-label' },
    reorderable: { type: Boolean, reflect: true },
    detachable: { type: Boolean, reflect: true },
    dragAdapter: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); background: var(--_metro-bg); }
    .strip { display: grid; grid-auto-columns: max-content; justify-content: start; overflow-x: auto; background: var(--_metro-chrome); }
    .tabs { display: grid; grid-template-columns: subgrid; grid-row: 1; }
    .entry[data-closable] { padding-inline-end: 2.75rem; }
    .close { grid-row: 1; justify-self: end; z-index: 1; margin-block-end: 3px; }
    .entry { position: relative; display: flex; flex: none; align-items: stretch; border-block-end: 3px solid transparent; }
    .entry[data-selected] { background: var(--_metro-bg); border-block-end-color: var(--_metro-accent); }
    .entry[data-drop-before]::before, .entry[data-drop-after]::after {
      content: '';
      position: absolute;
      inset-block: 0;
      inline-size: 3px;
      background: var(--metro-tab-drop-indicator, var(--_metro-accent));
      pointer-events: none;
    }
    .entry[data-drop-before]::before { inset-inline-start: 0; }
    .entry[data-drop-after]::after { inset-inline-end: 0; }
    .empty[data-drop] { outline: 2px solid var(--metro-tab-drop-indicator, var(--_metro-accent)); outline-offset: -2px; }
    button {
      min-block-size: 2.75rem;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
    }
    button:disabled { cursor: default; color: var(--_metro-disabled); }
    .tab { max-inline-size: 21rem; padding-inline: var(--_metro-space); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .close { inline-size: 2.75rem; font-size: 1.25rem; }
    button:enabled:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
    :is(button, .panel):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .panel[hidden] { display: none; }
    @media (forced-colors: active) {
      .entry[data-selected] { border-block-end-color: Highlight; }
      .entry[data-drop-before]::before, .entry[data-drop-after]::after { background: Highlight; }
      .empty[data-drop] { outline-color: Highlight; }
    }
  `];

  declare value: string;
  declare label: string;
  declare closeLabel: string;
  declare reorderable: boolean;
  declare detachable: boolean;
  declare dragAdapter: MetroTabDragAdapter | null;

  #tabs: MetroTabViewItem[] = [];
  #ids = new WeakMap<MetroTabViewItem, number>();
  #id = 0;
  #tabStop = '';
  #restoreTab = false;
  #restoreHeader?: string;
  #dropPreview?: { drag: TabDrag; index: number };
  #headerWidth = 0;
  #headerDirection = '';
  #resize = new ResizeObserver(() => this.#layoutHeaders());
  #observer = new MutationObserver(records => {
    if (records.some(record => record.target === this || record.target.parentNode === this
      || (record.attributeName === 'dir' && !this.contains(record.target)))) this.requestUpdate();
  });

  constructor() {
    super();
    this.value = '';
    this.label = 'Documents';
    this.closeLabel = 'Close';
    this.reorderable = false;
    this.detachable = false;
    this.dragAdapter = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'closable', 'dir'],
    });
    observeAncestorDirection(this.#observer, this);
    this.#resize.observe(this);
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#resize.disconnect();
    this.#headerWidth = 0;
    const drag = tabDrags.get(this.ownerDocument);
    if (drag?.owner === this) endDrag(drag);
    this[clearDropPreview]();
    super.disconnectedCallback();
  }

  #items(): MetroTabViewItem[] {
    const values = new Set<string>();
    return Array.from(this.children).filter((child): child is MetroTabViewItem => {
      if (child.localName !== 'metro-tab-view-item') return false;
      const { value } = child as MetroTabViewItem;
      if (!value || values.has(value)) return false;
      values.add(value);
      return true;
    });
  }

  #find(value: string) { return this.#items().find(item => item.value === value); }

  #tabButton(value: string): HTMLElement | null | undefined {
    const item = this.#tabs.find(tab => tab.value === value);
    return item ? this.shadowRoot?.getElementById(`tab-${this.#ids.get(item)}`) : null;
  }

  #focusTab(value: string) {
    this.#tabButton(value)?.focus();
    this.#layoutHeaders(true);
  }

  #layoutHeaders(force = false): void {
    const strip = this.shadowRoot?.querySelector<HTMLElement>('.strip');
    if (!strip?.clientWidth) return;
    const width = strip.clientWidth;
    const direction = getComputedStyle(strip).direction;
    if (!force && width === this.#headerWidth && direction === this.#headerDirection) return;
    this.#headerWidth = width;
    this.#headerDirection = direction;

    const active = this.shadowRoot?.activeElement;
    const focused = active?.matches('.tab, .close') ? active : null;
    const value = focused?.closest<HTMLElement>('[data-key]')?.dataset.key ?? this.value;
    const tab = this.#tabButton(value);
    const entry = tab?.parentElement;
    const target = entry && entry.offsetWidth <= width ? entry : focused ?? tab;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const start = strip.getBoundingClientRect().left + strip.clientLeft;
    const end = start + width;
    const delta = rect.width > width
      ? (direction === 'rtl' ? rect.right - end : rect.left - start)
      : rect.left < start ? rect.left - start : Math.max(0, rect.right - end);
    if (Math.abs(delta) > .5) strip.scrollBy({ left: delta, behavior: 'instant' });
  }

  #focusPanel(item: MetroTabViewItem, focusKey?: string) {
    const isCurrent = () => this.value === item.value && item.parentElement === this;
    void this.updateComplete.then(() => {
      if (!isCurrent() || item.restoreFocus(focusKey)) return;
      const panel = this.shadowRoot?.getElementById(`panel-${this.#ids.get(item)}`);
      panel?.focus();
      if (!focusKey || !panel) return;
      // A new window can defer focus while the originating drag is still finishing.
      this.ownerDocument.defaultView?.requestAnimationFrame(() => {
        if (isCurrent() && this.shadowRoot?.activeElement === panel) item.restoreFocus(focusKey);
      });
    });
  }

  #select(value: string): boolean {
    if (value === this.value || this.#find(value)?.disabled !== false) return false;
    this.#tabStop = value;
    this.value = value;
    this.dispatchEvent(new CustomEvent('metro-change', {
      detail: { value }, bubbles: true, composed: true,
    }));
    return true;
  }

  closeTab(value: string): Promise<boolean> {
    const item = this.#find(value);
    if (!item?.closable || item.disabled) return Promise.resolve(false);
    const state = operations(item);
    if (state.close) return state.close;
    const request = Promise.resolve().then(async () => {
      await state.transfer;
      const owner = state.item.parentElement as MetroTabView | null;
      return owner?.[finishClose]?.(state.item) ?? false;
    }).finally(() => { state.close = undefined; });
    state.close = request;
    return request;
  }

  async [finishClose](item: MetroTabViewItem): Promise<boolean> {
    if (item.parentElement !== this || !item.closable || item.disabled) return false;
    const decisions: Promise<boolean>[] = [];
    let dispatching = true;
    const detail: MetroTabCloseDetail = {
      value: item.value, session: item.session,
      waitUntil(decision) {
        if (!dispatching) throw new DOMException('Register the decision during metro-before-tab-close.', 'InvalidStateError');
        decisions.push(Promise.resolve(decision).catch(() => false));
      },
    };
    const allowed = this.dispatchEvent(new CustomEvent('metro-before-tab-close', {
      detail, cancelable: true, bubbles: true, composed: true,
    }));
    dispatching = false;
    if (!allowed || !(await Promise.all(decisions)).every(decision => decision === true)
      || item.parentElement !== this || !item.closable || item.disabled) return false;
    const focused = this.shadowRoot?.activeElement;
    const ownsFocus = item.matches(':focus-within') || focused?.closest('[data-key]')?.getAttribute('data-key') === item.value
      || focused?.id === `panel-${this.#ids.get(item)}`;
    this.#restoreTab ||= ownsFocus === true;
    item.remove();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-tab-close', {
      detail: { value: detail.value, session: detail.session }, bubbles: true, composed: true,
    }));
    return true;
  }

  moveTab(value: string, index: number): boolean {
    const item = this.#find(value);
    if (!item || item.disabled || !Number.isInteger(index)) return false;
    const items = this.#items();
    const current = items.indexOf(item);
    if (index < 0 || index >= items.length || current === index) return false;
    const remaining = items.filter(entry => entry !== item);
    const before = remaining[index] ?? null;
    const container = this as HTMLElement & { moveBefore?(child: Element, reference: Element | null): void };
    if (container.moveBefore) container.moveBefore(item, before);
    else this.insertBefore(item, before);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-tab-reorder', {
      detail: { value, index }, bubbles: true, composed: true,
    }));
    return true;
  }

  transferTab(value: string, destination: TransferResolver): Promise<boolean> {
    const item = this.#find(value);
    if (!item || item.disabled) return Promise.resolve(false);
    const state = operations(item);
    if (state.transfer) return state.transfer;
    if (state.close) return Promise.resolve(false);
    const request = Promise.resolve().then(async () => {
      const resolved = typeof destination === 'function' ? await destination() : destination;
      if (!resolved || item.parentElement !== this) return false;
      if (resolved.target === this) return resolved.index !== undefined && this.moveTab(value, resolved.index);
      return resolved.target[receiveTab]?.(this, item, state, resolved) ?? false;
    }).catch(() => false).finally(() => { state.transfer = undefined; });
    state.transfer = request;
    return request;
  }

  [receiveTab](from: MetroTabView, item: MetroTabViewItem, state: TabOperations, destination: MetroTabDestination): boolean {
    const targetItem = destination.item ?? item;
    const value = item.value;
    const existing = this.#items();
    const index = destination.index ?? existing.length;
    if (!from.isConnected || !this.isConnected || existing.some(entry => entry.value === value)
      || !Number.isInteger(index) || index < 0 || index > existing.length
      || targetItem.ownerDocument !== this.ownerDocument || targetItem.value !== value
      || targetItem.localName !== 'metro-tab-view-item' || targetItem.disabled
      || (targetItem !== item && targetItem.isConnected)) return false;

    const detail: MetroTabTransferDetail = { from, to: this, value, session: item.session, index };
    if (!this.dispatchEvent(new CustomEvent('metro-before-tab-receive', {
      detail, bubbles: true, composed: true, cancelable: true,
    })) || item.parentElement !== from || !from.isConnected || !this.isConnected || this.#find(value)
      || item.disabled || item.value !== value || targetItem.disabled || targetItem.value !== value
      || targetItem.ownerDocument !== this.ownerDocument || (targetItem !== item && targetItem.isConnected)) return false;

    const siblings = this.#items();
    if (index > siblings.length) return false;

    const focusKey = item.focusKey;
    targetItem.session = item.session;
    (targetItem as ManagedItem)[tabOperations] = state;
    this.insertBefore(targetItem, siblings[index] ?? null);
    if (targetItem !== item) item.remove();
    state.item = targetItem;
    this.value = value;
    this.#tabStop = value;
    this.requestUpdate();
    from.requestUpdate();
    for (const owner of [from, this]) {
      owner.dispatchEvent(new CustomEvent('metro-tab-transferred', { detail, bubbles: true, composed: true }));
    }
    this.#focusPanel(targetItem, focusKey);
    return true;
  }

  protected override willUpdate(): void {
    const previous = this.#tabs;
    const tabs = this.#items();
    const active = this.shadowRoot?.activeElement;
    const headerKey = active?.closest<HTMLElement>('[data-key]')?.dataset.key;
    const oldHeader = previous.find(item => item.value === headerKey);
    const newHeader = tabs.find(item => item.value === headerKey && !item.disabled);
    if (oldHeader && (newHeader !== oldHeader || (active?.matches('.close') && !newHeader.closable))) {
      this.#restoreTab = true;
      this.#restoreHeader = newHeader?.value;
    }
    const selected = tabs.find(item => !item.disabled && item.value === this.value);
    if (!selected) {
      const oldIndex = previous.findIndex(item => item.value === this.value);
      const start = Math.max(0, oldIndex);
      const replacement = tabs.slice(start).find(item => !item.disabled)
        ?? tabs.slice(0, start).reverse().find(item => !item.disabled);
      this.value = replacement?.value ?? '';
    }
    const focused = previous.find(item => item.matches(':focus-within') || active?.id === `panel-${this.#ids.get(item)}`);
    if (focused && focused.value !== this.value) this.#restoreTab = true;
    if (!tabs.some(item => !item.disabled && item.value === this.#tabStop)) this.#tabStop = this.value;
    if (active?.getAttribute('role') !== 'tab') this.#tabStop = this.value;
    for (const item of tabs) if (!this.#ids.has(item)) this.#ids.set(item, ++this.#id);
    this.#tabs = tabs;
  }

  protected override updated(changed: PropertyValues<this>): void {
    for (const item of this.#tabs) {
      const slot = this.shadowRoot!.getElementById(`slot-${this.#ids.get(item)}`) as HTMLSlotElement;
      if (slot.assignedElements()[0] !== item) slot.assign(item);
    }
    const empty = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="empty"]');
    if (empty) {
      const content = Array.from(this.children).filter(item => item.slot === 'empty');
      const assigned = empty.assignedElements();
      if (content.length !== assigned.length || content.some((item, index) => item !== assigned[index])) {
        empty.assign(...content);
      }
    }
    if (this.#restoreTab) {
      this.#restoreTab = false;
      const target = this.#restoreHeader ?? this.value;
      this.#restoreHeader = undefined;
      if (target) this.#focusTab(target);
      else this.shadowRoot?.querySelector<HTMLElement>('.empty')?.focus();
    }
    this.#layoutHeaders(changed.has('value'));
  }

  #keyboard = (event: KeyboardEvent) => {
    if (event.defaultPrevented || closestTabView(event) !== this
      || event.altKey || event.metaKey || event.isComposing) return;
    const active = this.shadowRoot?.activeElement;
    const inTab = active?.getAttribute('role') === 'tab';
    const items = this.#tabs.filter(item => !item.disabled);
    if (!items.length) return;
    if (event.ctrlKey && event.key === 'Tab') {
      event.preventDefault();
      const index = items.findIndex(item => item.value === this.value);
      const next = items[(index + items.length + (event.shiftKey ? -1 : 1)) % items.length];
      if (this.#select(next.value)) {
        if (active?.closest('[data-key]')) this.#focusTab(next.value);
        else this.#focusPanel(next);
      }
      return;
    }
    if (event.ctrlKey && event.key === 'F4' || inTab && !event.ctrlKey && event.key === 'Delete') {
      const key = inTab && event.key === 'Delete' ? active?.parentElement?.dataset.key : this.value;
      if (key && this.#find(key)?.closable) {
        event.preventDefault();
        void this.closeTab(key);
      }
      return;
    }
    if (!inTab || event.ctrlKey || event.shiftKey) return;
    const current = items.findIndex(item => active?.id === `tab-${this.#ids.get(item)}`);
    let next: number;
    switch (event.key) {
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const right = (event.key === 'ArrowRight') !== (getComputedStyle(this).direction === 'rtl');
        next = (current + items.length + (right ? 1 : -1)) % items.length;
        break;
      }
      default: return;
    }
    event.preventDefault();
    this.#focusTab(items[next].value);
  };

  [getActiveDrag](): TabDrag | undefined {
    const drag = tabDrags.get(this.ownerDocument);
    if (drag?.owner !== this || !this.isConnected || drag.item.parentElement !== this ||
      drag.item.disabled || operations(drag.item).close || operations(drag.item).transfer) return undefined;
    return drag;
  }

  #dragStart(event: DragEvent, item: MetroTabViewItem): void {
    if (event.defaultPrevented || !event.dataTransfer || !(this.reorderable || this.detachable) ||
      item.disabled || operations(item).close || operations(item).transfer) {
      event.preventDefault();
      return;
    }
    const document = this.ownerDocument;
    const previous = tabDrags.get(document);
    if (previous) endDrag(previous);
    const token = crypto.getRandomValues(new Uint32Array(4)).join('-');
    const listeners = new AbortController();
    const drag = { owner: this, item, document, token, listeners };
    tabDrags.set(document, drag);
    event.dataTransfer.setData(tabMime, token);
    event.dataTransfer.effectAllowed = 'move';
    const { signal } = listeners;
    document.addEventListener('dragend', () => endDrag(drag), { signal });
    document.defaultView?.addEventListener('pagehide', () => endDrag(drag), { signal });
    document.addEventListener('dragover', this.#tearOver, { signal });
    document.addEventListener('drop', this.#tearDrop, { signal });
  }

  #findDrag(event: DragEvent): TabDrag | undefined {
    const data = event.dataTransfer;
    if (!data?.types.includes(tabMime)) return undefined;
    const matches = (drag?: TabDrag) => drag && (event.type !== 'drop' || data.getData(tabMime) === drag.token);
    const local = tabDrags.get(this.ownerDocument)?.owner[getActiveDrag]();
    if (matches(local)) return local;
    for (const peer of this.dragAdapter?.peers() ?? []) {
      const candidate = peer?.[getActiveDrag]?.();
      if (matches(candidate)) return candidate;
    }
    return undefined;
  }

  #dropIndex(event: DragEvent, items: readonly MetroTabViewItem[]): number {
    const key = (event.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key;
    const item = key ? this.#find(key) : undefined;
    const entry = item && this.shadowRoot?.getElementById(`tab-${this.#ids.get(item)}`)?.parentElement;
    const over = entry ? items.findIndex(item => item.value === entry.dataset.key) : items.length;
    const rect = entry ? entry.getBoundingClientRect() : undefined;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const after = rect && ((event.clientX >= (rect.left + rect.right) / 2) !== rtl);
    return over < 0 ? items.length : over + (after ? 1 : 0);
  }

  #destination(event: DragEvent) {
    if (!this.reorderable || event.defaultPrevented || closestTabView(event) !== this) return undefined;
    const drag = this.#findDrag(event);
    if (!drag) return undefined;
    const items = this.#items();
    const value = drag.item.value;
    if (drag.owner !== this && items.some(item => item.value === value)) return undefined;
    const index = this.#dropIndex(event, items);
    const adapter = drag.document === this.ownerDocument ? null : this.dragAdapter;
    if (drag.document !== this.ownerDocument && !adapter) return undefined;
    const detail = { from: drag.owner, to: this, value, session: drag.item.session, index };
    if (adapter?.canReceive?.(detail) === false) return undefined;
    return { drag, items, adapter, detail };
  }

  [clearDropPreview](drag = this.#dropPreview?.drag): void {
    if (!drag || this.#dropPreview?.drag !== drag) return;
    if (drag.preview === this) drag.preview = undefined;
    this.#dropPreview = undefined;
    this.requestUpdate();
  }

  #dragOver = (event: DragEvent): void => {
    const destination = this.#destination(event);
    if (!destination || !event.dataTransfer) {
      this[clearDropPreview]();
      return;
    }
    const { drag, detail } = destination;
    if (this.#dropPreview?.drag !== drag || this.#dropPreview.index !== detail.index) {
      this[clearDropPreview]();
      drag.preview?.[clearDropPreview](drag);
      drag.preview = this;
      this.#dropPreview = { drag, index: detail.index };
      this.requestUpdate();
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  #dragLeave = (event: DragEvent): void => {
    const { left, right, top, bottom } = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) {
      this[clearDropPreview]();
    }
  };

  #drop = (event: DragEvent): void => {
    const destination = this.#destination(event);
    this[clearDropPreview]();
    if (!destination) return;
    const { drag, items, adapter, detail } = destination;
    const index = drag.owner === this && items.indexOf(drag.item) < detail.index ? detail.index - 1 : detail.index;
    event.preventDefault();
    endDrag(drag);
    void drag.owner.transferTab(detail.value, adapter ? async () => {
      const item = await adapter.createItem(detail);
      return item && this.reorderable && this.dragAdapter === adapter && adapter.peers().includes(drag.owner) &&
        adapter.canReceive?.(detail) !== false ? { target: this, item, index } : null;
    } : { target: this, index });
  };

  #tearTarget(event: DragEvent): TabDrag | undefined {
    if (!this.detachable || event.defaultPrevented) return undefined;
    const drag = this[getActiveDrag]();
    if (!drag || this.#findDrag(event) !== drag) return undefined;
    const path = event.composedPath();
    const target = closestTabView(event);
    if ((target && target !== this) || path.some(node => node instanceof Element && node.hasAttribute('data-metro-no-detach'))) {
      return undefined;
    }
    const rect = this.shadowRoot?.querySelector('.strip')?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return undefined;
    const { clientX: x, clientY: y } = event;
    return x < rect.left - detachDistance || x > rect.right + detachDistance ||
      y < rect.top - detachDistance || y > rect.bottom + detachDistance ? drag : undefined;
  }

  #tearOver = (event: DragEvent): void => {
    const drag = this.#tearTarget(event);
    if (!drag || !event.dataTransfer) return;
    drag.preview?.[clearDropPreview](drag);
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  #tearDrop = (event: DragEvent): void => {
    const drag = this.#tearTarget(event);
    if (!drag) return;
    event.preventDefault();
    endDrag(drag);
    const { value, session } = drag.item;
    // Opening a window can run microtasks before the request listener returns.
    let chooseDestination!: (destination: TransferTarget | PromiseLike<TransferTarget>) => void;
    const destination = new Promise<TransferTarget>(resolve => { chooseDestination = resolve; });
    const moving = this.transferTab(value, () => destination);
    let supplied: Promise<TransferTarget> | undefined;
    let dispatching = true;
    const detail: MetroTabDetachDetail = {
      value, session, from: this,
      accept(destination) {
        if (!dispatching || supplied) {
          throw new DOMException('Set the destination once during metro-tab-detach-request.', 'InvalidStateError');
        }
        supplied = Promise.resolve(destination).catch(() => null);
        return moving;
      },
    };
    const allowed = this.dispatchEvent(new CustomEvent('metro-tab-detach-request', {
      detail, bubbles: true, composed: true, cancelable: true,
    }));
    dispatching = false;
    chooseDestination(allowed ? supplied ?? null : null);
  };

  protected override render() {
    return html`
      <div @keydown=${this.#keyboard}>
        ${this.#tabs.length ? html`
          <div class="strip" part="tablist"
            @dragover=${this.#dragOver} @dragleave=${this.#dragLeave} @drop=${this.#drop}>
            <div class="tabs" role="tablist" aria-label=${this.label || 'Documents'} style=${`grid-column: 1 / span ${this.#tabs.length}`}>
              ${repeat(this.#tabs, item => item, (item, index) => {
                const id = this.#ids.get(item);
                const selected = item.value === this.value;
                const label = item.label || item.value;
                return html`
                  <div class="entry" role="presentation" data-key=${item.value} ?data-selected=${selected} ?data-closable=${item.closable}
                    ?data-drop-before=${this.#dropPreview?.index === index}
                    ?data-drop-after=${index === this.#tabs.length - 1 && this.#dropPreview?.index === this.#tabs.length}>
                    <button type="button" class="tab" part="tab" role="tab" id="tab-${id}"
                      aria-controls="panel-${id}" aria-selected=${selected}
                      tabindex=${!item.disabled && item.value === this.#tabStop ? 0 : -1}
                      ?disabled=${item.disabled} draggable=${(this.reorderable || this.detachable) && !item.disabled}
                      @focus=${() => { if (this.#tabStop !== item.value) { this.#tabStop = item.value; this.requestUpdate(); } }}
                      @click=${() => this.#select(item.value)}
                      @dragstart=${(event: DragEvent) => this.#dragStart(event, item)}>${label}</button>
                  </div>
                `;
              })}
            </div>
            ${repeat(this.#tabs, item => item, (item, index) => item.closable ? html`
              <button type="button" class="close" part="close" data-key=${item.value} ?disabled=${item.disabled}
                style=${`grid-column: ${index + 1}`} tabindex=${item.value === this.value ? 0 : -1}
                aria-label=${`${this.closeLabel || 'Close'} ${item.label || item.value}`}
                @click=${() => { void this.closeTab(item.value); }}>×</button>
            ` : nothing)}
          </div>
        ` : html`
          <div class="empty" part="empty" tabindex="-1" ?data-drop=${!!this.#dropPreview}
            @dragover=${this.#dragOver} @dragleave=${this.#dragLeave} @drop=${this.#drop}>
            <slot name="empty"></slot>
          </div>`}
        ${repeat(this.#tabs, item => item, item => {
          const id = this.#ids.get(item);
          return html`
            <div class="panel" part="panel" id="panel-${id}" role="tabpanel"
              aria-labelledby="tab-${id}" tabindex="0" ?hidden=${item.value !== this.value}>
              <slot id="slot-${id}"></slot>
            </div>
          `;
        })}
      </div>
    `;
  }
}

defineElement('metro-tab-view', MetroTabView);

declare global {
  interface HTMLElementTagNameMap { 'metro-tab-view': MetroTabView; }
  interface HTMLElementEventMap {
    'metro-before-tab-close': CustomEvent<MetroTabCloseDetail>;
    'metro-tab-close': CustomEvent<Omit<MetroTabCloseDetail, 'waitUntil'>>;
    'metro-before-tab-receive': CustomEvent<MetroTabTransferDetail>;
    'metro-tab-detach-request': CustomEvent<MetroTabDetachDetail>;
    'metro-tab-transferred': CustomEvent<MetroTabTransferDetail>;
    'metro-tab-reorder': CustomEvent<{ value: string; index: number }>;
  }
}
