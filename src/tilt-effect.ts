import { html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { MotionHost, motionDuration, motionPreference } from './motion-effect.js';

const inactiveTarget = ':disabled, [aria-disabled="true"], [hidden]';

interface Press {
  target: Element;
  bounds: DOMRect;
  pointer?: number;
  key?: string;
  transform: string;
  animation: Animation;
  events: AbortController;
}

export class MetroTiltEffect extends MotionHost {
  static override properties = {
    disabled: { type: Boolean, reflect: true },
    duration: { type: Number },
  };

  declare disabled: boolean;
  declare duration: number;
  #press?: Press;
  #return?: Animation;
  #preference?: MediaQueryList;
  #events?: AbortController;

  constructor() {
    super();
    this.disabled = false;
    this.duration = 100;
  }

  get pressed(): boolean { return this.#press !== undefined; }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#events = new AbortController();
    this.#preference = motionPreference(this);
    this.#preference?.addEventListener('change', () => {
      if (this.#preference?.matches) this.cancel();
    }, { signal: this.#events.signal });
  }

  override disconnectedCallback(): void {
    this.#events?.abort();
    this.cancel();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('disabled') && this.disabled) this.cancel();
  }

  override cancel(): void {
    this.#press?.events.abort();
    this.#press?.animation.cancel();
    this.#return?.cancel();
    this.#press = undefined;
    this.#return = undefined;
  }

  #target(event: Event): Element | undefined {
    if (this.hidden || this.disabled || this.#preference?.matches || !event.isTrusted || event.defaultPrevented) return;
    const path = event.composedPath();
    const owner = path.find(item => (item as Element).localName === 'metro-tilt-effect');
    if (owner !== this || path.some(item => (item as Element).matches?.('[data-metro-no-tilt]'))) return;
    const target = path.find(item => (item as Element).matches?.(
      'button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [data-metro-tilt]',
    )) as Element | undefined;
    return target?.matches(inactiveTarget) ? undefined : target;
  }

  #projection(bounds: DOMRect, x: number, y: number): string {
    const horizontal = Math.max(0, Math.min(1, (x - bounds.left) / bounds.width)) - .5;
    const vertical = Math.max(0, Math.min(1, (y - bounds.top) / bounds.height)) - .5;
    const depth = (1 - Math.abs(horizontal) - Math.abs(vertical)) * 25;
    return `perspective(700px) translateZ(${-depth}px) rotateX(${.3 * vertical}rad) rotateY(${-0.3 * horizontal}rad)`;
  }

  #begin(target: Element, bounds: DOMRect, transform: string, input: { pointer?: number; key?: string }): void {
    this.cancel();
    const animation = target.animate([{ transform }, { transform }], { duration: 1, fill: 'both', composite: 'add' });
    animation.pause();
    animation.currentTime = 0;
    void animation.finished.catch(() => {});
    const events = new AbortController();
    this.#press = { target, bounds, transform, animation, events, ...input };
    const watchTarget = new MutationObserver(() => {
      if (!target.isConnected || target.matches(inactiveTarget)) this.cancel();
    });
    watchTarget.observe(target, { attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'hidden'] });
    watchTarget.observe(this, { childList: true, subtree: true });
    const root = target.getRootNode();
    if (root instanceof ShadowRoot) watchTarget.observe(root, { childList: true, subtree: true });
    events.signal.addEventListener('abort', () => watchTarget.disconnect(), { once: true });
    const options = { signal: events.signal, capture: true };
    const document = target.ownerDocument;
    if (input.pointer !== undefined) {
      document.addEventListener('pointermove', this.#pointerMove, options);
      document.addEventListener('pointerup', this.#pointerEnd, options);
      document.addEventListener('pointercancel', this.#pointerEnd, options);
      target.addEventListener('lostpointercapture', this.#pointerEnd as EventListener, options);
    } else {
      document.addEventListener('keyup', this.#keyEnd, options);
    }
    target.addEventListener('blur', () => this.cancel(), options);
    document.defaultView?.addEventListener('blur', () => this.cancel(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); }, options);
  }

  #release(): void {
    const press = this.#press;
    if (!press) return;
    this.cancel();
    const duration = motionDuration(this.duration, 100);
    if (!press.target.isConnected || press.target.matches(inactiveTarget) || !duration || this.#preference?.matches) return;
    const animation = press.target.animate([{ transform: press.transform }, { transform: 'none' }], {
      duration, delay: 200, easing: 'ease-out', fill: 'backwards', composite: 'add',
    });
    this.#return = animation;
    void animation.finished.then(() => {
      if (this.#return === animation) this.#return = undefined;
    }, () => {});
  }

  #pointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || this.#press) return;
    const target = this.#target(event);
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.#begin(target, bounds, this.#projection(bounds, event.clientX, event.clientY), { pointer: event.pointerId });
  };

  #pointerMove = (event: PointerEvent) => {
    const press = this.#press;
    if (press?.pointer !== event.pointerId) return;
    const bounds = press.bounds;
    const { clientX: x, clientY: y } = event;
    if (!press.target.isConnected || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      this.cancel();
      return;
    }
    press.transform = this.#projection(bounds, x, y);
    (press.animation.effect as KeyframeEffect).setKeyframes([{ transform: press.transform }, { transform: press.transform }]);
  };

  #pointerEnd = (event: PointerEvent) => {
    if (this.#press?.pointer !== event.pointerId) return;
    if (event.type === 'pointerup') this.#release();
    else this.cancel();
  };

  #keyDown = (event: KeyboardEvent) => {
    if (event.repeat || this.#press || (event.key !== 'Enter' && event.key !== ' ')) return;
    const target = this.#target(event);
    if (!target || (event.key === ' ' && target.matches('a[href]'))) return;
    const bounds = target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.#begin(target, bounds, this.#projection(bounds, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2), { key: event.key });
  };

  #keyEnd = (event: KeyboardEvent) => { if (this.#press?.key === event.key) this.#release(); };

  protected override render() { return html`<slot @pointerdown=${this.#pointerDown} @keydown=${this.#keyDown}></slot>`; }
}

defineElement('metro-tilt-effect', MetroTiltEffect);

declare global {
  interface HTMLElementTagNameMap { 'metro-tilt-effect': MetroTiltEffect; }
}
