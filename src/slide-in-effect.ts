import { defineElement } from './define.js';
import { MotionEffect, motionDuration } from './motion-effect.js';

export type MetroSlideInOrigin = 'start' | 'end' | 'top' | 'bottom';

export class MetroSlideInEffect extends MotionEffect {
  static override properties = {
    ...MotionEffect.properties,
    from: { type: String },
    distance: { type: Number },
  };

  declare from: MetroSlideInOrigin;
  declare distance: number;

  constructor() {
    super();
    this.from = 'end';
    this.distance = 50;
  }

  override play(): Promise<boolean> {
    const horizontal = this.from !== 'top' && this.from !== 'bottom';
    const rtl = getComputedStyle(this).direction === 'rtl';
    const sign = horizontal ? (this.from === 'start' ? -1 : 1) * (rtl ? -1 : 1) : this.from === 'top' ? -1 : 1;
    const distance = (Number.isFinite(this.distance) ? Math.max(0, this.distance) : 50) * sign;
    const transform = (factor: number) => `translate${horizontal ? 'X' : 'Y'}(${distance * factor}px)`;
    const duration = motionDuration(this.duration, 1050);
    return this.run(Array.from(this.children, target => ({
      target,
      frames: [
        { transform: transform(1), offset: 0 },
        { transform: transform(1), offset: 350 / 1050 },
        { transform: transform(.9), offset: 420 / 1050, easing: 'cubic-bezier(.15,.7,.2,1)' },
        { transform: transform(0), offset: 1 },
      ],
      timing: { duration, composite: 'add' },
    })));
  }
}

defineElement('metro-slide-in-effect', MetroSlideInEffect);

declare global {
  interface HTMLElementTagNameMap { 'metro-slide-in-effect': MetroSlideInEffect; }
}
