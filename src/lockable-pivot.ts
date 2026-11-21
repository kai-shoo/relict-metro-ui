import { defineElement } from './define.js';
import { MetroPivot } from './pivot.js';

export class MetroLockablePivot extends MetroPivot {
  static override properties = {
    ...MetroPivot.properties,
    locked: { type: Boolean, reflect: true, noAccessor: true },
  };

  #locked = false;

  get locked(): boolean { return this.#locked; }

  set locked(value: boolean) {
    const previous = this.#locked;
    const next = Boolean(value);
    if (next === previous) return;
    this.#locked = next;
    this.rememberLockedSelection(next);
    this.requestUpdate('locked', previous);
  }

  protected override get selectionLocked(): boolean { return this.locked; }
}

defineElement('metro-lockable-pivot', MetroLockablePivot);

declare global {
  interface HTMLElementTagNameMap { 'metro-lockable-pivot': MetroLockablePivot; }
}
