import { css, html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { clamp, NumericControl, roundNumber } from './numeric-control.js';

export type RangeOrientation = 'horizontal' | 'vertical';

export const rangeStyles = css`
  .range {
    position: relative;
    display: grid;
    min-inline-size: 0;
    min-block-size: 3rem;
    touch-action: pan-y pinch-zoom;
    cursor: pointer;
  }
  .range[data-vertical] { touch-action: pan-x pinch-zoom; }
  .range[data-disabled], .range[data-readonly] { cursor: default; touch-action: auto; }
  .range[data-dragging] { user-select: none; }
  input {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }
  .range[data-vertical] input { writing-mode: vertical-lr; direction: rtl; }
  .visual { position: relative; pointer-events: none; }
  input:focus-visible + .visual {
    outline: 2px solid var(--_metro-focus);
    outline-offset: 1px;
  }
  @media (forced-colors: active) {
    input:focus-visible + .visual { outline: 2px solid Highlight; }
  }
`;

interface RangeGesture {
  id: number;
  startX: number;
  startY: number;
  initialValue: number;
  moving: boolean;
}

export abstract class RangeControl extends NumericControl<number> {
  static override properties: PropertyDeclarations = {
    valueText: { attribute: 'value-text', type: String },
  };

  declare valueText: string;
  #gesture?: RangeGesture;
  #writingPreview = false;

  constructor() {
    super();
    this.valueText = '';
  }

  abstract get min(): number;
  abstract get max(): number;
  abstract get step(): number | 'any';
  protected get axis(): RangeOrientation { return 'horizontal'; }
  protected get rangeMin() { return this.min; }
  protected get rangeMax() { return Math.max(this.rangeMin, this.max); }
  protected get dragging() { return Boolean(this.#gesture?.moving); }
  protected get announcedValue() { return this.valueText || nothing; }
  protected get position() {
    const span = this.rangeMax - this.rangeMin;
    if (span === 0) return 0;
    if (Number.isFinite(span)) return (this.value - this.rangeMin) / span;
    return (this.value / 2 - this.rangeMin / 2) / (this.rangeMax / 2 - this.rangeMin / 2);
  }

  protected override normalizeValue(value: number | null) {
    const min = this.rangeMin;
    const max = this.rangeMax;
    const bounded = clamp(value !== null && Number.isFinite(value) ? value : min, min, max);
    if (this.step === 'any' || min === max || !Number.isFinite((bounded - min) / this.step)) return bounded;
    const last = Math.floor(roundNumber((max - min) / this.step));
    const offset = Math.min(last, Math.round(roundNumber((bounded - min) / this.step)));
    return clamp(roundNumber(min + offset * this.step), min, max);
  }

  protected valueAt(position: number) {
    return (1 - position) * this.rangeMin + position * this.rangeMax;
  }

  override disconnectedCallback() {
    this.#finishGesture(false);
    super.disconnectedCallback();
  }

  override formDisabledCallback(disabled: boolean) {
    super.formDisabledCallback(disabled);
    if (disabled) this.#finishGesture(false);
  }

  protected override valueUpdated() {
    if (!this.#writingPreview) this.#clearGesture();
  }

  #setUserValue(value: number) {
    const next = this.normalizeValue(value);
    if (next === this.value) return;
    this.#writingPreview = true;
    try {
      this.value = next;
    } finally {
      this.#writingPreview = false;
    }
    this.emitValueEvent('input');
  }

  #updatePointer(event: PointerEvent) {
    if (this.#gesture?.id !== event.pointerId) return;
    const surface = event.currentTarget as HTMLElement;
    const scale = surface.querySelector('[data-scale]') ?? surface;
    const rect = scale.getBoundingClientRect();
    const vertical = this.axis === 'vertical';
    const length = vertical ? rect.height : rect.width;
    if (length <= 0) return;
    const start = vertical ? rect.bottom - event.clientY : event.clientX - rect.left;
    const offset = !vertical && getComputedStyle(surface).direction === 'rtl' ? length - start : start;
    this.#setUserValue(this.valueAt(clamp(offset / length, 0, 1)));
  }

  #onPointerDown(event: PointerEvent) {
    if (this.#gesture || this.controlDisabled || this.controlReadOnly || !event.isPrimary || event.button !== 0) return;
    this.#gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialValue: this.value,
      moving: event.pointerType !== 'touch',
    };
    const surface = event.currentTarget as HTMLElement;
    if (event.isTrusted) surface.setPointerCapture(event.pointerId);
    if (this.#gesture.moving) {
      event.preventDefault();
      this.focus({ preventScroll: true });
      this.#updatePointer(event);
      this.requestUpdate();
    }
  }

  #onPointerMove(event: PointerEvent) {
    const gesture = this.#gesture;
    if (!gesture || event.pointerId !== gesture.id || this.controlDisabled || this.controlReadOnly) return;
    if (!gesture.moving) {
      const dx = Math.abs(event.clientX - gesture.startX);
      const dy = Math.abs(event.clientY - gesture.startY);
      const [along, across] = this.axis === 'vertical' ? [dy, dx] : [dx, dy];
      if (Math.max(along, across) < 8) return;
      if (across >= along) {
        this.#finishGesture(false);
        return;
      }
      gesture.moving = true;
      this.focus({ preventScroll: true });
      this.requestUpdate();
    }
    this.#updatePointer(event);
  }

  #onPointerUp(event: PointerEvent) {
    if (this.#gesture?.id !== event.pointerId) return;
    const enabled = !this.controlDisabled && !this.controlReadOnly;
    if (enabled) {
      this.focus({ preventScroll: true });
      this.#updatePointer(event);
    }
    this.#finishGesture(enabled);
  }

  #onPointerCancel(event: PointerEvent) {
    if (this.#gesture?.id === event.pointerId) this.#finishGesture(false);
  }

  #clearGesture(): RangeGesture | undefined {
    const gesture = this.#gesture;
    if (!gesture) return;
    this.#gesture = undefined;
    const surface = this.shadowRoot?.querySelector('.range');
    if (surface?.hasPointerCapture(gesture.id)) surface.releasePointerCapture(gesture.id);
    return gesture;
  }

  #finishGesture(commit: boolean) {
    const gesture = this.#clearGesture();
    if (!gesture) return;
    this.requestUpdate();
    if (this.value === gesture.initialValue) return;
    if (commit) this.emitValueEvent('change');
    else if (gesture.moving) this.#setUserValue(gesture.initialValue);
  }

  #onNativeInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    if (this.controlReadOnly || this.controlDisabled) {
      event.stopPropagation();
      input.value = String(this.value);
      return;
    }
    this.value = input.valueAsNumber;
  }

  #onNativeChange(event: Event) {
    event.stopPropagation();
    if (!this.controlReadOnly && !this.controlDisabled) this.emitValueEvent('change');
  }

  #onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.#gesture) this.#finishGesture(false);
    if (this.controlReadOnly && /^(Arrow|Home|End|Page)/.test(event.key)) event.preventDefault();
  }

  protected renderRange(visual: TemplateResult) {
    return html`
      <div class="range" part="control" ?data-vertical=${this.axis === 'vertical'}
        ?data-disabled=${this.controlDisabled} ?data-readonly=${this.controlReadOnly} ?data-dragging=${this.dragging}
        @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel} @lostpointercapture=${this.#onPointerCancel}>
        <input id="number" part="input" type="range" min=${this.rangeMin} max=${this.rangeMax} step=${this.step}
          .value=${String(this.value)} ?disabled=${this.controlDisabled}
          aria-label=${this.accessibleLabel()} aria-valuetext=${this.announcedValue}
          aria-orientation=${this.axis} aria-readonly=${this.controlReadOnly ? 'true' : nothing}
          aria-invalid=${this.validity.valid ? nothing : 'true'}
          @input=${this.#onNativeInput} @change=${this.#onNativeChange} @keydown=${this.#onKeyDown}>
        <div class="visual" aria-hidden="true">${visual}</div>
      </div>
    `;
  }
}
