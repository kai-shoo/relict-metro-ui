import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroProgressState = 'normal' | 'paused' | 'error';

export class MetroProgressBar extends LitElement {
  static override properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    indeterminate: { type: Boolean, reflect: true },
    state: { type: String, reflect: true },
    label: { type: String },
    valueText: { type: String, attribute: 'value-text' },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      --_progress-height: var(--metro-progress-thickness, .25rem);
    }

    :host([hidden]) { display: none; }

    .track {
      container-type: inline-size;
      position: relative;
      overflow: hidden;
      block-size: var(--_progress-height);
      background: var(--metro-progress-track, color-mix(in srgb, var(--_metro-accent) 10%, transparent));
      color: var(--metro-progress-fill, var(--_metro-accent));
    }

    .fill {
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      background: currentColor;
      transition: inline-size var(--_metro-motion) ease-out, opacity var(--_metro-motion) ease-out;
    }

    :host([state="paused"]) .fill { opacity: .5; }

    :host([indeterminate]) .track { background: transparent; }

    :host([state="error"]) .track {
      background: var(--metro-status-error, light-dark(#a80026, #ff617c));
    }

    :host([state="error"]) .fill,
    :host([state="error"]) .dots { display: none; }

    .dots {
      --_progress-dot: min(var(--_progress-height), calc(100cqi / 9));
      display: flex;
      align-items: center;
      justify-content: center;
      block-size: 100%;
      gap: var(--_progress-dot);
    }

    .dot {
      display: block;
      flex: none;
      inline-size: var(--_progress-dot);
      block-size: var(--_progress-dot);
      background: currentColor;
    }

    :host([state="paused"]) .dot { opacity: .5; }

    @media (prefers-reduced-motion: no-preference) {
      :host(:not([state="paused"], [state="error"])) .dot {
        position: absolute;
        inset-block-start: calc((var(--_progress-height) - var(--_progress-dot)) / 2);
        inset-inline-start: 0;
        --_direction: 1;
        --_from: calc(-1 * var(--_progress-dot) - 1px);
        --_early: calc((100cqi + var(--_progress-dot)) / 3 - var(--_progress-dot));
        --_late: calc((100cqi + var(--_progress-dot)) * 2 / 3 - var(--_progress-dot));
        --_to: calc(100cqi + 1px);
        animation: pass 4.4s var(--_delay, 0ms) infinite backwards;
      }

      :host(:not([state="paused"], [state="error"])) .dot:dir(rtl) { --_direction: -1; }
      .dot:nth-child(2) { --_delay: 200ms; }
      .dot:nth-child(3) { --_delay: 400ms; }
      .dot:nth-child(4) { --_delay: 600ms; }
      .dot:nth-child(5) { --_delay: 800ms; }
    }

    @keyframes pass {
      0% {
        translate: calc(var(--_direction) * var(--_from));
        animation-timing-function: ease-out;
      }
      11.3636% {
        translate: calc(var(--_direction) * var(--_early));
        animation-timing-function: linear;
      }
      45.4545% {
        translate: calc(var(--_direction) * var(--_late));
        animation-timing-function: ease-in;
      }
      56.8182%, 100% { translate: calc(var(--_direction) * var(--_to)); }
    }

    @media (forced-colors: active) {
      .track {
        forced-color-adjust: none;
        background: Canvas;
        color: Highlight;
        outline: 1px solid CanvasText;
      }

      :host([indeterminate]) .track { background: Canvas; }
      :host([state="error"]) .track { background: CanvasText; }
    }
  `];

  declare value: number;
  declare min: number;
  declare max: number;
  declare indeterminate: boolean;
  declare state: MetroProgressState;
  declare label: string;
  declare valueText: string;

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.indeterminate = false;
    this.state = 'normal';
    this.label = 'Progress';
    this.valueText = '';
  }

  protected override render() {
    const minimum = Number.isFinite(this.min) ? this.min : 0;
    const maximum = Number.isFinite(this.max) ? this.max : 100;
    const range = maximum - minimum;
    const valid = Number.isFinite(range) && range > 0;
    const min = valid ? minimum : 0;
    const max = valid ? maximum : 100;
    const value = Number.isFinite(this.value) ? Math.max(min, Math.min(max, this.value)) : min;
    const percent = (value - min) / (max - min) * 100;
    const status = this.state === 'paused' ? 'Paused' : this.state === 'error' ? 'Error' : '';
    const valueText = this.valueText || (status
      ? (this.indeterminate ? status : `${status}, ${Math.round(percent)}%`)
      : undefined);

    return html`
      <div class="track" part="track" role="progressbar" aria-label=${this.label || 'Progress'}
        aria-valuemin=${min} aria-valuemax=${max}
        aria-valuenow=${this.indeterminate ? nothing : value}
        aria-valuetext=${valueText ?? nothing}>
        ${this.indeterminate ? html`
          <div class="dots" part="indicator" aria-hidden="true">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="dot"></span><span class="dot"></span>
          </div>
        ` : html`
          <div class="fill" part="fill" aria-hidden="true"
            style="inline-size: ${percent}%"></div>
        `}
      </div>
    `;
  }
}

defineElement('metro-progress-bar', MetroProgressBar);

declare global {
  interface HTMLElementTagNameMap {
    'metro-progress-bar': MetroProgressBar;
  }
}
