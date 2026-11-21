import { html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import type { MetroFrame, MetroFrameVisit, MetroNavigateEvent, MetroNavigationDirection } from './frame.js';
import { MotionHost, MotionSequence, motionDuration, motionPreference, type MotionAnimation } from './motion-effect.js';
import { featherAnimations, turnstileAnimation, type MetroMotionPhase } from './turnstile-feather-effect.js';

export type MetroNavigationEffect = 'turnstile' | 'turnstile-feather' | 'slide' | 'fade' | 'connected' | 'none';

interface ConnectedSource {
  key: string;
  rect: DOMRect;
}

function composedParent(element: Element): Element | null {
  const root = element.getRootNode();
  return element.assignedSlot ?? element.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
}

// A virtualized row can still have a layout box outside its scrollport.
function visibleEndpoint(page: Element, key: string) {
  const viewport = page.ownerDocument.documentElement;
  for (const element of page.querySelectorAll<HTMLElement>('[data-metro-connected]')) {
    if (element.dataset.metroConnected !== key || element.closest('metro-page') !== page) continue;
    const rect = element.getBoundingClientRect();
    let left = Math.max(0, rect.left);
    let top = Math.max(0, rect.top);
    let right = Math.min(viewport.clientWidth, rect.right);
    let bottom = Math.min(viewport.clientHeight, rect.bottom);
    for (let node: Element | null = element; node; node = composedParent(node)) {
      const style = getComputedStyle(node);
      if (style.visibility !== 'visible' || Number(style.opacity) === 0) {
        right = left;
        break;
      }
      // Scaling or rotating the coordinate system would distort viewport deltas.
      const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform);
      const transformed = matrix && !matrix.isIdentity && (node === element || !matrix.is2D ||
        matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1);
      if (transformed || style.scale !== 'none' || style.rotate !== 'none' || (node === element && style.translate !== 'none')) {
        right = left;
        break;
      }
      if (node === element || (style.overflowX === 'visible' && style.overflowY === 'visible')) continue;
      const bounds = node.getBoundingClientRect();
      if (style.overflowX !== 'visible') {
        left = Math.max(left, bounds.left);
        right = Math.min(right, bounds.right);
      }
      if (style.overflowY !== 'visible') {
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
      }
    }
    if (right > left && bottom > top) return { element, rect };
  }
  return undefined;
}

export class MetroNavigationTransition extends MotionHost {
  static override properties = {
    transition: { type: String },
    duration: { type: Number },
    connectedKey: { type: String, attribute: 'connected-key' },
    disabled: { type: Boolean, reflect: true },
  };

  declare transition: MetroNavigationEffect;
  declare connectedKey: string;
  declare duration: number | undefined;
  declare disabled: boolean;
  #sequence = new MotionSequence();
  #generation = 0;
  #playing?: { key: string; watch: MutationObserver };
  #sources = new WeakMap<MetroFrameVisit, ConnectedSource>();

  constructor() {
    super();
    this.transition = 'turnstile';
    this.duration = undefined;
    this.connectedKey = '';
    this.disabled = false;
  }

  override disconnectedCallback(): void {
    this.cancel();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    const effectChanged = changed.has('transition') && changed.get('transition') !== undefined;
    const keyChanged = this.#playing && this.#playing.key !== this.connectedKey;
    if ((changed.has('disabled') && this.disabled) || effectChanged || keyChanged) this.cancel();
  }

  override cancel(): void {
    this.#generation++;
    this.#playing?.watch.disconnect();
    this.#playing = undefined;
    this.#sequence.cancel();
  }

