import type { PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { MetroIcon } from './icon.js';
import { MotionSequence } from './motion-effect.js';

export class MetroAnimatedIcon extends MetroIcon {
  static override properties = {
    ...MetroIcon.properties,
    duration: { type: Number },
  };

  declare duration: number;
  #motion = new MotionSequence();

  static override get observedAttributes() { return [...super.observedAttributes, 'hidden']; }

  constructor() {
    super();
    this.duration = 180;
  }

  override disconnectedCallback(): void {
    this.#motion.cancel();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (name === 'hidden' && next !== null) this.#motion.cancel();
  }

  protected override updated(changes: PropertyValues<this>): void {
    if (!changes.has('name') || changes.get('name') === undefined) return;
    const target = this.shadowRoot?.querySelector('.glyph');
    if (!target || this.hidden || this.duration <= 0 || !Number.isFinite(this.duration)) {
      this.#motion.cancel();
      return;
    }
    void this.#motion.play(this, [{
      target,
      frames: [{ opacity: .45, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }],
      timing: { duration: this.duration, easing: 'ease-out' },
    }]);
  }
}

defineElement('metro-animated-icon', MetroAnimatedIcon);

declare global {
  interface HTMLElementTagNameMap { 'metro-animated-icon': MetroAnimatedIcon; }
}
