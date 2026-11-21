import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { MetroCommandEvent } from './command-bar.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import './menu-flyout.js';
import type { MetroMenuFlyout } from './menu-flyout.js';
import { metroTheme } from './theme.js';

export type MetroSwipeSide = 'start' | 'end';
export type MetroSwipeMode = 'reveal' | 'execute';
export interface MetroSwipeAction {
  readonly id: string;
  readonly label: string;
  readonly side?: MetroSwipeSide;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
}
export type MetroSwipeActionEvent = CustomEvent<{ value: string; id: string; side: MetroSwipeSide }>;

interface Gesture {
  pointer: number;
  value: string;
  actions: readonly MetroSwipeAction[];
  mode: MetroSwipeMode;
  open: MetroSwipeSide | '';
  width: number;
  x: number;
  y: number;
  rtl: boolean;
  dragging: boolean;
}

export class MetroSwipeControl extends LitElement {
  static override properties: PropertyDeclarations = {
    value: { type: String },
    actions: { attribute: false },
    mode: { type: String, reflect: true },
    openSide: { type: String, attribute: 'open-side', reflect: true },
    actionsLabel: { type: String, attribute: 'actions-label' },
    busy: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .viewport {
      position: relative;
      overflow: hidden;
      touch-action: pan-y pinch-zoom;
      background: var(--_metro-chrome);
    }
    .viewport[data-open="start"] { --_rest: min(var(--_start), max(0px, calc(100% - 2.75rem))); }
    .viewport[data-open="end"] { --_rest: calc(-1 * min(var(--_end), max(0px, calc(100% - 2.75rem)))); }
    .viewport[data-open="start"]:dir(rtl) { --_rest: calc(-1 * min(var(--_start), max(0px, calc(100% - 2.75rem)))); }
    .viewport[data-open="end"]:dir(rtl) { --_rest: min(var(--_end), max(0px, calc(100% - 2.75rem))); }
    .content {
      position: relative;
      display: flex;
      align-items: stretch;
      min-block-size: 2.75rem;
      background: var(--metro-swipe-background, var(--_metro-bg));
      transform: translateX(var(--_drag, var(--_rest, 0px)));
      transition: transform var(--_metro-motion) ease-out;
    }
    .viewport[data-dragging] .content { transition: none; user-select: none; }
    .body {
      flex: 1;
      min-inline-size: 0;
      align-content: center;
      overflow-wrap: anywhere;
    }
    .lane {
      position: absolute;
      inset-block: 0;
      display: flex;
      max-inline-size: max(0px, calc(100% - 2.75rem));
      overflow: hidden auto;
    }
    .start { inset-inline-start: 0; inline-size: var(--_start); }
    .end { inset-inline-end: 0; inline-size: var(--_end); }
    .lane button {
      flex: 1 1 0;
      min-inline-size: 0;
      background: var(--metro-swipe-action-background, var(--_metro-accent));
      color: var(--_metro-on-accent);
    }
    .lane button[data-destructive] { background: var(--metro-swipe-danger-background, #b40026); }
    .viewport[data-ready] .lane button { box-shadow: inset 0 0 0 2px currentColor; }
    button {
      box-sizing: border-box;
      min-block-size: 2.75rem;
      border: 0;
      border-radius: 0;
      font: inherit;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .trigger {
      min-inline-size: 0;
      max-inline-size: 50%;
      padding-inline: .75rem;
      background: transparent;
      color: inherit;
    }
    button:disabled { opacity: .5; cursor: default; }
    button:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .viewport:focus-visible::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      border: 2px solid currentColor;
      pointer-events: none;
    }
    @media (forced-colors: active) {
      button:focus-visible { outline-color: Highlight; }
      .viewport:focus-visible::after { border-color: Highlight; }
    }
  `];

  declare value: string;
  declare actions: readonly MetroSwipeAction[];
  declare mode: MetroSwipeMode;
  declare openSide: MetroSwipeSide | '';
  declare actionsLabel: string;
  declare busy: boolean;
  declare disabled: boolean;
  #gesture?: Gesture;
  #suppressTap = false;
  #menuOpen = false;
  #menuValue = '';
  #restoreControlsFocus = false;
  #outside?: AbortController;
  #visibility = new IntersectionObserver(entries => {
    if (entries.some(entry => !entry.isIntersecting)) this.closeActions(false);
  });

  constructor() {
    super();
    this.value = '';
    this.actions = [];
    this.mode = 'reveal';
    this.openSide = '';
    this.actionsLabel = 'Actions';
    this.busy = false;
    this.disabled = false;
  }

  showActions(side: MetroSwipeSide): boolean {
    if (this.disabled || this.busy || !this.#entries(side).some(action => !action.disabled)) return false;
    this.openSide = side;
    return true;
  }

  closeActions(restoreFocus = true): void {
    if (restoreFocus && this.shadowRoot?.activeElement?.closest('.lane')) this.#trigger?.focus({ preventScroll: true });
    this.openSide = '';
  }

  override disconnectedCallback(): void {
    this.#resetGesture();
    this.#outside?.abort();
    this.#visibility.disconnect();
    const menu = this.#menu;
    if (menu) menu.open = false;
    this.#menuOpen = false;
    this.openSide = '';
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    this.#restoreControlsFocus = (changed.has('actions') || changed.has('busy') || changed.has('disabled') || changed.has('value'))
      && this.shadowRoot?.activeElement?.matches('.lane button, .trigger') === true;
    if (this.#gesture && (changed.has('actions') || changed.has('mode') || changed.has('openSide'))) {
      this.#resetGesture();
    }
    if (changed.has('value') && changed.get('value') !== undefined) {
      this.#resetGesture();
      this.closeActions(false);
    }
    if (this.disabled || this.busy || (this.openSide && !this.#entries(this.openSide).some(action => !action.disabled))) {
      this.#resetGesture();
      this.closeActions(false);
    }
  }

  protected override firstUpdated(): void {
    this.#viewport?.addEventListener('click', this.#guardClick, true);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.#menuOpen && (changed.has('value') || this.busy || this.disabled
      || !this.#entries().some(action => !action.disabled))) {
      this.#menu?.close();
      this.#onMenuClose();
    }
    if (this.#restoreControlsFocus) this.#settleControlsFocus();
    this.#outside?.abort();
    this.#outside = undefined;
    this.#visibility.disconnect();
    if (!this.openSide || !this.isConnected) return;
    this.#outside = new AbortController();
    this.ownerDocument.addEventListener('pointerdown', event => {
      if (!event.composedPath().includes(this)) this.closeActions(false);
    }, { capture: true, signal: this.#outside.signal });
    this.#visibility.observe(this);
  }

  get #viewport() { return this.shadowRoot?.querySelector<HTMLElement>('.viewport'); }
  get #menu() { return this.shadowRoot?.querySelector<MetroMenuFlyout>('metro-menu-flyout'); }
  get #trigger() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger'); }

  #settleControlsFocus(): void {
    const root = this.shadowRoot;
    const active = root?.activeElement;
    const revealed = '.lane:not([inert]) button:enabled';
    if (active?.matches(`${revealed}, .trigger:enabled`)) return;
    const owner = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (owner && owner !== this && owner !== this.ownerDocument.body) return;
    if (!tryFocus(root?.querySelector<HTMLButtonElement>(revealed))
      && !tryFocus(root?.querySelector<HTMLButtonElement>('.trigger:enabled'))) {
      tryFocus(this.#viewport);
    }
  }

  #entries(side?: MetroSwipeSide): MetroSwipeAction[] {
    const ids = new Set<string>();
    return (this.actions ?? []).filter(action => {
      if (!action.id || ids.has(action.id)) return false;
      ids.add(action.id);
      return !side || (action.side ?? 'end') === side;
    });
  }

  #laneWidth(side: MetroSwipeSide): number {
    return this.shadowRoot?.querySelector<HTMLElement>(`.lane.${side}`)?.getBoundingClientRect().width ?? 0;
  }

  #guardClick = (event: MouseEvent): void => {
    if (!this.#suppressTap || event.detail === 0) return;
    this.#suppressTap = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onPointerDown(event: PointerEvent): void {
    this.#suppressTap = false;
    const viewport = this.#viewport;
    if (!viewport || this.#gesture || this.disabled || this.busy || this.#menuOpen || !this.#entries().length
      || !event.isPrimary || event.pointerType !== 'touch') return;
    const path = event.composedPath();
    const owner = path.find(node => node instanceof HTMLElement && node.localName === 'metro-swipe-control');
    const origin = path.slice(0, path.indexOf(viewport));
    if (owner !== this || origin.some(node => node instanceof Element && node.matches(
      '.lane, .trigger, [data-metro-no-swipe], input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]',
    ))) return;
    this.#gesture = {
      pointer: event.pointerId, value: this.value, actions: this.actions, mode: this.mode, open: this.openSide,
      width: viewport.clientWidth, x: event.clientX, y: event.clientY, rtl: getComputedStyle(this).direction === 'rtl', dragging: false,
    };
  }

  #isCurrent(gesture: Gesture, viewport: HTMLElement): boolean {
    return gesture.width === viewport.clientWidth && gesture.value === this.value
      && gesture.open === this.openSide && gesture.actions === this.actions && gesture.mode === this.mode
      && gesture.rtl === (getComputedStyle(this).direction === 'rtl') && !this.disabled && !this.busy;
  }

  #distance(event: PointerEvent, gesture: Gesture): number {
    const shift = (event.clientX - gesture.x) * (gesture.rtl ? -1 : 1);
    if (!gesture.open) return shift;
    return shift + this.#laneWidth(gesture.open) * (gesture.open === 'start' ? 1 : -1);
  }

  #executeThreshold(width: number) { return Math.max(64, Math.min(width * .43, 140)); }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.#gesture;
    const viewport = this.#viewport;
    if (!viewport || gesture?.pointer !== event.pointerId) return;
    if (!this.#isCurrent(gesture, viewport)) {
      this.#resetGesture();
      return;
    }
    if (!gesture.dragging) {
      const x = Math.abs(event.clientX - gesture.x);
      const y = Math.abs(event.clientY - gesture.y);
      if (y > 8 && y >= x) { this.#resetGesture(); return; }
      if (x <= 8 || x <= y * 1.25) return;
      gesture.dragging = true;
      this.#suppressTap = true;
      if (event.isTrusted) viewport.setPointerCapture(event.pointerId);
      viewport.toggleAttribute('data-dragging', true);
    }
    const distance = this.#distance(event, gesture);
    const side = distance >= 0 ? 'start' : 'end';
    const lane = this.#entries(side).some(action => !action.disabled) ? this.#laneWidth(side) : 0;
    const max = this.mode === 'execute' && lane ? gesture.width * .8 : lane;
    const shift = Math.min(Math.abs(distance), max) * Math.sign(distance) * (gesture.rtl ? -1 : 1);
    viewport.style.setProperty('--_drag', `${shift}px`);
    viewport.toggleAttribute('data-ready', this.mode === 'execute' && lane > 0 && Math.abs(distance) >= this.#executeThreshold(gesture.width));
  }

  #onPointerUp(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (gesture?.pointer !== event.pointerId) return;
    const viewport = this.#viewport;
    const valid = gesture.dragging && viewport && this.#isCurrent(gesture, viewport);
    this.#resetGesture();
    if (!valid) return;
    const distance = this.#distance(event, gesture);
    const side = distance >= 0 ? 'start' : 'end';
    if (this.mode === 'execute') {
      if (Math.abs(distance) >= this.#executeThreshold(gesture.width)) this.#invoke(this.#entries(side).find(action => !action.disabled)?.id, gesture.value);
      this.closeActions();
    } else if (Math.abs(distance) < Math.min(52, this.#laneWidth(side) / 2) || !this.showActions(side)) this.closeActions();
  }

  #onPointerCancel(event: PointerEvent): void {
    if (this.#gesture?.pointer === event.pointerId) this.#resetGesture();
  }

  #onLostCapture(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.#onPointerCancel(event);
  }

  #resetGesture(): void {
    const gesture = this.#gesture;
    this.#gesture = undefined;
    const viewport = this.#viewport;
    viewport?.style.removeProperty('--_drag');
    viewport?.removeAttribute('data-dragging');
    viewport?.removeAttribute('data-ready');
    if (gesture && viewport?.hasPointerCapture(gesture.pointer)) viewport.releasePointerCapture(gesture.pointer);
  }

  #invoke(id: string | undefined, value = this.value): void {
    if (this.disabled || this.busy || value !== this.value) return;
    const action = this.#entries().find(entry => entry.id === id && !entry.disabled);
    if (!action) return;
    this.closeActions();
    this.dispatchEvent(new CustomEvent('metro-swipe-action', {
      detail: { value, id: action.id, side: action.side ?? 'end' }, bubbles: true, composed: true,
    }) satisfies MetroSwipeActionEvent);
  }

  #showMenu(event: MouseEvent): void {
    const menu = this.#menu;
    if (!menu || this.disabled || this.busy || !this.#entries().some(action => !action.disabled)) return;
    this.closeActions(false);
    this.#menuValue = this.value;
    menu.returnFocus = this.#viewport ?? null;
    menu.show(event.currentTarget as HTMLElement);
    this.#menuOpen = true;
    this.requestUpdate();
  }

  #onMenuClose(): void {
    if (!this.#menuOpen) return;
    this.#menuOpen = false;
    this.requestUpdate();
  }

  #onMenu(event: MetroCommandEvent): void {
    event.stopPropagation();
    this.#invoke(event.detail.id, this.#menuValue);
  }

  #onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.openSide && !event.defaultPrevented) {
      event.preventDefault();
      event.stopPropagation();
      this.closeActions();
    }
  }

  #renderLane(side: MetroSwipeSide) {
    return html`<div class="lane ${side}" part=${side} ?inert=${this.openSide !== side}>
      ${repeat(this.#entries(side), action => action.id, action => html`
        <button type="button" part="action" ?disabled=${action.disabled || this.disabled || this.busy}
          ?data-destructive=${action.destructive} @click=${() => this.#invoke(action.id)}>${action.label}</button>
      `)}
    </div>`;
  }

  protected override render() {
    const all = this.#entries();
    const label = this.actionsLabel || 'Actions';
    const width = (side: MetroSwipeSide) => `calc(${this.#entries(side).length} * var(--metro-swipe-action-width, 5.25rem))`;
    return html`
      <div class="viewport" part="viewport" tabindex="-1" data-metro-no-swipe data-open=${this.openSide || nothing}
        aria-busy=${this.busy ? 'true' : nothing} style="--_start: ${width('start')}; --_end: ${width('end')}"
        @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onLostCapture} @keydown=${this.#onKey}>
        ${this.#renderLane('start')}${this.#renderLane('end')}
        <div class="content" part="content">
          <div class="body"><slot></slot></div>
          ${all.length ? html`<button type="button" class="trigger" part="trigger" aria-haspopup="menu" aria-expanded=${this.#menuOpen}
            ?disabled=${this.disabled || this.busy || !all.some(action => !action.disabled)} @click=${this.#showMenu}>${label}</button>` : nothing}
        </div>
      </div>
      <metro-menu-flyout .commands=${all} .label=${label} @metro-command=${this.#onMenu}
        @metro-close=${this.#onMenuClose}></metro-menu-flyout>`;
  }
}

defineElement('metro-swipe-control', MetroSwipeControl);

declare global {
  interface HTMLElementTagNameMap { 'metro-swipe-control': MetroSwipeControl; }
  interface HTMLElementEventMap { 'metro-swipe-action': MetroSwipeActionEvent; }
}
