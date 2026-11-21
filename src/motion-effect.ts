import { LitElement, css, html, type PropertyValues } from 'lit';

export interface MotionAnimation {
  readonly target: Element;
  readonly frames: Keyframe[];
  readonly timing: KeyframeAnimationOptions;
}

export function motionDuration(value: number | undefined | null, fallback: number): number {
  return value != null && Number.isFinite(value) ? Math.max(0, Math.min(10000, value)) : fallback;
}

export function motionPreference(target: Element): MediaQueryList | undefined {
  return target.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
}

export class MotionSequence {
  #current?: { animations: Animation[]; events: AbortController };

  cancel(): void {
    const current = this.#current;
    this.#current = undefined;
    current?.events.abort();
    current?.animations.forEach(animation => animation.cancel());
  }

  async play(owner: Element, entries: readonly MotionAnimation[]): Promise<boolean> {
    this.cancel();
    const preference = motionPreference(owner);
    if (!owner.isConnected || preference?.matches) return false;
    const current = { animations: [] as Animation[], events: new AbortController() };
    this.#current = current;
    preference?.addEventListener('change', () => { if (preference.matches) this.cancel(); }, { signal: current.events.signal });
    try {
      for (const { target, frames, timing } of entries) {
        if (target.isConnected && typeof target.animate === 'function' && target.getClientRects().length && Number(timing.duration) > 0) {
          const animation = target.animate(frames, timing);
          current.animations.push(animation);
          void animation.finished.catch(() => {});
        }
      }
      if (!current.animations.length) return false;
      await Promise.all(current.animations.map(animation => animation.finished));
      return this.#current === current;
    } catch {
      return false;
    } finally {
      if (this.#current === current) this.cancel();
    }
  }
}

export abstract class MotionHost extends LitElement {
  static override styles = css`:host { display: contents; } :host([hidden]) { display: none; }`;

  static override get observedAttributes() { return [...super.observedAttributes, 'hidden']; }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (name === 'hidden' && next !== null) this.cancel();
  }

  abstract cancel(): void;
}

export abstract class MotionEffect extends MotionHost {
  static override properties = {
    duration: { type: Number },
    disabled: { type: Boolean, reflect: true },
    autoplay: { type: Boolean },
    eventName: { type: String, attribute: 'event' },
  };

  declare duration: number | undefined;
  declare disabled: boolean;
  declare autoplay: boolean;
  declare eventName: string;
  #event = '';
  #sequence = new MotionSequence();

  constructor() {
    super();
    this.duration = undefined;
    this.disabled = false;
    this.autoplay = false;
    this.eventName = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observeEvent();
  }

  override disconnectedCallback(): void {
    this.#observeEvent();
    this.cancel();
    super.disconnectedCallback();
  }

  override cancel(): void { this.#sequence.cancel(); }
  abstract play(): Promise<boolean>;

  protected run(entries: readonly MotionAnimation[]): Promise<boolean> {
    if (this.disabled || this.hidden) {
      this.cancel();
      return Promise.resolve(false);
    }
    return this.#sequence.play(this, entries);
  }

  #onTrigger = (event: Event) => {
    const nearest = event.composedPath().find(node => (node as Element).localName === this.localName);
    if (!event.defaultPrevented && nearest === this) void this.play();
  };

  #observeEvent(): void {
    const next = this.isConnected ? this.eventName : '';
    if (next === this.#event) return;
    if (this.#event) this.removeEventListener(this.#event, this.#onTrigger);
    this.#event = next;
    if (next) this.addEventListener(next, this.#onTrigger);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('eventName')) this.#observeEvent();
    if (changed.has('disabled') && this.disabled) this.cancel();
    if (changed.has('autoplay') && this.autoplay) void this.play();
  }

  protected override render() { return html`<slot></slot>`; }
}
