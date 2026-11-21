import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './reorder-list.js';
import type { MetroReorderList, MetroTransferOperation } from './reorder-list.js';
import type { MetroCrossSlideTransferEvent } from './cross-slide.js';
import type { MetroSelectionSet } from './selection-set.js';
import { metroTheme } from './theme.js';

export type { MetroTransferOperation } from './reorder-list.js';
export type MetroTransferInput = 'pointer' | 'keyboard' | 'programmatic';
export type MetroTransferDecision = boolean | string;

export interface MetroTransferProposal {
  readonly source: MetroReorderList;
  readonly target: MetroReorderList;
  readonly value: string;
  readonly before: string | null;
  readonly operation: MetroTransferOperation;
  readonly input: MetroTransferInput;
}

export interface MetroBeforeTransferDetail extends MetroTransferProposal {
  readonly signal: AbortSignal;
  accept(decision?: MetroTransferDecision | PromiseLike<MetroTransferDecision>): void;
}

export interface MetroTransferDetail extends MetroTransferProposal {
  readonly targetValue: string;
  readonly sourceValues: readonly string[];
  readonly targetValues: readonly string[];
}

export type MetroTransferPreviewEvent = CustomEvent<MetroTransferProposal>;
export type MetroBeforeTransferEvent = CustomEvent<MetroBeforeTransferDetail>;
export type MetroTransferEvent = CustomEvent<MetroTransferDetail>;

export interface MetroTransferBatchItem {
  readonly source: MetroReorderList;
  readonly sourceGroup: string;
  readonly value: string;
}

export interface MetroTransferBatchProposal {
  readonly items: readonly MetroTransferBatchItem[];
  readonly target: MetroReorderList;
  readonly targetGroup: string;
  readonly before: string | null;
  readonly operation: MetroTransferOperation;
  readonly input: MetroTransferInput;
}

export type MetroTransferBatchDecision = boolean | readonly string[];

export interface MetroBeforeTransferBatchDetail extends MetroTransferBatchProposal {
  readonly signal: AbortSignal;
  accept(decision?: MetroTransferBatchDecision | PromiseLike<MetroTransferBatchDecision>): void;
}

export interface MetroTransferBatchUpdate {
  readonly list: MetroReorderList;
  readonly group: string;
  readonly values: readonly string[];
}

export interface MetroTransferBatchDetail extends MetroTransferBatchProposal {
  readonly targetKeys: readonly string[];
  readonly updates: readonly MetroTransferBatchUpdate[];
}

export type MetroTransferBatchPreviewEvent = CustomEvent<MetroTransferBatchProposal>;
export type MetroBeforeTransferBatchEvent = CustomEvent<MetroBeforeTransferBatchDetail>;
export type MetroTransferBatchEvent = CustomEvent<MetroTransferBatchDetail>;

const defaultLabels = {
  source: 'Source', item: 'Item', destination: 'Destination', position: 'Position',
  operation: 'Operation', end: 'End of list', move: 'Move', copy: 'Copy', confirm: 'Transfer',
  cancel: 'Cancel transfer', waiting: 'Waiting for the destination.', approved: 'Transfer approved.',
  canceled: 'Transfer canceled.',
  before: (label: string) => `Before ${label}`,
  transferring: (label: string) => `Transferring ${label}.`,
  preview: (operation: string, destination: string) => `${operation} to ${destination}.`,
};

const defaultBatchLabels = {
  selected: (count: number) => `Transfer selected (${count})`,
  transferringBatch: (count: number) => `Transferring ${count} selected items.`,
  approvedBatch: (count: number, destination: string, position: number) =>
    `Transfer approved for ${count} items in ${destination}, starting at position ${position}.`,
  previewBatch: (operation: string, count: number, destination: string, position: number) =>
    `${operation} ${count} selected items to ${destination}, starting at position ${position}.`,
};

export type MetroTransferLabels = typeof defaultLabels & Partial<typeof defaultBatchLabels>;

