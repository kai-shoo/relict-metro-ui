import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroProgressRingSize = 'small' | 'large';

export class MetroProgressRing extends LitElement {
  static override properties = {
    active: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      max-inline-size: 100%;
      overflow: clip;
      vertical-align: middle;
      color: var(--metro-progress-fill, var(--_metro-accent));
      --_ring-size: var(--metro-ring-size, 3.59375rem);
      --_ring-dot: var(--metro-ring-dot-size, min(.40625rem, calc(100cqi * 6.5 / 57.5)));
      --_ring-inset: min(.46875rem, calc(100cqi * 7.5 / 57.5));
    }

    :host([size="small"]) {
      --_ring-size: var(--metro-ring-size, 1.5rem);
      --_ring-dot: var(--metro-ring-dot-size, min(.21875rem, calc(100cqi * 3.5 / 24)));
      --_ring-inset: 0px;
    }

    :host([hidden]), :host(:not([active])) { display: none; }

    .ring {
      display: block;
      container-type: inline-size;
      position: relative;
      inline-size: var(--_ring-size);
      max-inline-size: 100%;
      aspect-ratio: 1;
    }

    .arm {
      position: absolute;
      inset: 0;
      rotate: var(--_angle, 0deg);
    }

    .arm::before {
      content: '';
      display: block;
      margin-inline: auto;
      margin-block-start: var(--_ring-inset);
      inline-size: min(var(--_ring-dot), calc(100cqi - 2 * var(--_ring-inset)));
      aspect-ratio: 1;
      background: currentColor;
      border-radius: 50%;
    }

    .arm:nth-child(2) { --_angle: 60deg; --_phase: -120ms; }
    .arm:nth-child(3) { --_angle: 120deg; --_phase: -240ms; }
    .arm:nth-child(4) { --_angle: 180deg; --_phase: -360ms; }
    .arm:nth-child(5) { --_angle: 240deg; --_phase: -480ms; }
    .arm:nth-child(6) { --_angle: 300deg; --_phase: -600ms; }

    :host([size="small"]) .arm:nth-child(2) { --_angle: 72deg; }
    :host([size="small"]) .arm:nth-child(3) { --_angle: 144deg; }
    :host([size="small"]) .arm:nth-child(4) { --_angle: 216deg; }
    :host([size="small"]) .arm:nth-child(5) { --_angle: 288deg; }
    :host([size="small"]) .arm:nth-child(6) { display: none; }

    @media (prefers-reduced-motion: no-preference) {
      .ring { animation: spin 1.8s linear infinite; }
      .arm { animation: fade 1.8s var(--_phase, 0ms) ease-in-out infinite; }
    }

    @keyframes spin { to { rotate: 1turn; } }
    @keyframes fade { 0%, 100% { opacity: 1; } 60% { opacity: .3; } }

    @media (forced-colors: active) {
      .ring { forced-color-adjust: none; color: Highlight; }
    }
  `];

  declare active: boolean;
  declare size: MetroProgressRingSize;
  declare label: string;

  constructor() {
    super();
    this.active = false;
    this.size = 'large';
    this.label = 'Loading';
  }

  protected override render() {
    return html`
      <span class="ring" part="ring" role="progressbar" aria-label=${this.label || 'Loading'}>
        <span class="arm" aria-hidden="true"></span><span class="arm" aria-hidden="true"></span>
        <span class="arm" aria-hidden="true"></span><span class="arm" aria-hidden="true"></span>
        <span class="arm" aria-hidden="true"></span><span class="arm" aria-hidden="true"></span>
      </span>
    `;
  }
}

defineElement('metro-progress-ring', MetroProgressRing);

declare global {
  interface HTMLElementTagNameMap {
    'metro-progress-ring': MetroProgressRing;
  }
}
