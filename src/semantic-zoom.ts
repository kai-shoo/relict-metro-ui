import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { anchorElement, restoreCollectionAnchor, type CollectionAnchorTarget } from './collection-anchor.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import type { MetroScrollAnchor } from './scroll-viewer.js';
import { metroTheme } from './theme.js';

export type MetroZoomView = 'detail' | 'overview';
export interface MetroZoomGroup {
  readonly value: string;
  readonly label: string;
  readonly anchor?: string;
  readonly disabled?: boolean;
}
export type MetroZoomChangeEvent = CustomEvent<{ view: MetroZoomView; value: string }>;

interface DetailPosition {
  target: CollectionAnchorTarget;
  anchor: MetroScrollAnchor | null;
  top: number;
  focus: HTMLElement | null;
}

export class MetroSemanticZoom extends LitElement {
  static override properties: PropertyDeclarations = {
    view: { type: String, reflect: true },
    value: { type: String, reflect: true },
    groups: { attribute: false },
    overviewLabel: { type: String, attribute: 'overview-label' },
    detailLabel: { type: String, attribute: 'detail-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }
    [hidden] { display: none !important; }
    button { border-radius: 0; color: inherit; font: inherit; cursor: pointer; }
    button:disabled { opacity: .55; cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    .toggle {
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      margin-block-end: var(--_metro-space);
      padding: .25rem var(--_metro-space);
      border: 2px solid currentColor;
      background: transparent;
      overflow-wrap: anywhere;
    }
    .groups {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(99px, 100%), 1fr));
      gap: var(--metro-zoom-gap, 6px);
    }
    .group {
      min-block-size: 99px;
      padding: .5rem;
      border: 2px solid transparent;
      overflow-wrap: anywhere;
      background: var(--metro-zoom-tile-background, var(--_metro-accent));
      color: var(--metro-zoom-tile-color, var(--_metro-on-accent));
      font-size: 1.4rem;
      text-align: start;
    }
    .group[aria-current] { border-color: currentColor; }
    @media (forced-colors: active) {
      .group { border-color: ButtonText; }
      .group[aria-current], button:focus-visible { outline-color: Highlight; border-color: Highlight; }
    }
  `];

  declare view: MetroZoomView;
  declare value: string;
  declare groups: readonly MetroZoomGroup[];
  declare overviewLabel: string;
  declare detailLabel: string;

  #position: DetailPosition | null = null;
  #version = 0;
  #focusedGroup?: Element;

  constructor() {
    super();
    this.view = 'detail';
    this.value = '';
    this.groups = [];
    this.overviewLabel = 'Groups';
    this.detailLabel = 'Back to details';
  }

  showOverview(): boolean {
    if (this.view === 'overview' || !this.#choices().some(group => !group.disabled)) return false;
    this.#saveDetail();
    this.view = 'overview';
    const version = ++this.#version;
    void this.updateComplete.then(() => {
      if (this.view === 'overview' && version === this.#version) this.#focusChoice();
    });
    return true;
  }

  async showDetail(): Promise<boolean> {
    if (this.view !== 'overview') return false;
    const version = ++this.#version;
    this.view = 'detail';
    await this.updateComplete;
    if (this.view !== 'detail' || version !== this.#version) return false;
    const saved = this.#position;
    this.#position = null;
    let savedFocus: HTMLElement | null = null;
    if (saved && saved.target === this.#detailTarget()) {
      const anchor = saved.anchor;
      if (!anchor || !saved.target.restoreAnchor?.(anchor)) saved.target.scrollTop = saved.top;
      let node: Node | null = saved.focus;
      while (node && node !== saved.target) {
        node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
      }
      if (node === saved.target) savedFocus = saved.focus;
    }
    if (this.#canRestoreFocus() && !tryFocus(savedFocus)) tryFocus(this.#toggle);
    return true;
  }

  async zoomToGroup(value: string): Promise<boolean> {
    const group = this.#choices().find(item => item.value === value && !item.disabled);
    const target = this.#detailTarget();
    if (!group || !target) return false;
    const from = this.view;
    const version = ++this.#version;
    this.view = 'detail';
    await this.updateComplete;
    if (this.view !== 'detail' || version !== this.#version) return false;
    const key = group.anchor ?? group.value;
    const jumped = target.jumpToGroup?.(key);
    if (!jumped && !restoreCollectionAnchor(target, key)) {
      this.view = from;
      await this.updateComplete;
      if (from === 'overview' && version === this.#version && this.#canRestoreFocus()) this.#focusChoice(value);
      return false;
    }
    this.#position = null;
    this.value = group.value;
    if (!jumped && !target.focusItem?.(key, { preventScroll: true })) {
      const element = anchorElement(target, key);
      if (element) {
        if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) element.tabIndex = -1;
        element.focus({ preventScroll: true });
      } else this.#toggle?.focus({ preventScroll: true });
    }
    return true;
  }

  get #toggle() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.toggle'); }

  #canRestoreFocus(): boolean {
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement ?? this.ownerDocument.activeElement;
    return !active || active === this.ownerDocument.body || this.matches(':focus-within');
  }

  #detailTarget(): CollectionAnchorTarget | undefined {
    const detail = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="detail"]')?.assignedElements();
    const defaults = this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')?.assignedElements();
    return (detail?.length ? detail[0] : defaults?.[0]) as CollectionAnchorTarget | undefined;
  }

  #choices(): readonly MetroZoomGroup[] {
    const values = new Set<string>();
    if (this.groups.length) return this.groups.filter(group => {
      if (!group.value || values.has(group.value)) return false;
      values.add(group.value);
      return true;
    });
    return Array.from(this.querySelectorAll<HTMLElement>('[slot="overview"][data-metro-group], [slot="overview"] [data-metro-group]'))
      .flatMap(element => element.dataset.metroGroup ? [{ value: element.dataset.metroGroup,
        label: element.textContent?.trim() || '', disabled: element.matches(':disabled,[aria-disabled="true"]') }] : []);
  }

  #saveDetail(): void {
    const target = this.#detailTarget();
    if (!target) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    let focus = root.activeElement;
    if (!(focus instanceof HTMLElement) || !this.matches(':focus-within')) focus = null;
    while (focus?.shadowRoot?.activeElement) focus = focus.shadowRoot.activeElement;
    const anchor = target.getAnchor?.() ?? null;
    this.#position = { target, anchor, top: target.scrollTop, focus: focus instanceof HTMLElement ? focus : null };
    const key = focus?.closest<HTMLElement>('[data-metro-group]')?.dataset.metroGroup ?? anchor?.key;
    const group = this.#choices().find(item => !item.disabled && (item.value === key || item.anchor === key));
    if (group) this.value = group.value;
  }

  #focusChoice(value = this.value): void {
    const element = (control: HTMLElement) => !control.matches(':disabled,[aria-disabled="true"]') && control.getClientRects().length > 0;
    const choices = [
      ...Array.from(this.querySelectorAll<HTMLElement>('[slot="overview"][data-metro-group], [slot="overview"] [data-metro-group]')),
      ...Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>('.group') ?? []),
    ].filter(element);
    const target = choices.find(item => item.dataset.metroGroup === value) ?? choices[0];
    if (target && tryFocus(target)) target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    else tryFocus(this.#toggle);
  }

  #emit() {
    this.dispatchEvent(new CustomEvent('metro-zoom-change', {
      detail: { view: this.view, value: this.value }, bubbles: true, composed: true,
    }) satisfies MetroZoomChangeEvent);
  }

  async #toggleView() {
    const changed = this.view === 'overview' ? await this.showDetail() : this.showOverview();
    if (changed) this.#emit();
  }

  #onKey(event: KeyboardEvent): void {
    if (this.view !== 'overview' || event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    void this.#toggleView();
  }

  async #onGroup(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const control = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.dataset.metroGroup));
    if (!control || control.matches(':disabled,[aria-disabled="true"]')) return;
    event.preventDefault();
    if (await this.zoomToGroup(control.dataset.metroGroup!)) this.#emit();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedGroup = this.view === 'overview' && changed.has('groups') && active?.matches('.group') ? active : undefined;
  }

  protected override updated(): void {
    const previous = this.#focusedGroup;
    this.#focusedGroup = undefined;
    if (!previous || (previous.isConnected && !previous.matches(':disabled'))) return;
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement ?? this.ownerDocument.activeElement;
    if (!active || active === this.ownerDocument.body || active === this.ownerDocument.documentElement || active === this) {
      this.#focusChoice();
    }
  }

  protected override render() {
    const overview = this.view === 'overview';
    const custom = Boolean(this.querySelector(':scope > [slot="overview"]'));
    const groups = this.#choices();
    return html`<div @keydown=${this.#onKey}>
      <button type="button" class="toggle" part="toggle" aria-controls="overview" aria-expanded=${overview}
        ?disabled=${!overview && !groups.some(group => !group.disabled)} @click=${this.#toggleView}>
        ${overview ? this.detailLabel : this.overviewLabel}
      </button>
      <div id="detail" part="detail" ?hidden=${overview}>
        <slot name="detail"><slot></slot></slot>
      </div>
      <section id="overview" part="overview" aria-label=${this.overviewLabel} ?hidden=${!overview} @click=${this.#onGroup}>
        <slot name="overview" @slotchange=${() => this.requestUpdate()}></slot>
        ${custom ? nothing : html`<div class="groups" part="groups">${repeat(groups, group => group.value, group => html`
          <button type="button" class="group" part="group" data-metro-group=${group.value}
            aria-current=${group.value === this.value ? 'location' : nothing} ?disabled=${group.disabled}>${group.label}</button>
        `)}</div>`}
      </section>
    </div>`;
  }
}

defineElement('metro-semantic-zoom', MetroSemanticZoom);

declare global {
  interface HTMLElementTagNameMap { 'metro-semantic-zoom': MetroSemanticZoom; }
  interface HTMLElementEventMap { 'metro-zoom-change': MetroZoomChangeEvent; }
}
