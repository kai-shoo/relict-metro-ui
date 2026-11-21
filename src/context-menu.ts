import { css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import type { MetroFlyoutPoint } from './flyout.js';
import { MetroMenuFlyout } from './menu-flyout.js';

const HOLD_DELAY = 500;
const HOLD_SLOP = 10;
const RELEASE_GUARD = 500;
const LANDSCAPE_WIDTH = 480;
const LANDSCAPE_BAR_WIDTH = 72;

function closestPage(element: Element | null): Element | null {
  for (let node = element; node;) {
    if (node.localName === 'metro-page') return node;
    const root = node.getRootNode();
    node = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return null;
}

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
    systemTrayVisible: { type: Boolean, attribute: 'system-tray-visible', reflect: true },
    applicationBarVisible: { type: Boolean, attribute: 'application-bar-visible', reflect: true },
  };

  static override styles = [...MetroMenuFlyout.styles, css`
    .menu-frame {
      position: fixed;
      box-sizing: border-box;
      padding-block: 4px;
      --_menu-background: var(--metro-menu-bg, light-dark(#000, #fff));
      --_menu-border: var(--metro-context-menu-border, var(--_metro-bg));
      --_stripe-direction: to bottom;
      --_first-axis: scaleX(0);
      --_second-axis: scaleY(0);
      transform-origin: var(--_opening-x, 50%) 0;
    }

    .menu-frame::before,
    .menu-frame::after {
      content: '';
      position: absolute;
      inset-inline: 0;
      height: 4px;
      pointer-events: none;
      forced-color-adjust: none;
    }

    .menu-frame::before {
      top: 0;
      background: linear-gradient(var(--_stripe-direction), var(--_menu-border) 50%, var(--_menu-background) 50%);
    }

    .menu-frame::after {
      bottom: 0;
      background: linear-gradient(var(--_stripe-direction), var(--_menu-background) 50%, var(--_menu-border) 50%);
    }

    .surface {
      position: relative;
      inline-size: 100%;
      min-inline-size: 0;
      max-inline-size: 100%;
      max-block-size: var(--_menu-max-height);
      padding-block: min(1.125rem, 4dvh) min(1.75rem, 6dvh);
      transform-origin: 0 0;
    }

    .reversed .surface { transform-origin: 0 100%; }

    .landscape {
      padding: 0 4px;
      --_stripe-direction: to right;
      --_first-axis: scaleY(0);
      --_second-axis: scaleX(0);
      transform-origin: 0 50%;
    }

    .landscape::before,
    .landscape::after {
      inset: 0 auto 0 0;
      width: 4px;
      height: auto;
    }

    .landscape::after { inset: 0 0 0 auto; }

    .landscape .surface {
      block-size: 100%;
      align-content: safe center;
    }

    .landscape.reversed .surface { transform-origin: 100% 0; }

    @media (prefers-reduced-motion: no-preference) {
      :popover-open .menu-frame { animation: context-first-axis 300ms linear both; }
      :popover-open .surface { animation: context-second-axis 120ms linear 300ms both; }
      :popover-open .menu-frame:not(.reversed)::after,
      :popover-open .menu-frame.reversed::before { animation: context-trailing-stripe 410ms step-end both; }
    }

    @keyframes context-first-axis { from { transform: var(--_first-axis); } to { transform: none; } }
    @keyframes context-second-axis { from { transform: var(--_second-axis); } to { transform: none; } }
    @keyframes context-trailing-stripe { from { opacity: 0; } to { opacity: 1; } }

    @media (forced-colors: active) {
      .menu-frame { --_menu-background: Canvas; --_menu-border: CanvasText; }
      .surface { border: 0; }
    }

    .item {
      padding-block: .625rem;
      padding-inline: min(1.5625rem, 5.25vi) 0;
    }
  `];

  declare htmlFor: string;
  declare target: HTMLElement | null;
  declare systemTrayVisible: boolean;
  declare applicationBarVisible: boolean;

  #inputs: AbortController | null = null;
  #source: EventTarget | null = null;
  #touch: TouchHold | null = null;
  #openTarget: HTMLElement | null = null;
  #targetWatch: MutationObserver | null = null;

  constructor() {
    super();
    this.htmlFor = '';
    this.target = null;
    this.systemTrayVisible = false;
    this.applicationBarVisible = false;
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
    if (this.open && (changed.has('systemTrayVisible') || changed.has('applicationBarVisible'))) this.reposition();
  }

  protected override updated(): void {
    super.updated();
    if (this.open && this.#openTarget) this.#watchTarget(this.#openTarget);
    else this.#stopWatchingTarget();
  }

  protected override renderSurface() {
    return html`<div class="menu-frame">${super.renderSurface()}</div>`;
  }

  protected override positionBoundary(anchor: HTMLElement | null): Element | null {
    return closestPage(anchor) ?? closestPage(this);
  }

  protected override positionSurface(
    surface: HTMLElement, viewport: DOMRectReadOnly, anchor: HTMLElement | null, point: MetroFlyoutPoint | null,
  ): void {
    const frame = surface.parentElement!;
    const landscape = this.ownerDocument.defaultView?.matchMedia('(orientation: landscape)').matches ?? false;
    const page = this.positionBoundary(anchor)?.getBoundingClientRect();
    const pageLeft = Math.max(viewport.left, page?.left ?? viewport.left);
    const pageRight = Math.min(viewport.right, page?.right ?? viewport.right);
    const left = pageRight > pageLeft ? pageLeft : viewport.left;
    const right = pageRight > pageLeft ? pageRight : viewport.right;
    const owner = anchor?.getBoundingClientRect();
    const x = point?.x ?? (owner ? (owner.left + owner.right) / 2 : (left + right) / 2);
    frame.classList.toggle('landscape', landscape);
    surface.style.setProperty('--_menu-max-height', `${Math.max(0, viewport.height - (landscape ? 0 : 8))}px`);

    if (landscape) {
      // The menu opens away from the invocation point, into the opposite half.
      const reversed = x > (left + right) / 2;
      const tray = this.systemTrayVisible ? LANDSCAPE_BAR_WIDTH : 0;
      const bar = this.applicationBarVisible ? LANDSCAPE_BAR_WIDTH : 0;
      const width = Math.max(0, Math.min(LANDSCAPE_WIDTH - (reversed ? tray : bar), right - left - tray - bar));
      frame.style.width = `${width}px`;
      frame.style.height = `${viewport.height}px`;
      frame.style.left = `${reversed ? left + tray : right - bar - width}px`;
      frame.style.top = `${viewport.top}px`;
      frame.classList.toggle('reversed', reversed);
      return;
    }

    frame.style.width = `${right - left}px`;
    frame.style.height = '';
    frame.style.left = `${left}px`;
    frame.style.setProperty('--_opening-x', `${Math.max(0, Math.min(x - left, right - left))}px`);
    // Read layout height, not the bounding box, which changes during the opening animation.
    const height = frame.offsetHeight;
    const lowestTop = Math.max(viewport.top, viewport.bottom - height);
    let top = lowestTop;
    let reversed = lowestTop > viewport.top;
    if (owner && owner.bottom >= viewport.top && owner.bottom <= lowestTop) {
      top = owner.bottom;
      reversed = false;
    } else if (owner && owner.top >= viewport.top + height && owner.top <= viewport.bottom) {
      top = owner.top - height;
      reversed = true;
    } else if (point && point.y >= viewport.top && point.y <= lowestTop) {
      top = point.y;
      reversed = false;
    } else if (point && point.y >= viewport.top + height && point.y <= viewport.bottom) {
      top = point.y - height;
      reversed = true;
    }
    frame.style.top = `${top}px`;
    frame.classList.toggle('reversed', reversed);
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
    this.ownerDocument.addEventListener('mousedown', this.#onTouchMouseDown, options);
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

  #onTouchMouseDown = (event: MouseEvent) => {
    const touch = this.#touch;
    // The compatibility mouse event can move focus before the click guard runs.
    if (event.isTrusted && touch?.opened && event.button === 0
      && Math.hypot(event.clientX - touch.point.x, event.clientY - touch.point.y) <= HOLD_SLOP) {
      event.preventDefault();
    }
  };
}

defineElement('metro-context-menu', MetroContextMenu);

declare global {
  interface HTMLElementTagNameMap { 'metro-context-menu': MetroContextMenu; }
}
