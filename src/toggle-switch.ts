import { css, html } from 'lit';
import { CheckControl, choiceStyles } from './check-control.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

interface SwitchDrag {
  pointer: number;
  startX: number;
  startY: number;
  direction: number;
  track: HTMLElement;
  travel: number;
  initial: number;
  position: number;
  active: boolean;
}

export class MetroToggleSwitch extends CheckControl {
  static override properties = {
    onLabel: { type: String, attribute: 'on-label' },
    offLabel: { type: String, attribute: 'off-label' },
  };

  static override styles = [metroTheme, choiceStyles, css`
    .choice {
      flex-wrap: wrap;
      justify-content: space-between;
      min-block-size: 5.9375rem;
      touch-action: pan-y pinch-zoom;
    }

    .choice-label {
      order: -1;
      flex: 1 1 8ch;
      color: var(--_metro-muted);
      font-size: 1.25rem;
    }

    .state {
      display: block;
      color: var(--_metro-fg);
      font-size: 2rem;
      font-weight: 300;
      line-height: 1.1;
    }

    .choice .choice-mark {
      position: relative;
      inline-size: 5.5625rem;
      max-inline-size: 100%;
      block-size: 2.125rem;
      margin-inline-start: auto;
      background: transparent;
      transition: background-color min(var(--_metro-motion), 50ms) ease;
    }

    .knob {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: -3px;
      inline-size: 1.75rem;
      block-size: 2.375rem;
      transform: translateY(-50%);
      background: currentColor;
      transition: inset-inline-start min(var(--_metro-motion), 50ms) ease;
    }

    input:checked + .choice-mark { background: var(--_metro-accent); }
    input:checked + .choice-mark .knob { inset-inline-start: calc(100% - 1.75rem + 3px); }
    input:disabled + .choice-mark { opacity: .65; background: transparent; }
    .choice:has(input:disabled) :is(.choice-label, .state) { color: var(--_metro-disabled); }

    input + .choice-mark[data-dragging] .knob {
      inset-inline-start: calc(-3px + var(--_metro-switch-offset));
      transition: none;
    }

    @media (forced-colors: active) {
      .knob { forced-color-adjust: none; background: CanvasText; }
      input:disabled + .choice-mark .knob { background: GrayText; }
    }
  `];

  declare onLabel: string;
  declare offLabel: string;
  #drag: SwitchDrag | undefined;
  #handledPointer: number | undefined;

  constructor() {
    super();
    this.onLabel = 'On';
    this.offLabel = 'Off';
  }

  protected override get inputRole() { return 'switch' as const; }

  protected override checkedUpdated(): void { this.#abortDrag(); }

  override formDisabledCallback(disabled: boolean): void {
    super.formDisabledCallback(disabled);
    if (disabled) this.#abortDrag();
  }

  protected override firstUpdated(): void {
    const input = this.controlInput!;
    input.addEventListener('pointerdown', this.#startDrag);
    input.addEventListener('pointermove', this.#moveDrag);
    input.addEventListener('pointerup', this.#finishDrag);
    input.addEventListener('pointercancel', this.#cancelDrag);
    input.addEventListener('lostpointercapture', this.#cancelDrag);
    input.addEventListener('click', this.#guardClick, { capture: true });
  }

  override disconnectedCallback(): void {
    this.#clearDrag();
    this.#handledPointer = undefined;
    super.disconnectedCallback();
  }

  #startDrag = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0 || this.controlDisabled) return;
    this.#handledPointer = undefined;
    this.#clearDrag();
    const track = this.shadowRoot!.querySelector<HTMLElement>('.choice-mark')!;
    const bounds = track.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right) return;

    const knob = track.firstElementChild!;
    const travel = bounds.width - knob.getBoundingClientRect().width;
    if (travel <= 0) return;
    const initial = this.checked ? travel : 0;
    this.#drag = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      direction: getComputedStyle(track).direction === 'rtl' ? -1 : 1,
      track, travel, initial, position: initial, active: false,
    };
  };

  #moveDrag = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    const x = event.clientX - drag.startX;
    const y = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 8) return;
      if (Math.abs(y) >= Math.abs(x)) {
        this.#clearDrag();
        return;
      }
      drag.active = true;
      this.controlInput!.setPointerCapture(event.pointerId);
      drag.track.setAttribute('data-dragging', '');
    }

    drag.position = Math.max(0, Math.min(drag.travel, drag.initial + x * drag.direction));
    drag.track.style.setProperty('--_metro-switch-offset', `${drag.position}px`);
  };

  #finishDrag = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    this.#clearDrag();
    if (!drag.active) return;

    this.#handledPointer = event.pointerId;
    const next = drag.position >= drag.travel / 2;
    if (!this.controlDisabled && next !== this.checked) this.controlInput?.click();
  };

  #cancelDrag = (event: PointerEvent): void => {
    if (event.pointerId === this.#drag?.pointer) this.#clearDrag();
  };

  #abortDrag(): void {
    if (!this.#drag) return;
    this.#handledPointer = this.#drag.pointer;
    this.#clearDrag();
  }

  #clearDrag(): void {
    this.#drag?.track.removeAttribute('data-dragging');
    this.#drag?.track.style.removeProperty('--_metro-switch-offset');
    this.#drag = undefined;
  }

  #guardClick = (event: MouseEvent): void => {
    if (!event.detail || this.#handledPointer === undefined) return;
    if (event instanceof PointerEvent && event.pointerId !== this.#handledPointer) return;
    this.#handledPointer = undefined;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  protected override render() {
    return this.renderControl(html`
      <span class="choice-mark" part="track" aria-hidden="true"><span class="knob" part="thumb"></span></span>
    `, html`<span class="state" part="state" aria-hidden="true">${this.checked ? this.onLabel : this.offLabel}</span>`);
  }
}

defineElement('metro-toggle-switch', MetroToggleSwitch);

declare global {
  interface HTMLElementTagNameMap {
    'metro-toggle-switch': MetroToggleSwitch;
  }
}
