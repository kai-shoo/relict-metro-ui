import { defineElement } from './define.js';
import { MotionEffect, motionDuration, type MotionAnimation } from './motion-effect.js';

export type MetroMotionDirection = 'forward' | 'back';
export type MetroMotionPhase = 'enter' | 'exit';

export function turnstileAnimation(target: Element, direction: MetroMotionDirection,
  phase: MetroMotionPhase, duration?: number, delay = 0, feather = false): MotionAnimation {
  const entering = phase === 'enter';
  const forward = direction === 'forward';
  const sign = getComputedStyle(target).direction === 'rtl' ? -1 : 1;
  const angle = (entering === forward ? -80 : 50) * sign;
  const pivot = feather ? 70 : 50;
  const turn = (rotation: number) => `translateX(${-pivot * sign}%) perspective(900px) rotateY(${rotation}deg) translateX(${pivot * sign}%)`;
  return {
    target,
    frames: [{ transform: turn(entering ? angle : 0) }, { transform: turn(entering ? 0 : angle) }],
    timing: {
      duration: motionDuration(duration, entering ? 350 : 250), delay, fill: entering ? 'backwards' : 'none',
      easing: entering ? 'cubic-bezier(.15,.75,.25,1)' : 'cubic-bezier(.6,0,.85,.3)', composite: 'add',
    },
  };
}

export function featherAnimations(targets: readonly Element[], direction: MetroMotionDirection,
  phase: MetroMotionPhase, duration?: number, stagger?: number): MotionAnimation[] {
  const first = (phase === 'enter') === (direction === 'forward');
  const interval = motionDuration(stagger, first ? 40 : 50);
  return targets.map((target, index) => turnstileAnimation(target, direction, phase, duration, Math.min(index * interval, 2000), true));
}

export class MetroTurnstileFeatherEffect extends MotionEffect {
  static override properties = {
    ...MotionEffect.properties,
    direction: { type: String },
    phase: { type: String },
    stagger: { type: Number },
  };

  declare direction: MetroMotionDirection;
  declare phase: MetroMotionPhase;
  declare stagger: number | undefined;

  constructor() {
    super();
    this.direction = 'forward';
    this.phase = 'enter';
    this.stagger = undefined;
  }

  override play(): Promise<boolean> {
    const markers = Array.from(this.querySelectorAll('[data-metro-feather]'))
      .filter(element => element.closest('metro-turnstile-feather-effect') === this);
    return this.run(featherAnimations(markers.length ? markers : Array.from(this.children), this.direction, this.phase, this.duration, this.stagger));
  }
}

defineElement('metro-turnstile-feather-effect', MetroTurnstileFeatherEffect);

declare global {
  interface HTMLElementTagNameMap { 'metro-turnstile-feather-effect': MetroTurnstileFeatherEffect; }
}
