import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';
import './progress-bar.js';
import { metroTheme } from './theme.js';

export class MetroStatusBar extends LitElement {
  static override properties = {
    label: { type: String },
    time: { type: String },
    dateTime: { type: String, attribute: 'datetime' },
    signal: { type: Number },
    networkLabel: { type: String, attribute: 'network-label' },
    battery: { type: Number },
    batteryLabel: { type: String, attribute: 'battery-label' },
    charging: { type: Boolean },
    chargingLabel: { type: String, attribute: 'charging-label' },
    progress: { type: Number },
    busy: { type: Boolean },
    progressLabel: { type: String, attribute: 'progress-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; background: var(--metro-status-background, var(--_metro-bg)); color: var(--_metro-fg); }
    .status {
      display: flex;
      align-items: center;
      gap: .15rem .5rem;
      min-block-size: var(--metro-status-height, 1.5rem);
      padding-inline: min(var(--_metro-space), 4%);
      font-size: .85rem;
      flex-wrap: wrap;
    }
    time, ::slotted([slot="start"]), ::slotted([slot="end"]) {
      box-sizing: border-box;
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow-wrap: anywhere;
    }
    time {
      margin-inline-start: auto;
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
    .signal { display: inline-flex; block-size: .7rem; align-items: end; gap: 2px; }
    .bar { inline-size: 2px; height: 100%; background: currentColor; opacity: .25; }
    .bar[data-available] { opacity: 1; }
    .battery { display: inline-flex; align-items: center; min-inline-size: 1.25rem; }
    .cell { border: 1px solid currentColor; display: block; inline-size: 1rem; block-size: .47rem; padding: 1px; }
    .cell::after { content: ''; display: block; inline-size: var(--_charge); block-size: 100%; background: currentColor; }
    .battery::after { content: ''; inline-size: 2px; block-size: 4px; background: currentColor; }
    .charging { color: var(--_metro-accent-text); font-weight: 600; }
    @media (forced-colors: active) {
      .signal, .battery { forced-color-adjust: none; color: CanvasText; }
      .bar:not([data-available]) { color: GrayText; opacity: 1; }
      .charging { color: Highlight; }
    }
  `];

  declare label: string;
  declare time: string;
  declare dateTime: string;
  declare signal: number | null;
  declare networkLabel: string;
  declare battery: number | null;
  declare batteryLabel: string;
  declare charging: boolean;
  declare chargingLabel: string;
  declare progress: number | null;
  declare busy: boolean;
  declare progressLabel: string;

  constructor() {
    super();
    this.label = 'Status bar';
    this.time = '';
    this.dateTime = '';
    this.signal = null;
    this.networkLabel = 'Signal';
    this.battery = null;
    this.batteryLabel = 'Battery';
    this.charging = false;
    this.chargingLabel = 'Charging';
    this.progress = null;
    this.busy = false;
    this.progressLabel = 'Background activity';
  }

  protected override render() {
    const signal = Number.isFinite(this.signal) ? Math.round(Math.max(0, Math.min(4, this.signal!))) : null;
    const battery = Number.isFinite(this.battery) ? Math.round(Math.max(0, Math.min(100, this.battery!))) : null;
    const progress = Number.isFinite(this.progress);
    return html`
      <div part="status" class="status" role="group" aria-label=${this.label || 'Status bar'}>
        <slot name="start"></slot>
        ${signal !== null ? html`
          <span class="signal" part="signal" role="img" aria-label=${`${this.networkLabel}: ${signal}/4`}>
            ${[1, 2, 3, 4].map(bar => html`<span class="bar" aria-hidden="true"
              style=${`height:${bar * 25}%`} ?data-available=${bar <= signal}></span>`)}
          </span>
        ` : nothing}
        ${battery !== null ? html`
          <span class="battery" part="battery" role="img"
            aria-label=${`${this.batteryLabel}: ${battery}%${this.charging ? `, ${this.chargingLabel}` : ''}`}>
            ${this.charging ? html`<span class="charging" aria-hidden="true">+</span>` : nothing}
            <span class="cell" style=${`--_charge:${battery}%`} aria-hidden="true"></span>
          </span>
        ` : nothing}
        <slot name="end"></slot>
        ${this.time ? html`<time part="time" datetime=${this.dateTime || nothing}><bdi>${this.time}</bdi></time>` : nothing}
      </div>
      ${progress || this.busy ? html`
        <metro-progress-bar part="progress" .label=${this.progressLabel} .value=${this.progress || 0}
          ?indeterminate=${this.busy && !progress}></metro-progress-bar>
      ` : nothing}
    `;
  }
}

defineElement('metro-status-bar', MetroStatusBar);

declare global {
  interface HTMLElementTagNameMap { 'metro-status-bar': MetroStatusBar; }
}