type TransferApproval = MetroTransferDecision | MetroTransferBatchDecision;

interface Batch {
  items: readonly MetroTransferBatchItem[];
  sources: readonly ListSnapshot[];
}

interface ListSnapshot extends MetroTransferBatchUpdate { id: string; }

interface Session {
  source: MetroReorderList;
  sourceId: string;
  values: readonly string[];
  value: string;
  input: MetroTransferInput;
  cancellation: AbortController;
  batch?: Batch;
}

interface TargetPosition {
  target: MetroReorderList;
  targetId: string;
  targetGroup: string;
  values: readonly string[];
  before: string | null;
  operation: MetroTransferOperation;
}

function isReorderList(node: EventTarget): node is MetroReorderList {
  return node instanceof HTMLElement && node.localName === 'metro-reorder-list';
}

function pathAtPoint(document: Document, x: number, y: number): readonly Node[] {
  let element = document.elementFromPoint(x, y);
  while (element?.shadowRoot) {
    const inner = element.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === element || !element.shadowRoot.contains(inner)) break;
    element = inner;
  }
  const path: Node[] = [];
  let node: Node | null = element;
  while (node) {
    path.push(node);
    if (node instanceof ShadowRoot) node = node.host;
    else node = (node instanceof Element ? node.assignedSlot : null) ?? node.parentNode;
  }
  return path;
}

function sameKeys(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((key, index) => right[index] === key);
}

function groupOf(list: MetroReorderList): string { return list.groupKey || list.id; }

function snapshot(list: MetroReorderList): ListSnapshot {
  return { list, id: list.id, group: groupOf(list), values: list.values };
}

