import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

interface TreeItemState {
  owner: HTMLElement;
  children: readonly MetroTreeItem[];
  active: boolean;
  selected?: boolean;
  disabled: boolean;
  level: number;
  position: number;
  size: number;
}

// A page may load the browser bundle after registering the individual item module.
const stateKey = Symbol.for('windows-phone-metro-ui.tree-item-state');
const nameKey = Symbol.for('windows-phone-metro-ui.tree-item-name');
type PresentedItem = MetroTreeItem & { [stateKey]?: TreeItemState; [nameKey]?: string };

export function isTreeItem(node: EventTarget): node is MetroTreeItem {
  return node instanceof HTMLElement && node.localName === 'metro-tree-item';
}

function setAttribute(element: Element, name: string, value?: string | number | boolean) {
  if (value === undefined) element.removeAttribute(name);
  else if (element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
}

function labelNodes(item: MetroTreeItem): (Element | Text)[] {
  return Array.from(item.childNodes).filter((node): node is Element | Text =>
    (node instanceof Text && Boolean(node.textContent?.trim())) ||
    (node instanceof Element && (node.slot === 'label' || (node.localName !== 'metro-tree-item' && !node.slot))));
}

export function treeItemName(item: MetroTreeItem): string {
  const label = item.getAttribute('aria-label');
  if (label && label !== (item as PresentedItem)[nameKey]) return label;
  return item.label || labelNodes(item).map(node => node.textContent?.trim()).filter(Boolean).join(' ') || item.value;
}

/** Sets the presentation derived from the owning tree's current structure. */
export function applyTreeItemState(item: MetroTreeItem, state: TreeItemState): void {
  (item as PresentedItem)[stateKey] = state;
  setAttribute(item, 'role', 'treeitem');
  setAttribute(item, 'tabindex', state.active && !state.disabled ? 0 : -1);
  setAttribute(item, 'aria-expanded', state.children.length ? item.expanded : undefined);
  setAttribute(item, 'aria-selected', state.selected);
  setAttribute(item, 'aria-disabled', state.disabled || undefined);
  setAttribute(item, 'aria-level', state.level);
  setAttribute(item, 'aria-posinset', state.position);
  setAttribute(item, 'aria-setsize', state.size);
  syncName(item);
  item.requestUpdate();
}

function syncName(item: MetroTreeItem) {
  const presented = item as PresentedItem;
  const current = item.getAttribute('aria-label');
  if (current && current !== presented[nameKey]) return;
  const name = treeItemName(item);
  presented[nameKey] = name;
  setAttribute(item, 'aria-label', name);
}

export function clearTreeItemState(item: MetroTreeItem, owner: HTMLElement): void {
  const presented = item as PresentedItem;
  if (presented[stateKey]?.owner !== owner) return;
  delete presented[stateKey];
  for (const name of ['role', 'tabindex', 'aria-expanded', 'aria-selected', 'aria-disabled', 'aria-level', 'aria-posinset', 'aria-setsize']) {
    item.removeAttribute(name);
  }
  if (item.getAttribute('aria-label') === presented[nameKey]) item.removeAttribute('aria-label');
  delete presented[nameKey];
  item.requestUpdate();
}

export class MetroTreeItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; outline: none; }
    [hidden], :host([hidden]) { display: none; }
    .row {
      display: flex;
      flex-wrap: wrap;
      min-block-size: var(--metro-tree-row-height, 2.75rem);
      align-items: center;
      gap: .25rem;
      padding-inline-end: var(--_metro-space);
      cursor: pointer;
    }
    :host([aria-selected="true"]) .row { color: var(--metro-tree-selected, var(--_metro-accent-text)); }
    :host([aria-disabled="true"]) .row { color: var(--_metro-disabled); cursor: default; }
    :host(:focus-visible) .row, button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .label { flex: 1 1 35%; min-inline-size: 0; overflow-wrap: anywhere; }
    :is(button, .spacer) {
      flex: none;
      inline-size: min(var(--metro-tree-indent, 2.75rem), max(44px, 14%));
      margin-inline-start: min(
        calc(var(--_metro-tree-depth) * var(--metro-tree-indent, 2.75rem)),
        calc(var(--_metro-tree-depth) * 6%),
        18%
      );
    }
    ::slotted([slot="actions"]) {
      box-sizing: border-box;
      min-inline-size: 0;
      max-inline-size: 100%;
      margin-inline-start: auto;
      overflow-wrap: anywhere;
    }
    button {
      display: grid;
      min-block-size: var(--metro-tree-row-height, 2.75rem);
      padding: 0;
      place-items: center;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      cursor: inherit;
    }
    button:enabled:active { background: var(--_metro-chrome); }
    .chevron {
      inline-size: .5rem;
      block-size: .5rem;
      border: solid currentColor;
      border-width: 2px 2px 0 0;
      transform: rotate(45deg);
    }
    .chevron:dir(rtl) { transform: rotate(-135deg); }
    :host([expanded]) .chevron { transform: rotate(135deg); }
    @media (forced-colors: active) {
      :host([aria-selected="true"]) .row { color: Highlight; }
      :host([aria-disabled="true"]) .row { color: GrayText; }
      :host(:focus-visible) .row, button:focus-visible { outline-color: Highlight; }
    }
  `];

  declare value: string;
  declare label: string;
  declare expanded: boolean;
  declare disabled: boolean;

  constructor() {
    super();
    this.value = '';
    this.label = '';
    this.expanded = false;
    this.disabled = false;
  }

  protected override updated(): void {
    const state = (this as PresentedItem)[stateKey];
    this.shadowRoot?.querySelector<HTMLSlotElement>('#label')?.assign(...labelNodes(this));
    this.shadowRoot?.querySelector<HTMLSlotElement>('#actions')?.assign(...Array.from(this.children).filter(node => node.slot === 'actions'));
    this.shadowRoot?.querySelector<HTMLSlotElement>('#children')?.assign(...(state?.children ?? []));
  }

  protected override render() {
    const state = (this as PresentedItem)[stateKey];
    const branch = Boolean(state?.children.length);
    const disabled = state?.disabled ?? this.disabled;
    return html`
      <div class="row" part="row" style=${`--_metro-tree-depth: ${(state?.level ?? 1) - 1}`}>
        ${branch ? html`<button type="button" part="disclosure" tabindex="-1" aria-hidden="true" ?disabled=${disabled}>
          <span class="chevron" aria-hidden="true"></span>
        </button>` : html`<span class="spacer" aria-hidden="true"></span>`}
        <span class="label" part="label" ?inert=${disabled}><slot id="label" name="label">${this.label || this.value}</slot></span>
        <slot id="actions" name="actions" ?inert=${disabled}></slot>
      </div>
      ${branch ? html`<div class="children" part="group" role="group" ?hidden=${!this.expanded}>
        <slot id="children"></slot>
      </div>` : nothing}
    `;
  }
}

defineElement('metro-tree-item', MetroTreeItem);

declare global {
  interface HTMLElementTagNameMap { 'metro-tree-item': MetroTreeItem; }
}
