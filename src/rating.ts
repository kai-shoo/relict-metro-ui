import { css, html, type PropertyDeclarations } from 'lit';
import { defineElement } from './define.js';
import { clamp, manualProperty, numericStyles } from './numeric-control.js';
import { RangeControl, rangeStyles } from './range-control.js';
import { metroTheme } from './theme.js';

export class MetroRating extends RangeControl {
  static override properties: PropertyDeclarations = {
    max: manualProperty,
    step: manualProperty,
    required: manualProperty,
    readOnly: manualProperty,
    unratedLabel: { attribute: 'unrated-label', type: String },
    showValue: { attribute: 'show-value', type: Boolean },
  };

  static override styles = [metroTheme, numericStyles, rangeStyles, css`
    .range { min-block-size: 0; }
    .stars {
      display: grid;
      grid-template-columns: repeat(var(--_count), minmax(0, 1fr));
      align-items: center;
      min-block-size: 43px;
    }
    .scale { inline-size: min(100%, calc(var(--metro-rating-item-size, 43px) * var(--_count))); }
    .star {
      display: grid;
      inline-size: min(100%, var(--metro-rating-icon-size, 27px));
      aspect-ratio: 1;
      justify-self: center;
      clip-path: polygon(50% 0%, 62% 36%, 100% 36%, 69% 59%, 81% 97%, 50% 74%, 19% 97%, 31% 59%, 0 36%, 38% 36%);
      background: var(--metro-rating-empty, var(--_metro-muted));
    }
    .star-fill { inline-size: var(--_fill); background: var(--metro-rating-fill, var(--_metro-accent)); }
    .range[data-disabled] .star { background: var(--_metro-disabled); }
    .range[data-disabled] .star-fill { background: var(--_metro-muted); }
    .value {
      --_value-width: max(35px, 3.6ch);
      position: absolute;
      inset-block-end: 100%;
      inset-inline-start: clamp(0px, calc(var(--_position) - var(--_value-width) / 2), calc(100% - var(--_value-width)));
      z-index: 1;
      inline-size: min(100%, var(--_value-width));
      min-block-size: 30px;
      background: var(--_metro-chrome);
      color: var(--_metro-fg);
      font-variant-numeric: tabular-nums;
      line-height: max(30px, 1.2em);
      overflow-wrap: anywhere;
      text-align: center;
      opacity: 0;
      transition: opacity var(--metro-rating-hide-duration, 300ms);
    }
    .range[data-dragging] .value { opacity: 1; transition-duration: var(--metro-rating-show-duration, 100ms); }
    @media (prefers-reduced-motion: reduce) { .range .value { transition: none; } }
    @media (forced-colors: active) {
      .star, .star-fill { forced-color-adjust: none; }
      .star { background: GrayText; }
      .star-fill { background: Highlight; }
      .range[data-disabled] .star { background: GrayText; }
      .range[data-disabled] .star-fill { background: CanvasText; }
    }
  `];

  declare unratedLabel: string;
  declare showValue: boolean;

  constructor() {
    super();
    this.unratedLabel = 'Not rated';
    this.showValue = false;
  }

  get min() { return 0; }
  get max() { return clamp(Math.floor(this.numberAttribute('max') ?? 5), 1, 20); }
  set max(value: number) { this.setNumberAttribute('max', value); }
  get step(): 0.5 | 1 { return this.numberAttribute('step') === 0.5 ? 0.5 : 1; }
  set step(value: 0.5 | 1) { this.setNumberAttribute('step', value); }
  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(value: boolean) { this.toggleAttribute('readonly', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }

  protected override get controlReadOnly() { return this.readOnly; }
  protected override get submittableValue() { return this.value === 0 ? null : String(this.value); }
  protected override get announcedValue() {
    return this.valueText || (this.value === 0 ? this.unratedLabel : `${this.value} / ${this.max}`);
  }

  protected override localValidity() {
    return this.required && this.value === 0 ? { flags: { valueMissing: true }, message: 'Choose a rating.' } : undefined;
  }

  protected override valueAt(position: number) {
    return Math.ceil(position * this.max / this.step) * this.step;
  }

  override render() {
    const stars = Array.from({ length: this.max }, (_, index) => {
      const fill = clamp(this.value - index, 0, 1) * 100;
      return html`<span class="star" part="star"><span class="star-fill" part="fill" style="--_fill: ${fill}%"></span></span>`;
    });
    return html`${this.renderLabel()}
      <div class="scale" style="--_count: ${this.max}; --_position: ${this.position * 100}%">
        ${this.renderRange(html`
          <div class="stars" part="stars" data-scale>${stars}</div>
          ${this.showValue ? html`<span class="value" part="value">${this.value}</span>` : ''}
        `)}
      </div>`;
  }
}

defineElement('metro-rating', MetroRating);

declare global {
  interface HTMLElementTagNameMap { 'metro-rating': MetroRating; }
}