export class MetroCollectionTransfer extends LitElement {
  static override properties: PropertyDeclarations = {
    label: { type: String },
    labels: { attribute: false },
    controlsHidden: { type: Boolean, attribute: 'controls-hidden' },
    disabled: { type: Boolean, reflect: true },
    selection: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    fieldset {
      display: flex;
      flex-wrap: wrap;
      gap: var(--_metro-space);
      align-items: end;
      border: 0;
      min-inline-size: 0;
      margin: 0 0 var(--_metro-space);
      padding: 0;
    }
    legend { margin-block-end: .35rem; padding: 0; font-size: 1.25rem; }
    label { display: grid; grid-template-columns: minmax(0, 1fr); max-inline-size: 100%; gap: .2rem; }
    .selection { display: flex; gap: .4rem; align-items: center; min-block-size: 2.75rem; }
    .selection input { accent-color: var(--_metro-accent); }
    :is(select, button) {
      box-sizing: border-box;
      min-inline-size: 0;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding-inline: .5rem;
      border: 2px solid currentColor;
      border-radius: 0;
      background: var(--metro-transfer-control-background, var(--_metro-bg));
      color: inherit;
      font: inherit;
    }
    :is(select, button):disabled, button[aria-disabled="true"] { color: var(--_metro-disabled); }
    :is(select, button):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .cancel { border-color: transparent; }
    .status { display: block; color: var(--_metro-muted); }
    .status:empty { display: none; }
    @media (forced-colors: active) { :is(select, button):focus-visible { outline-color: Highlight; } }
  `];

  declare label: string;
  declare labels: Partial<MetroTransferLabels>;
  declare controlsHidden: boolean;
  declare disabled: boolean;
  declare selection: MetroSelectionSet | null;

  #session?: Session;
  #touch?: { origin: HTMLElement; pointer: number };
  #sequence = 0;
  #position?: TargetPosition;
  #pending = false;
  #message = '';
  #sourceId = '';
  #targetId = '';
  #item = '';
  #before = '';
  #operation: MetroTransferOperation = 'move';
  #batchControls = false;
  #observedSelection?: MetroSelectionSet;
  #onSelection = () => this.requestUpdate();
  #observer = new MutationObserver(() => this.requestUpdate());

  constructor() {
    super();
    this.label = 'Transfer between lists';
    this.labels = {};
    this.controlsHidden = false;
    this.disabled = false;
    this.selection = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { attributes: true, subtree: true, childList: true,
      attributeFilter: ['id', 'group-key', 'transfer', 'label', 'disabled', 'hidden'] });
    this.#watchSelection();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#watchSelection(null);
    this.#clear();
    this.#sequence++;
    super.disconnectedCallback();
  }

  get pending(): boolean { return this.#pending; }
  get #labels() { return { ...defaultLabels, ...defaultBatchLabels, ...this.labels }; }
  get proposal(): MetroTransferProposal | null {
    const session = this.#session;
    const position = this.#position;
    return session && !session.batch && position ? { source: session.source, target: position.target, value: session.value,
      before: position.before, operation: position.operation, input: session.input } : null;
  }

  get batchProposal(): MetroTransferBatchProposal | null {
    const session = this.#session;
    const position = this.#position;
    return session?.batch && position ? { items: session.batch.items, target: position.target,
      targetGroup: position.targetGroup, before: position.before, operation: position.operation, input: session.input } : null;
  }

  begin(source: MetroReorderList, value: string, input: MetroTransferInput = 'programmatic'): boolean {
    if (this.#pending || !this.#lists().includes(source) || !source.transferItems.some(item => item.value === value && !item.disabled)) return false;
    this.#begin(source, value, input);
    return true;
  }

  beginBatch(source: MetroReorderList, value: string, input: MetroTransferInput = 'programmatic'): boolean {
    const batch = this.#collectBatch(this.selection?.values ?? [], this.#lists());
    if (this.#pending || !batch?.items.some(item => item.source === source && item.value === value)) return false;
    this.#begin(source, value, input, batch);
    return true;
  }

  #begin(source: MetroReorderList, value: string, input: MetroTransferInput, batch?: Batch): void {
    this.#clear();
    this.#sequence++;
    this.#session = { source, value, values: source.values, sourceId: source.id, input, batch, cancellation: new AbortController() };
    this.#message = batch ? this.#labels.transferringBatch(batch.items.length)
      : this.#labels.transferring(source.transferItems.find(item => item.value === value)?.label || value);
    this.requestUpdate();
  }

  propose(target: MetroReorderList, before: string | null, operation: MetroTransferOperation): boolean {
    const session = this.#session;
    if (!session || this.#pending || !this.#allows(session, target, operation) || (before !== null &&
      (!target.values.includes(before) || (operation === 'move' && session.batch?.items.some(item => item.value === before))))) {
      if (!this.#pending) this.#clearPosition();
      return false;
    }
    const current = this.#position;
    if (current?.target === target && current.before === before && current.operation === operation && sameKeys(current.values, target.values)) return true;
    this.#clearPosition();
    const position = { target, before, operation, values: target.values, targetId: target.id, targetGroup: groupOf(target) };
    this.#position = position;
    target.showTransferInsertion(before);
    const labels = this.#labels;
    const batch = this.batchProposal;
    const destination = target.label || position.targetGroup;
    this.#message = batch ? labels.previewBatch(labels[operation], batch.items.length, destination,
      this.#batchInsertion(position, batch.items.map(item => item.value)).index + 1)
      : labels.preview(labels[operation], target.label || target.id);
    this.requestUpdate();
    if (batch) this.dispatchEvent(new CustomEvent('metro-transfer-batch-preview', {
      detail: batch, bubbles: true, composed: true,
    }) satisfies MetroTransferBatchPreviewEvent);
    else this.dispatchEvent(new CustomEvent('metro-transfer-preview', {
      detail: this.proposal!, bubbles: true, composed: true,
    }) satisfies MetroTransferPreviewEvent);
    return true;
  }

  async commit(): Promise<boolean> {
    const session = this.#session;
    const sequence = this.#sequence;
    const position = this.#position;
    const proposal = this.batchProposal ?? this.proposal;
    if (!session || !position || !proposal || this.#pending) return false;
    if (!this.#valid(session, position)) { this.#reject(); return false; }

    this.#pending = true;
    this.#message = this.#labels.waiting;
    this.requestUpdate();
    const decision = await this.#approval(proposal, session.cancellation.signal);
    if (this.#session !== session || this.#position !== position) return false;
    if (!this.#valid(session, position)) { this.#reject(); return false; }

    const focus = 'items' in proposal && session.batch
      ? this.#commitBatch(session, position, proposal, decision)
      : 'value' in proposal ? this.#commitSingle(session, position, proposal, decision) : null;
    if (focus === null) { this.#reject(); return false; }
    await position.target.updateComplete;
    if (sequence === this.#sequence && !this.#session && this.isConnected && this.#lists().includes(position.target)) {
      position.target.focusItem(focus, { preventScroll: session.input !== 'keyboard' && !('items' in proposal) });
    }
    return true;
  }

  #commitSingle(session: Session, position: TargetPosition, proposal: MetroTransferProposal, decision: TransferApproval): string | null {
    const targetValue = typeof decision === 'string' ? decision : session.value;
    if ((decision !== true && typeof decision !== 'string') || !targetValue || position.values.includes(targetValue)) return null;

    const targetValues = [...position.values];
    targetValues.splice(position.before === null ? targetValues.length : targetValues.indexOf(position.before), 0, targetValue);
    const sourceValues = position.operation === 'move' ? session.values.filter(value => value !== session.value) : [...session.values];
    this.#clear(false);
    this.#message = this.#labels.approved;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-transfer', {
      detail: { ...proposal, targetValue, sourceValues, targetValues }, bubbles: true, composed: true,
    }) satisfies MetroTransferEvent);
    return targetValue;
  }

  #commitBatch(session: Session, position: TargetPosition, proposal: MetroTransferBatchProposal, decision: TransferApproval): string | null {
    const keys = proposal.items.map(item => item.value);
    const moving = position.operation === 'move';
    let targetKeys: readonly string[];
    if (moving) {
      if (decision !== true) return null;
      targetKeys = keys;
    } else {
      const existing = new Set(this.#lists().flatMap(list => list.values));
      if (!Array.isArray(decision) || decision.length !== keys.length) return null;
      targetKeys = [...decision];
      if (new Set(targetKeys).size !== keys.length || targetKeys.some(key => typeof key !== 'string' || !key.trim() || existing.has(key))) return null;
    }

    const { remaining, targetValues, index } = this.#batchInsertion(position, keys);
    targetValues.splice(index, 0, ...targetKeys);
    const updates = session.batch!.sources.filter(entry => entry.list !== position.target)
      .map(({ list, group, values }) => ({ list, group, values: remaining(values) }));
    updates.push({ list: position.target, group: position.targetGroup, values: targetValues });
    this.#clear(false);
    this.#message = this.#labels.approvedBatch(keys.length, position.target.label || position.targetGroup, index + 1);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-transfer-batch', {
      detail: { ...proposal, targetKeys, updates }, bubbles: true, composed: true,
    }) satisfies MetroTransferBatchEvent);
    return targetKeys[keys.indexOf(session.value)];
  }

  #batchInsertion(position: TargetPosition, keys: readonly string[]) {
    const selected = new Set(position.operation === 'move' ? keys : []);
    const remaining = (values: readonly string[]) => values.filter(value => !selected.has(value));
    const targetValues = remaining(position.values);
    const index = position.before === null ? targetValues.length : targetValues.indexOf(position.before);
    return { remaining, targetValues, index };
  }

  async #approval(proposal: MetroTransferProposal | MetroTransferBatchProposal, signal: AbortSignal): Promise<TransferApproval> {
    let accepting = true;
    let approval: Promise<TransferApproval> | undefined;
    const accept = (decision: TransferApproval | PromiseLike<TransferApproval> = true) => {
      if (accepting && !approval) approval = Promise.resolve(decision).catch(() => false);
    };
    const options = { detail: { ...proposal, signal, accept }, bubbles: true, composed: true, cancelable: true };
    const type = 'items' in proposal ? 'metro-before-transfer-batch' : 'metro-before-transfer';
    const approved = proposal.target.dispatchEvent(new CustomEvent(type, options));
    accepting = false;
    return approved && approval ? this.#waitForApproval(approval, signal) : false;
  }

  async #waitForApproval(decision: Promise<TransferApproval>, signal: AbortSignal): Promise<TransferApproval> {
    if (signal.aborted) return false;
    const listener = new AbortController();
    const canceled = new Promise<false>(resolve => {
      signal.addEventListener('abort', () => resolve(false), { signal: listener.signal });
    });
    try {
      return await Promise.race([decision, canceled]);
    } finally {
      listener.abort();
    }
  }

  cancel(): boolean {
    if (!this.#session) return false;
    this.#reject();
    return true;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('selection') && this.isConnected) this.#watchSelection();
    if (this.#touch && !this.#touch.origin.isConnected) this.#reject();
    else if (this.#session && (this.#position ? !this.#valid(this.#session, this.#position)
      : !this.#sourceValid(this.#session, this.#lists()))) this.#reject();
  }

  #watchSelection(selection = this.selection): void {
    this.#observedSelection?.removeEventListener('change', this.#onSelection);
    this.#observedSelection = selection ?? undefined;
    this.#observedSelection?.addEventListener('change', this.#onSelection);
  }

  #lists(): MetroReorderList[] {
    if (this.disabled) return [];
    const ids = new Set<string>();
    return Array.from(this.querySelectorAll('metro-reorder-list')).filter(list => {
      if (!list.id || ids.has(list.id) || list.disabled || list.hidden || !list.transferOperations.length
        || list.closest('metro-collection-transfer') !== this) return false;
      ids.add(list.id);
      return true;
    });
  }

  #allows(session: Session, target: MetroReorderList, operation: MetroTransferOperation) {
    const lists = this.#lists();
    return (session.batch || session.source !== target) && lists.includes(target) && this.#sourceValid(session, lists)
      && (session.batch ? this.#uniqueGroup(target, lists) && !target.hasDuplicateTransferKeys()
        && session.batch.sources.every(entry => entry.list.transferOperations.includes(operation))
        : session.source.transferOperations.includes(operation))
      && target.transferOperations.includes(operation) && !target.proposal;
  }

  #valid(session: Session, position: TargetPosition): boolean {
    return this.#allows(session, position.target, position.operation) && position.target.id === position.targetId
      && (!session.batch || groupOf(position.target) === position.targetGroup) && sameKeys(position.values, position.target.values);
  }

  #sourceValid(session: Session, lists: MetroReorderList[]): boolean {
    if (!lists.includes(session.source) || session.source.id !== session.sourceId || !sameKeys(session.values, session.source.values)) return false;
    if (!session.batch) return session.source.transferItems.some(item => item.value === session.value && !item.disabled);
    const current = this.#collectBatch(session.batch.items.map(item => item.value), lists);
    return Boolean(current && current.sources.length === session.batch.sources.length && session.batch.sources.every(saved => {
      const found = current.sources.find(entry => entry.list === saved.list);
      return found && found.id === saved.id && found.group === saved.group && sameKeys(found.values, saved.values);
    }));
  }

  #collectBatch(keys: readonly string[], lists: MetroReorderList[]): Batch | null {
    const requested = new Set(keys);
    if (!keys.length || requested.size !== keys.length) return null;
    const found = new Set<string>();
    const items: MetroTransferBatchItem[] = [];
    const sources: ListSnapshot[] = [];
    for (const list of lists) {
      const group = groupOf(list);
      const entries = list.transferItems.filter(item => requested.has(item.value));
      if (!entries.length) continue;
      if (!this.#uniqueGroup(list, lists) || list.hasDuplicateTransferKeys()) return null;
      for (const item of entries) {
        if (item.disabled || found.has(item.value)) return null;
        found.add(item.value);
        items.push(Object.freeze({ source: list, sourceGroup: group, value: item.value }));
      }
      sources.push(snapshot(list));
    }
    return found.size === requested.size ? { items: Object.freeze(items), sources } : null;
  }

  #uniqueGroup(list: MetroReorderList, lists: MetroReorderList[]): boolean {
    const group = groupOf(list);
    return lists.every(other => other === list || groupOf(other) !== group);
  }

  #clearPosition(): void {
    this.#position?.target.showTransferInsertion();
    this.#position = undefined;
  }

  #clear(cancelApproval = true): void {
    const session = this.#session;
    this.#clearPosition();
    this.#session = undefined;
    this.#touch = undefined;
    this.#pending = false;
    if (cancelApproval) session?.cancellation.abort();
  }

  #reject(): void {
    const session = this.#session;
    const sequence = this.#sequence;
    this.#clear();
    this.#message = this.#labels.canceled;
    this.requestUpdate();
    if (session && this.isConnected) {
      void this.updateComplete.then(() => {
        if (this.isConnected && sequence === this.#sequence && !this.#session) {
          session.source.focusItem(session.value, { preventScroll: session.input !== 'keyboard' });
        }
      });
    }
  }

  #onDragStart(event: DragEvent): void {
    if (event.defaultPrevented || !event.dataTransfer) return;
    const path = event.composedPath();
    const list = path.find(isReorderList);
    const handle = path.find((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.dataset.reorderHandle));
    const value = handle?.dataset.reorderHandle;
    if (!list || !value || list.closest('metro-collection-transfer') !== this) return;
    if (this.selection?.has(value) && this.selection.values.length > 1) {
      if (!this.beginBatch(list, value, 'pointer')) {
        event.preventDefault();
        this.#message = this.#labels.canceled;
        this.requestUpdate();
      }
      list.handoffTransferDrag();
    } else this.begin(list, value, 'pointer');
  }

  #onDragOver(event: DragEvent): boolean {
    if (this.#touch) return false;
    const operation = this.#previewPointerTarget(event.composedPath(), event.clientY, event.ctrlKey || event.altKey);
    if (!operation) return false;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = operation;
    return true;
  }

  #previewPointerTarget(path: readonly EventTarget[], y: number, forceCopy: boolean): MetroTransferOperation | false {
    const session = this.#session;
    if (session?.input !== 'pointer' || this.#pending) return false;
    const target = path.find(isReorderList);
    if (!target || (target === session.source && !session.batch)) { this.#clearPosition(); return false; }
    if (this.#position?.target === target && !this.#valid(session, this.#position)) {
      this.#reject();
      return false;
    }
    const row = path.find((node): node is HTMLElement => node instanceof HTMLElement
      && node.getRootNode() === target.shadowRoot && Boolean(node.dataset.reorderKey));
    const bounds = row?.getBoundingClientRect();
    const key = row?.dataset.reorderKey;
    const values = target.values;
    const rowIndex = key ? values.indexOf(key) : -1;
    if (key && rowIndex < 0) { this.#clearPosition(); return false; }
    const insertion = rowIndex >= 0 && bounds ? rowIndex + Number(y >= bounds.top + bounds.height / 2) : values.length;
    const move = target.transferOperations.includes('move') && (session.batch?.sources ?? [{ list: session.source }])
      .every(({ list }) => list.transferOperations.includes('move'));
    const operation = forceCopy || !move ? 'copy' : 'move';
    const selected = new Set(operation === 'move' ? session.batch?.items.map(item => item.value) : undefined);
    const before = values.slice(insertion).find(value => !selected.has(value)) ?? null;
    return this.propose(target, before, operation) && operation;
  }

  #onCrossSlide(event: MetroCrossSlideTransferEvent): void {
    const path = event.composedPath();
    const origin = path.find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'metro-cross-slide');
    if (!origin || path.find(node => node instanceof HTMLElement && node.localName === 'metro-collection-transfer') !== this) return;
    const { phase, pointerId, value, clientX, clientY } = event.detail;
    if (phase === 'start') {
      if (this.#session) return;
      const source = path.find(isReorderList);
      if (!source) return;
      const batch = this.selection?.has(value) && this.selection.values.length > 1;
      if (!(batch ? this.beginBatch(source, value, 'pointer') : this.begin(source, value, 'pointer'))) return;
      this.#touch = { origin, pointer: pointerId };
    } else if (this.#touch?.origin !== origin || this.#touch.pointer !== pointerId) {
      return;
    }
    if (phase === 'cancel') { this.cancel(); return; }
    const target = this.#previewPointerTarget(pathAtPoint(this.ownerDocument, clientX, clientY), clientY, false);
    if (phase === 'drop') {
      if (target) void this.commit();
      else this.cancel();
    }
  }

  #onDrop(event: DragEvent): void { if (this.#onDragOver(event)) void this.commit(); }

  #onDragLeave(event: DragEvent): void {
    if (this.#session?.input !== 'pointer' || this.#pending) return;
    const surface = event.currentTarget as HTMLElement;
    const { left, right, top, bottom } = surface.getBoundingClientRect();
    if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) this.#clearPosition();
  }

  #onDragEnd(): void {
    if (this.#session?.input === 'pointer' && !this.#pending) {
      if (this.#session.batch) { this.#reject(); return; }
      this.#clear();
      this.#message = '';
      this.requestUpdate();
    }
  }

  #onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.cancel()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  #controls(lists: MetroReorderList[]) {
    const labels = this.#labels;
    const batchMode = Boolean(this.selection && this.#batchControls);
    const editingLocked = this.disabled || this.#pending;
    const selected = this.selection?.values ?? [];
    const batch = batchMode ? this.#collectBatch(selected, lists) : null;
    const source = lists.find(list => list.id === this.#sourceId) ?? lists[0];
    const sourceLists = batchMode ? batch?.sources.map(entry => entry.list) ?? [] : source ? [source] : [];
    const supports = (operation: MetroTransferOperation) => sourceLists.length > 0 && sourceLists.every(list => list.transferOperations.includes(operation));
    const targets = lists.filter(list => (batchMode ? this.#uniqueGroup(list, lists) && !list.hasDuplicateTransferKeys() : list !== source)
      && list.transferOperations.some(supports));
    const target = targets.find(list => list.id === this.#targetId) ?? targets[0];
    const items = source?.transferItems.filter(item => !item.disabled) ?? [];
    const item = items.find(entry => entry.value === this.#item)?.value ?? items[0]?.value ?? '';
    const operations = target?.transferOperations.filter(supports) ?? [];
    const operation = operations.includes(this.#operation) ? this.#operation : operations[0];
    const positions = target?.transferItems.filter(entry => !batch || operation !== 'move' || !selected.includes(entry.value)) ?? [];
    const before = positions.some(entry => entry.value === this.#before) ? this.#before : '';
    const anchor = batch?.items[0];
    const select = (event: Event) => (event.currentTarget as HTMLSelectElement).value;
    return html`<fieldset part="controls">
      <legend>${this.label}</legend>
      ${this.selection ? html`<label class="selection"><input type="checkbox" ?disabled=${editingLocked} .checked=${live(batchMode)} @change=${(event: Event) => {
        this.#batchControls = (event.currentTarget as HTMLInputElement).checked; this.#before = ''; this.requestUpdate();
      }}>${labels.selected(selected.length)}</label>` : nothing}
      ${batchMode ? nothing : html`<label>${labels.source} <select ?disabled=${editingLocked} .value=${live(source?.id ?? '')} @change=${(event: Event) => {
        this.#sourceId = select(event); this.#item = ''; this.#targetId = ''; this.requestUpdate();
      }}>${repeat(lists, list => list.id, list => html`<option value=${list.id}>${list.label || list.id}</option>`)}</select></label>
      <label>${labels.item} <select ?disabled=${editingLocked} .value=${live(item)} @change=${(event: Event) => { this.#item = select(event); this.requestUpdate(); }}>
        ${repeat(items, entry => entry.value, entry => html`<option value=${entry.value}>${entry.label || entry.value}</option>`)}
      </select></label>`}
      <label>${labels.destination} <select ?disabled=${editingLocked} .value=${live(target?.id ?? '')} @change=${(event: Event) => {
        this.#targetId = select(event); this.#before = ''; this.requestUpdate();
      }}>${repeat(targets, list => list.id, list => html`<option value=${list.id}>${list.label || list.id}</option>`)}</select></label>
      <label>${labels.position} <select ?disabled=${editingLocked} .value=${live(before)} @change=${(event: Event) => { this.#before = select(event); this.requestUpdate(); }}>
        <option value="">${labels.end}</option>
        ${repeat(positions, entry => entry.value, entry => html`<option value=${entry.value}>${labels.before(entry.label || entry.value)}</option>`)}
      </select></label>
      <label>${labels.operation} <select ?disabled=${editingLocked} .value=${live(operation ?? '')} @change=${(event: Event) => {
        this.#operation = select(event) as MetroTransferOperation; this.requestUpdate();
      }}>${operations.map(value => html`<option value=${value}>${labels[value]}</option>`)}</select></label>
      <button type="button" part="confirm" aria-disabled=${String(this.#pending)}
        ?disabled=${this.disabled || !target || !operation || (batchMode ? !anchor : !source || !item)}
        @click=${() => {
          if (editingLocked || !target || !operation) return;
          const begun = batchMode ? anchor && this.beginBatch(anchor.source, anchor.value, 'keyboard')
            : source && this.begin(source, item, 'keyboard');
          if (!begun) return;
          if (this.propose(target, before || null, operation)) void this.commit();
          else if (batchMode) this.cancel();
        }}>${labels.confirm}</button>
      ${this.#pending ? this.#cancelButton() : nothing}
    </fieldset>`;
  }

  #cancelButton() {
    return html`<button type="button" class="cancel" part="cancel" @click=${() => this.cancel()}>${this.#labels.cancel}</button>`;
  }

  protected override render() {
    return html`<div @keydown=${this.#onKey} @dragstart=${this.#onDragStart} @dragover=${this.#onDragOver} @dragleave=${this.#onDragLeave}
      @drop=${this.#onDrop} @dragend=${this.#onDragEnd} @metro-cross-slide-transfer=${this.#onCrossSlide}
      @metro-transfer-list-change=${() => this.requestUpdate()}>
      ${this.controlsHidden ? '' : this.#controls(this.#lists())}
      <slot></slot>
      ${this.#pending && this.controlsHidden ? this.#cancelButton() : nothing}
      <span class="status" part="status" role="status">${this.#message}</span>
    </div>`;
  }
}

defineElement('metro-collection-transfer', MetroCollectionTransfer);

declare global {
  interface HTMLElementTagNameMap { 'metro-collection-transfer': MetroCollectionTransfer; }
  interface HTMLElementEventMap {
    'metro-transfer-preview': MetroTransferPreviewEvent;
    'metro-before-transfer': MetroBeforeTransferEvent;
    'metro-transfer': MetroTransferEvent;
    'metro-transfer-batch-preview': MetroTransferBatchPreviewEvent;
    'metro-before-transfer-batch': MetroBeforeTransferBatchEvent;
    'metro-transfer-batch': MetroTransferBatchEvent;
  }
}
