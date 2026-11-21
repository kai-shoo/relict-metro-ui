import { css, html, nothing, type PropertyDeclarations } from 'lit';
import { defineElement } from './define.js';
import { manualProperty, numericStyles } from './numeric-control.js';
import { RangeControl, rangeStyles, type RangeOrientation } from './range-control.js';
import { metroTheme } from './theme.js';

export type MetroSliderOrientation = RangeOrientation;

export class MetroSlider extends RangeControl {
  static override properties: PropertyDeclarations = {
    min: manualProperty,
    max: manualProperty,
    step: manualProperty,
    orientation: { type: String, reflect: true },
    showBounds: { attribute: 'show-bounds', type: Boolean },
  };

  static override styles = [metroTheme, numericStyles, rangeStyles, css`
    :host {
      --_slider-thickness: var(--metro-slider-thickness, 12px);
      --_slider-inset: 12px;
    }
    .track {
      position: absolute;
      inset-inline: var(--_slider-inset);
      inset-block-start: 50%;
      block-size: var(--_slider-thickness);
      transform: translateY(-50%);
      background: var(--metro-slider-track, var(--_metro-chrome));
    }
    .fill { inline-size: var(--_position); block-size: 100%; background: var(--metro-slider-fill, var(--_metro-accent)); }
    .thumb {
      position: absolute;
      inset-inline-start: var(--_position);
      inset-block-start: 50%;
      inline-size: 12px;
      block-size: 24px;
      transform: translate(-50%, -50%);
      background: var(--metro-slider-thumb, var(--_metro-fg));
    }
    .thumb:dir(rtl) { transform: translate(50%, -50%); }
    .range[data-vertical] { inline-size: 3rem; block-size: var(--metro-slider-length, 12rem); }
    .range[data-vertical] .track {
      inset-block: var(--_slider-inset);
      inset-inline: auto;
      left: 50%;
      inline-size: var(--_slider-thickness);
      block-size: auto;
      transform: translateX(-50%);
    }
    .range[data-vertical] .fill { position: absolute; inset-block-end: 0; inline-size: 100%; block-size: var(--_position); }
    .range[data-vertical] .thumb {
      inset-inline: auto;
      inset-block: auto var(--_position);
      left: 50%;
      inline-size: 24px;
      block-size: 12px;
      transform: translate(-50%, 50%);
    }
    .range[data-disabled] .track { background: color-mix(in srgb, var(--_metro-fg) 10%, transparent); }
    .range[data-disabled] :is(.fill, .thumb) { background: var(--_metro-disabled); }
    .bounds { display: flex; justify-content: space-between; margin-inline: var(--_slider-inset); color: var(--_metro-muted); }
    .vertical { display: flex; align-items: stretch; gap: 0.25rem; }
    .vertical .bounds { flex-direction: column-reverse; margin: var(--_slider-inset) 0; }
    @media (forced-colors: active) {
      .track { outline: 1px solid CanvasText; }
      .fill, .thumb { forced-color-adjust: none; }
      .fill { background: Highlight; }
      .thumb { background: CanvasText; }
      .range[data-disabled] :is(.fill, .thumb) { background: GrayText; }
    }
  `];

  declare orientation: MetroSliderOrientation;
  declare showBounds: boolean;

  constructor() {
    super();
    this.orientation = 'horizontal';
    this.showBounds = false;
  }

  get min() { return this.numberAttribute('min') ?? 0; }
  set min(value: number) { this.setNumberAttribute('min', value); }
  get max() { return this.numberAttribute('max') ?? 10; }
  set max(value: number) { this.setNumberAttribute('max', value); }
  get step(): number | 'any' {
    if (this.getAttribute('step') === 'any') return 'any';
    const value = this.numberAttribute('step');
    return value !== null && value > 0 ? value : 1;
  }
  set step(value: number | 'any') {
    if (value === 'any') this.setAttribute('step', value);
    else this.setNumberAttribute('step', value);
  }
  protected override get axis(): MetroSliderOrientation { return this.orientation === 'vertical' ? 'vertical' : 'horizontal'; }

  override render() {
    const range = this.renderRange(html`
      <div class="track" part="track" data-scale style="--_position: ${this.position * 100}%">
        <div class="fill" part="fill"></div>
        <div class="thumb" part="thumb"></div>
      </div>
    `);
    const bounds = this.showBounds
      ? html`<div class="bounds" part="bounds" aria-hidden="true"><span>${this.rangeMin}</span><span>${this.rangeMax}</span></div>`
      : nothing;
    return html`${this.renderLabel()}<div class=${this.axis}>${range}${bounds}</div>`;
  }
}

defineElement('metro-slider', MetroSlider);

declare global {
  interface HTMLElementTagNameMap { 'metro-slider': MetroSlider; }
}
