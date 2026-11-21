import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { MetroCollectionItem } from './collection-control.js';
import { defineElement } from './define.js';
import './list-item.js';
import type { MetroListItem } from './list-item.js';
import { metroTheme } from './theme.js';

export type MetroReorderSource = 'pointer' | 'keyboard';
export type MetroTransferOperation = 'move' | 'copy';
export interface MetroReorderDetail {
  readonly value: string;
  readonly before: string | null;
  readonly values: readonly string[];
  readonly source: MetroReorderSource;
}
export type MetroReorderEvent = CustomEvent<MetroReorderDetail>;

interface Entry extends MetroCollectionItem { element?: MetroListItem; }
interface Reordering {
  value: string;
  before: string | null;
  initial: readonly string[];
  source: MetroReorderSource;
}

export class MetroReorderList extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    items: { attribute: false },
    label: { type: String },
    handleLabel: { type: String, attribute: 'handle-label' },
    instructions: { type: String },
    disabled: { type: Boolean, reflect: true },
    transfer: { type: String, reflect: true },
    groupKey: { type: String, attribute: 'group-key', reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; overflow: hidden auto; color: var(--_metro-fg); }
    ul { margin: 0; padding: 0; list-style: none; }
    :host([transfer]:not([transfer=""])) ul { min-block-size: 2.75rem; }
    li {
      position: relative;
      display: flex;
      align-items: center;
      min-block-size: 2.75rem;
      gap: calc(var(--_metro-space) / 2);
      background: var(--metro-reorder-background, var(--_metro-bg));
    }
    .content { flex: 1; min-inline-size: 0; padding-inline: var(--_metro-space); overflow-wrap: anywhere; }
    .handle {
      align-self: stretch;
      display: grid;
      place-items: center;
      inline-size: 2.75rem;
      min-block-size: 2.75rem;
      border: 0;
      border-radius: 0;
      background: var(--_metro-chrome);
      color: inherit;
      cursor: grab;
    }
    .handle:disabled { color: var(--_metro-disabled); cursor: default; }
    .handle[aria-pressed="true"] { color: var(--_metro-on-accent); background: var(--_metro-accent); cursor: grabbing; }
    .handle:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .grip { inline-size: 1.05rem; block-size: .7rem; border-block: 2px solid currentColor; display: grid; align-items: center; }
    .grip::after { content: ''; border-block-start: 2px solid currentColor; }
    .marker { position: absolute; inset: 0 0 auto; block-size: 2px; background: var(--metro-reorder-marker, var(--_metro-accent)); pointer-events: none; }
    .end { position: relative; block-size: .4rem; }
    .visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    @media (forced-colors: active) { .marker { forced-color-adjust: none; background: Highlight; } }
  `];

  declare items: readonly MetroCollectionItem[] | null;
  declare label: string;
  declare handleLabel: string;
  declare instructions: string;
  declare disabled: boolean;
  declare transfer: string;
  declare groupKey: string;

  #entries: Entry[] = [];
  #move?: Reordering;
  #over = false;
  #focus = '';
  #revealHandle = false;
  #message = '';
  #transferBefore: string | null | undefined;
  #announceTransferChange = false;
  #observer = new MutationObserver(() => this.requestUpdate());

  constructor() {
    super();
    this.items = null;
    this.label = 'Reorder items';
    this.handleLabel = 'Move';
    this.instructions = 'Press Space to pick up an item, Up or Down to move, Enter to drop, or Escape to cancel.';
    this.disabled = false;
    this.transfer = '';
    this.groupKey = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['value', 'disabled', 'label', 'hidden'] });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#move = undefined;
    this.#focus = '';
    this.#revealHandle = false;
    this.#over = false;
    this.#transferBefore = undefined;
    super.disconnectedCallback();
  }

  get values(): readonly string[] { return this.#collect().map(item => item.value); }
  get proposal(): MetroReorderDetail | null { return this.#move ? this.#detail(this.#move) : null; }
  get transferItems(): readonly MetroCollectionItem[] { return this.#collect(); }
  get transferOperations(): readonly MetroTransferOperation[] {
    const operations = new Set(this.transfer.trim().split(/\s+/));
    return (['move', 'copy'] as const).filter(operation => operations.has(operation));
  }

  focusItem(value: string, options?: FocusOptions): boolean {
    const handle = Array.from(this.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-reorder-handle]') ?? [])
      .find(button => !button.disabled && button.dataset.reorderHandle === value);
    if (!handle) return false;
    handle.focus({ ...options, preventScroll: true });
    if (this.shadowRoot?.activeElement !== handle) return false;
    if (!options?.preventScroll) handle.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    return true;
  }

  /** Presents a proposed insertion supplied by the owning transfer scope. */
  showTransferInsertion(before?: string | null): void {
    if (before === this.#transferBefore) return;
    this.#transferBefore = before;
    this.requestUpdate();
  }

  cancel(): boolean { return this.#cancel(true); }

  /** @internal Hands the native drag to the transfer scope after it captures a selected set. */
  handoffTransferDrag(): void {
    if (this.#move?.source !== 'pointer') return;
    this.#move = undefined;
    this.#over = false;
    this.#message = '';
    this.requestUpdate();
  }

  /** @internal A batch can only produce complete sequences for groups with unique keys. */
  hasDuplicateTransferKeys(): boolean {
    const inputs = this.#inputs().map(item => item.value).filter(Boolean);
    return new Set(inputs).size !== inputs.length;
  }

  #inputs(): readonly Entry[] {
    return this.items ?? Array.from(this.children).filter((child): child is MetroListItem =>
      child.localName === 'metro-list-item' && !(child as HTMLElement).hidden,
    ).map(element => ({ value: element.value, label: element.label || element.textContent?.trim() || element.value,
      disabled: element.disabled, element }));
  }

  #collect(): Entry[] {
    const keys = new Set<string>();
    return this.#inputs().filter(item => {
      if (!item.value || keys.has(item.value)) return false;
      keys.add(item.value);
      return true;
    });
  }

  #valid(move: Reordering, entries: Entry[]): boolean {
    return !this.disabled && entries.length === move.initial.length && entries.some(item => item.value === move.value && !item.disabled)
      && entries.every((item, index) => item.value === move.initial[index]);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const previous = this.#entries;
    const active = this.shadowRoot?.activeElement as HTMLElement | null | undefined;
    const activeKey = active?.dataset.reorderHandle;
    this.#entries = this.#collect();
    this.#announceTransferChange = Boolean(this.transfer) && (changed.has('items') || previous.length !== this.#entries.length
      || this.#entries.some((entry, index) => entry.value !== previous[index]?.value || entry.label !== previous[index]?.label
        || entry.disabled !== previous[index]?.disabled));
    if (this.#move && !this.#valid(this.#move, this.#entries)) this.#cancel(true);
    if (activeKey) this.#focus = activeKey;
    if (this.#focus && !this.#entries.some(item => item.value === this.#focus && !item.disabled)) {
      const index = previous.findIndex(item => item.value === this.#focus);
      const neighbors = this.#entries.slice(Math.max(0, index)).concat(this.#entries.slice(0, Math.max(0, index)).reverse());
      this.#focus = neighbors.find(item => !item.disabled)?.value ?? '';
    }
  }

  protected override updated(): void {
    const sources = new Map(this.#entries.map(item => [item.value, item.element]));
    for (const slot of this.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot[data-value]')) {
      const element = sources.get(slot.dataset.value!);
      if (element && slot.assignedElements()[0] !== element) slot.assign(element);
    }
    const key = this.#focus;
    this.#focus = '';
    const revealHandle = this.#revealHandle;
    this.#revealHandle = false;
    if (key && !this.disabled && (this.shadowRoot?.activeElement as HTMLElement | undefined)?.dataset.reorderHandle !== key) {
      this.focusItem(key, { preventScroll: true });
    }
    if (this.#move?.source === 'keyboard') this.#reveal(this.renderRoot.querySelector('[part="marker"]'));
    else if (revealHandle && key && !this.disabled) this.#reveal(this.shadowRoot?.activeElement);
    if (this.#announceTransferChange) this.dispatchEvent(new Event('metro-transfer-list-change', { bubbles: true, composed: true }));
  }

  #reveal(target?: Element | null): void {
    if (!target || !this.clientHeight) return;
    const top = this.getBoundingClientRect().top + this.clientTop;
    const bottom = top + this.clientHeight;
    const bounds = target.getBoundingClientRect();
    const offset = bounds.top < top ? bounds.top - top : Math.max(0, bounds.bottom - bottom);
    if (offset) this.scrollBy({ top: offset, behavior: 'instant' });
  }

  #start(item: Entry, source: MetroReorderSource): boolean {
    if (this.disabled || item.disabled || this.#move) return false;
    const initial = this.values;
    const index = initial.indexOf(item.value);
    if (index < 0) return false;
    this.#move = { value: item.value, before: initial[index + 1] ?? null, initial, source };
    this.#over = source === 'keyboard';
    this.#message = `Moving ${item.label}.`;
    this.requestUpdate();
    return true;
  }

  #detail(move: Reordering): MetroReorderDetail {
    const values = move.initial.filter(value => value !== move.value);
    const index = move.before === null ? values.length : values.indexOf(move.before);
    values.splice(index, 0, move.value);
    return { value: move.value, before: move.before, values, source: move.source };
  }

  #preview(before: string | null): void {
    const move = this.#move;
    if (!move || before === move.value || (before !== null && !move.initial.includes(before))) return;
    this.#over = true;
    this.requestUpdate();
    if (move.before === before) return;
    move.before = before;
    const detail = this.#detail(move);
    this.#message = `Position ${detail.values.indexOf(move.value) + 1} of ${detail.values.length}.`;
    this.dispatchEvent(new CustomEvent('metro-reorder-preview', { detail, bubbles: true, composed: true }) satisfies MetroReorderEvent);
  }

  #commit(): void {
    const move = this.#move;
    if (!move) return;
    if (!this.#valid(move, this.#collect())) { this.#cancel(true); return; }
    const detail = this.#detail(move);
    this.#move = undefined;
    this.#over = false;
    this.#focus = move.value;
    this.#revealHandle = move.source === 'keyboard';
    const changed = detail.values.some((value, index) => value !== move.initial[index]);
    if (changed) {
      const root = this.getRootNode() as Document | ShadowRoot;
      const previousFocus = root.activeElement;
      const accepted = this.dispatchEvent(new CustomEvent('metro-reorder', {
        detail, bubbles: true, composed: true, cancelable: true,
      }) satisfies MetroReorderEvent);
      if (root.activeElement && root.activeElement !== previousFocus && root.activeElement !== this.ownerDocument.body) {
        this.#focus = '';
        this.#revealHandle = false;
      }
      this.#message = accepted ? 'Reorder requested.' : 'Reorder canceled.';
    } else this.#message = 'Order unchanged.';
    this.requestUpdate();
  }

  #cancel(restoreFocus: boolean): boolean {
    const move = this.#move;
    if (!move) return false;
    this.#move = undefined;
    this.#over = false;
    if (restoreFocus) this.#focus = move.value;
    this.#revealHandle = restoreFocus && move.source === 'keyboard';
    this.#message = 'Reorder canceled.';
    this.requestUpdate();
    return true;
  }

  #onKey(item: Entry, event: KeyboardEvent): void {
    if (event.defaultPrevented || this.disabled || item.disabled || event.altKey || event.metaKey || event.ctrlKey) return;
    const key = event.key;
    const move = this.#move;
    if (!move) {
      if ((key === ' ' || key === 'Enter') && !event.repeat && this.#start(item, 'keyboard')) event.preventDefault();
      return;
    }
    if (move.source !== 'keyboard' || item.value !== move.value) return;
    switch (key) {
      case 'Escape': this.#cancel(true); break;
      case ' ':
      case 'Enter': if (!event.repeat) this.#commit(); break;
      case 'ArrowUp':
      case 'ArrowDown': {
        const others = move.initial.filter(value => value !== move.value);
        const current = move.before === null ? others.length : others.indexOf(move.before);
        const next = Math.min(others.length, Math.max(0, current + (key === 'ArrowDown' ? 1 : -1)));
        this.#preview(others[next] ?? null);
        break;
      }
      default: return;
    }
    event.preventDefault();
  }

  #onHandle(item: Entry): void {
    if (!this.#move) this.#start(item, 'keyboard');
    else if (this.#move.source === 'keyboard' && this.#move.value === item.value) this.#commit();
  }

  #onDragStart(item: Entry, event: DragEvent): void {
    if (!event.dataTransfer || !this.#start(item, 'pointer')) { event.preventDefault(); return; }
    const handle = event.currentTarget as HTMLElement;
    const operations = this.transferOperations;
    event.dataTransfer.effectAllowed = operations.includes('copy') ? 'copyMove' : 'move';
    event.dataTransfer.setData('text/plain', item.value);
    handle.focus({ preventScroll: true });
  }

  #onDragOver(event: DragEvent): void {
    const move = this.#move;
    if (!move || move.source !== 'pointer') return;
    if (!this.#valid(move, this.#collect())) { this.#cancel(true); return; }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const target = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement
      && node.getRootNode() === this.shadowRoot && Boolean(node.dataset.reorderKey));
    const key = target?.dataset.reorderKey;
    if (!key || !target) { this.#preview(null); return; }
    if (key === move.value) { this.#preview(move.initial[move.initial.indexOf(move.value) + 1] ?? null); return; }
    const bounds = target.getBoundingClientRect();
    const others = move.initial.filter(value => value !== move.value);
    this.#preview(event.clientY < bounds.top + bounds.height / 2 ? key : others[others.indexOf(key) + 1] ?? null);
  }

  #onDragLeave(event: DragEvent): void {
    if (this.#move?.source !== 'pointer') return;
    const list = event.currentTarget as HTMLElement;
    const box = list.getBoundingClientRect();
    if (event.clientX >= box.left && event.clientX < box.right && event.clientY >= box.top && event.clientY < box.bottom) return;
    this.#over = false;
    this.requestUpdate();
  }

  #onDrop(event: DragEvent): void {
    if (this.#move?.source !== 'pointer') return;
    this.#onDragOver(event);
    this.#commit();
  }

  protected override render() {
    const marker = this.#over ? this.#move?.before : this.#transferBefore;
    return html`
      <div id="instructions" class="visually-hidden">${this.instructions}</div>
      <span class="visually-hidden" role="status" part="status">${this.#message}</span>
      <ul role="list" part="list" aria-label=${this.label || nothing} @dragover=${this.#onDragOver}
        @dragleave=${this.#onDragLeave} @drop=${this.#onDrop}>
        ${repeat(this.#entries, item => item.value, item => html`<li part="item" data-reorder-key=${item.value}>
          ${marker === item.value ? html`<span class="marker" part="marker" aria-hidden="true"></span>` : nothing}
          <div class="content" part="content">${item.element ? html`<slot data-value=${item.value}></slot>` : item.label || item.value}</div>
          <button class="handle" part="handle" type="button" draggable=${!this.disabled && !item.disabled ? 'true' : 'false'}
            data-reorder-handle=${item.value} ?disabled=${this.disabled || item.disabled}
            aria-label=${`${this.handleLabel} ${item.label || item.value}`} aria-describedby="instructions"
            aria-pressed=${this.#move?.value === item.value ? 'true' : 'false'}
            @keydown=${(event: KeyboardEvent) => this.#onKey(item, event)} @click=${() => this.#onHandle(item)}
            @dragstart=${(event: DragEvent) => this.#onDragStart(item, event)}
            @dragend=${() => { if (this.#move?.source === 'pointer') this.#cancel(true); }}
            @blur=${() => { if (this.#move?.source === 'keyboard' && this.#move.value === item.value) this.#cancel(false); }}>
            <span class="grip" aria-hidden="true"></span>
          </button>
        </li>`)}
        ${this.#entries.length || this.transferOperations.length ? html`<li class="end" role="presentation" aria-hidden="true">
          ${marker === null ? html`<span class="marker" part="marker"></span>` : nothing}</li>` : nothing}
      </ul>
      ${this.#entries.length ? nothing : html`<slot name="empty"></slot>`}`;
  }
}

defineElement('metro-reorder-list', MetroReorderList);

declare global {
  interface HTMLElementTagNameMap { 'metro-reorder-list': MetroReorderList; }
  interface HTMLElementEventMap {
    'metro-reorder-preview': MetroReorderEvent;
    'metro-reorder': MetroReorderEvent;
  }
}
