import { css, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import type { MetroFlyoutPoint } from './flyout.js';
import { MetroMenuFlyout } from './menu-flyout.js';

const HOLD_DELAY = 500;
const HOLD_SLOP = 10;
const RELEASE_GUARD = 500;

interface TouchHold {
  readonly id: number;
  readonly point: MetroFlyoutPoint;
  readonly events: AbortController;
  opened: boolean;
  timer: number | undefined;
}

export class MetroContextMenu extends MetroMenuFlyout {
  static override properties = {
    ...MetroMenuFlyout.properties,
    htmlFor: { type: String, attribute: 'for', reflect: true },
    target: { attribute: false },
  };

  static override styles = [...MetroMenuFlyout.styles, css`
    .surface {
      padding-block: min(1.125rem, 4dvh) min(1.75rem, 6dvh);
      border: 2px solid var(--metro-context-menu-border, var(--_metro-bg));
    }

    .item {
      padding-block: .625rem;
      padding-inline: min(1.5625rem, 5.25vi) 0;
    }
  `];

  declare htmlFor: string;
  declare target: HTMLElement | null;

  #inputs: AbortController | null = null;
  #source: EventTarget | null = null;
  #touch: TouchHold | null = null;
  #openTarget: HTMLElement | null = null;
  #targetWatch: MutationObserver | null = null;

  constructor() {
    super();
    this.htmlFor = '';
    this.target = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#listen();
  }

  override disconnectedCallback(): void {
    this.#inputs?.abort();
    this.#inputs = null;
    this.#source = null;
    this.#stopTouch();
    this.#stopWatchingTarget();
    super.disconnectedCallback();
  }

  override show(anchor?: HTMLElement): void {
    this.#rememberTarget();
    super.show(anchor ?? this.#openTarget ?? undefined);
  }

  override showAt(anchor: HTMLElement, point: MetroFlyoutPoint): void {
    this.#rememberTarget();
    super.showAt(anchor, point);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('target') || changed.has('htmlFor')) this.#listen();
  }

  protected override updated(): void {
    super.updated();
    if (this.open && this.#openTarget) this.#watchTarget(this.#openTarget);
    else this.#stopWatchingTarget();
  }

  #resolveTarget(): HTMLElement | null {
    const root = this.getRootNode();
    const element = this.target ?? (this.htmlFor && (root instanceof Document || root instanceof ShadowRoot)
      ? root.getElementById(this.htmlFor) : null);
    return element instanceof HTMLElement && element.isConnected && element.ownerDocument === this.ownerDocument
      ? element : null;
  }

  #listen(): void {
    const source = this.isConnected ? (this.target ?? (this.htmlFor ? this.getRootNode() : null)) : null;
    if (source === this.#source) return;
    this.#inputs?.abort();
    this.#inputs = null;
    this.#source = source;
    if (!source) return;

    this.#inputs = new AbortController();
    const options = { signal: this.#inputs.signal };
    source.addEventListener('contextmenu', this.#onContextMenu, options);
    source.addEventListener('keydown', this.#onKeyDown, options);
    source.addEventListener('pointerdown', this.#onPointerDown, options);
  }

  #watchTarget(target: HTMLElement): void {
    if (this.#resolveTarget() !== target) {
      this.close();
      return;
    }
    if (this.#targetWatch) return;

    this.#targetWatch = new MutationObserver(() => {
      if (this.open && this.#resolveTarget() !== target) this.close();
    });
    const root = target.getRootNode();
    this.#targetWatch.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
    if (root !== this.ownerDocument) this.#targetWatch.observe(this.ownerDocument, { childList: true, subtree: true });
  }

  #rememberTarget(): void {
    const target = this.#resolveTarget();
    if (target !== this.#openTarget) this.#stopWatchingTarget();
    this.#openTarget = target;
  }

  #stopWatchingTarget(): void {
    this.#targetWatch?.disconnect();
    this.#targetWatch = null;
    this.#openTarget = null;
  }

  #eventTarget(event: Event): HTMLElement | null {
    if (!event.isTrusted || event.defaultPrevented || this.hidden || !this.commands.length) return null;
    const target = this.#resolveTarget();
    return target && event.composedPath().includes(target) ? target : null;
  }

  #pointerInvoker(event: Event, target: HTMLElement): HTMLElement {
    for (const node of event.composedPath()) {
      if (node === target) break;
      if (node instanceof HTMLElement && !node.matches(':disabled')
        && (node.tabIndex >= 0 || node.matches('[tabindex], [contenteditable]:not([contenteditable="false"])'))) return node;
    }
    return target;
  }

  #onContextMenu = (event: Event) => {
    if (!(event instanceof MouseEvent)) return;
    const target = this.#eventTarget(event);
    if (!target) return;

    const touchContext = (event instanceof PointerEvent && event.pointerType === 'touch')
      || (this.#touch !== null && event.button !== 2);
    const secondary = event.button === 2 || (event.button === 0 && event.ctrlKey);
    if (!touchContext && !secondary) return;
    event.preventDefault();
    if (!touchContext && !this.open) {
      this.showAt(this.#pointerInvoker(event, target), { x: event.clientX, y: event.clientY });
    }
  };

  #onKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
    const target = this.#eventTarget(event);
    if (!target) return;

    event.preventDefault();
    if (!event.repeat && !this.open) {
      const invoker = event.composedPath().find(node => node instanceof HTMLElement && node.matches(':focus'));
      this.show(invoker instanceof HTMLElement ? invoker : target);
    }
  };

  #onPointerDown = (event: Event) => {
    if (!(event instanceof PointerEvent) || event.pointerType !== 'touch' || !event.isPrimary || event.button !== 0) return;
    const target = this.#eventTarget(event);
    const view = this.ownerDocument.defaultView;
    if (!target || !view || this.open) return;

    this.#stopTouch();
    const invoker = this.#pointerInvoker(event, target);
    const touch: TouchHold = {
      id: event.pointerId, point: { x: event.clientX, y: event.clientY },
      events: new AbortController(), opened: false, timer: undefined,
    };
    this.#touch = touch;
    const options = { signal: touch.events.signal, capture: true };
    this.ownerDocument.addEventListener('pointerdown', this.#onAdditionalTouch, options);
    this.ownerDocument.addEventListener('pointermove', this.#onTouchMove, options);
    this.ownerDocument.addEventListener('pointerup', this.#onTouchEnd, options);
    this.ownerDocument.addEventListener('pointercancel', this.#onTouchEnd, options);
    this.ownerDocument.addEventListener('click', this.#onTouchClick, options);
    this.ownerDocument.addEventListener('scroll', this.#cancelPendingTouch, options);
    const root = target.getRootNode();
    if (root instanceof ShadowRoot) root.addEventListener('scroll', this.#cancelPendingTouch, options);
    view.addEventListener('blur', this.#stopTouch, options);

    touch.timer = view.setTimeout(() => {
      if (this.#resolveTarget() !== target || this.hidden || !this.commands.length || this.open) {
        this.#stopTouch();
        return;
      }
      touch.opened = true;
      this.showAt(invoker.isConnected ? invoker : target, touch.point);
    }, HOLD_DELAY);
  };

  #stopTouch = () => {
    const touch = this.#touch;
    if (!touch) return;
    this.#touch = null;
    this.ownerDocument.defaultView?.clearTimeout(touch.timer);
    touch.events.abort();
  };

  #cancelPendingTouch = () => {
    if (!this.#touch?.opened) this.#stopTouch();
  };

  #onAdditionalTouch = (event: PointerEvent) => {
    if (event.isTrusted && event.pointerType === 'touch') this.#stopTouch();
  };

  #onTouchMove = (event: PointerEvent) => {
    const touch = this.#touch;
    if (!event.isTrusted || !touch || touch.id !== event.pointerId || touch.opened) return;
    if (Math.hypot(event.clientX - touch.point.x, event.clientY - touch.point.y) > HOLD_SLOP) this.#stopTouch();
  };

  #onTouchEnd = (event: PointerEvent) => {
    const touch = this.#touch;
    if (!event.isTrusted || !touch || touch.id !== event.pointerId) return;
    if (!touch.opened) this.#stopTouch();
    else touch.timer = this.ownerDocument.defaultView?.setTimeout(this.#stopTouch, RELEASE_GUARD);
  };

  #onTouchClick = (event: MouseEvent) => {
    const touch = this.#touch;
    if (!event.isTrusted || !event.detail || !touch?.opened) return;
    const samePress = event instanceof PointerEvent && event.pointerType
      ? event.pointerType === 'touch' && event.pointerId === touch.id
      : Math.hypot(event.clientX - touch.point.x, event.clientY - touch.point.y) <= HOLD_SLOP;
    if (!samePress) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.#stopTouch();
  };
}

defineElement('metro-context-menu', MetroContextMenu);

declare global {
  interface HTMLElementTagNameMap { 'metro-context-menu': MetroContextMenu; }
}