  play(target: Element, direction: MetroNavigationDirection = 'forward', phase: MetroMotionPhase = 'enter'): Promise<boolean> {
    this.cancel();
    if (this.disabled || this.hidden || this.transition === 'none') return Promise.resolve(false);
    const movement = direction === 'back' ? 'back' : 'forward';
    let entries: MotionAnimation[];
    if (this.transition === 'turnstile-feather' && direction !== 'replace') {
      const parts = Array.from(target.querySelectorAll('[data-metro-feather]'));
      entries = featherAnimations(parts.length ? parts : [target], movement, phase, this.duration);
    } else if (this.transition === 'turnstile' && direction !== 'replace') {
      entries = [turnstileAnimation(target, movement, phase, this.duration)];
    } else if (this.transition === 'slide' && direction !== 'replace') {
      const rtl = getComputedStyle(target).direction === 'rtl';
      const offset = (movement === 'back' ? -1 : 1) * (rtl ? -1 : 1) * (phase === 'exit' ? -1 : 1) * 40;
      const outside = { transform: `translateX(${offset}px)` };
      const neutral = { transform: 'translateX(0)' };
      entries = [{ target, frames: phase === 'enter' ? [outside, neutral] : [neutral, outside],
        timing: { duration: motionDuration(this.duration, phase === 'enter' ? 350 : 250),
          easing: phase === 'enter' ? 'ease-out' : 'ease-in', composite: 'add' } }];
    } else {
      const opacity = Number(getComputedStyle(target).opacity);
      const faint = { opacity: opacity * .5 };
      const normal = { opacity };
      entries = [{ target, frames: phase === 'enter' ? [faint, normal] : [normal, faint],
        timing: { duration: motionDuration(this.duration, 180), easing: 'ease' } }];
    }
    return this.#sequence.play(this, entries);
  }

  #owningFrame(event: MetroNavigateEvent): MetroFrame | undefined {
    const path = event.composedPath();
    const owner = path.find(node => (node as Element).localName === 'metro-navigation-transition');
    if (owner === this && event.detail?.to) return path.find(node => (node as Element).localName === 'metro-frame') as MetroFrame | undefined;
    return undefined;
  }

  #beforeNavigate = (event: MetroNavigateEvent) => {
    if (event.defaultPrevented || this.disabled || this.hidden || this.transition !== 'connected' ||
        !this.connectedKey || !event.detail?.to || event.detail.direction === 'replace' || motionPreference(this)?.matches) return;
    const page = this.#owningFrame(event)?.page;
    const source = page && visibleEndpoint(page, this.connectedKey);
    if (!source) return;
    const visit = event.detail.to;
    this.#sources.set(visit, { key: this.connectedKey, rect: source.rect });
    // Frame commits synchronously. A later listener can still veto this request.
    queueMicrotask(() => this.#sources.delete(visit));
  };

  #onNavigate = (event: MetroNavigateEvent) => {
    const frame = this.#owningFrame(event);
    if (!frame) return;
    const source = this.#sources.get(event.detail.to);
    this.cancel();
    const generation = this.#generation;

    void (async () => {
      await frame.updateComplete;
      const page = frame.page;
      if (!page || page.value !== event.detail.to.value) return;
      await page.updateComplete;
      if (!this.isConnected || this.#generation !== generation || frame.page !== page) return;
      if (source && !this.disabled && !this.hidden && this.transition === 'connected' && source.key === this.connectedKey) {
        const target = visibleEndpoint(page, source.key);
        if (target) {
          const { rect } = target;
          const dx = source.rect.left - rect.left;
          const dy = source.rect.top - rect.top;
          const watch = new MutationObserver(() => {
            if (target.element.dataset.metroConnected !== source.key) this.cancel();
          });
          this.#playing = { key: source.key, watch };
          watch.observe(target.element, { attributes: true, attributeFilter: ['data-metro-connected'] });
          await this.#sequence.play(this, [{
            target: target.element,
            frames: [
              { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${source.rect.width / rect.width}, ${source.rect.height / rect.height})` },
              { transformOrigin: '0 0', transform: 'none' },
            ],
            timing: { duration: motionDuration(this.duration, 300), easing: 'ease-out' },
          }]);
          watch.disconnect();
          if (this.#playing?.watch === watch) this.#playing = undefined;
          return;
        }
      }
      await this.play(page, event.detail.direction);
    })();
  };

  protected override render() { return html`<slot @metro-before-navigate=${this.#beforeNavigate} @metro-navigate=${this.#onNavigate}></slot>`; }
}

defineElement('metro-navigation-transition', MetroNavigationTransition);

declare global {
  interface HTMLElementTagNameMap { 'metro-navigation-transition': MetroNavigationTransition; }
}
