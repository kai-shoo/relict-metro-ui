import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import './progress-bar.js';
import { metroTheme } from './theme.js';

export type MetroTransferPhase = 'queued' | 'waiting' | 'transferring' | 'complete' | 'error' | 'cancelled';
export type MetroTransferAction = 'cancel' | 'retry';
export interface MetroTransferActionDetail { id: string; action: MetroTransferAction; phase: MetroTransferPhase }

const phaseLabels: Readonly<Record<MetroTransferPhase, string>> = {
  queued: 'Queued',
  waiting: 'Waiting',
  transferring: 'Transferring',
  complete: 'Complete',
  error: 'Transfer failed',
  cancelled: 'Cancelled',
};

export class MetroTransferControl extends LitElement {
  static override properties = {
    transferId: { type: String, attribute: 'transfer-id' },
    label: { type: String },
    phase: { type: String, reflect: true },
    phaseLabel: { type: String, attribute: 'phase-label' },
    waitingReason: { type: String, attribute: 'waiting-reason' },
    transferred: { type: Number },
    total: { type: Number },
    pending: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    hideCancel: { type: Boolean, attribute: 'hide-cancel' },
    hideRetry: { type: Boolean, attribute: 'hide-retry' },
    progressLabel: { type: String, attribute: 'progress-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    retryLabel: { type: String, attribute: 'retry-label' },
  };

  static override styles = [metroTheme, metroButtonStyles, css`
    :host { display: block; min-inline-size: 0; container-type: inline-size; color: var(--_metro-fg); }
    section {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: .5rem;
      padding-block: var(--_metro-space);
      padding-inline: min(var(--_metro-space), 6.5cqi);
      background: var(--metro-transfer-bg, var(--_metro-chrome));
    }

    .label { font-size: clamp(1.25rem, 5.75cqi, 1.4167rem); overflow-wrap: anywhere; }
    .status { margin: 0; color: var(--_metro-muted); overflow-wrap: anywhere; }
    .status:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    button {
      justify-self: start;
      font-size: 1.0625rem;
      min-block-size: 2.75rem;
      padding-inline: min(.625rem, 3cqi);
    }
    button[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }
    button[aria-disabled="true"]:active { background: transparent; color: var(--_metro-disabled); }
  `];

  declare transferId: string;
  declare label: string;
  declare phase: MetroTransferPhase;
  declare phaseLabel: string;
  declare waitingReason: string;
  declare transferred: number;
  declare total: number | null;
  declare pending: boolean;
  declare disabled: boolean;
  declare hideCancel: boolean;
  declare hideRetry: boolean;
  declare progressLabel: string;
  declare cancelLabel: string;
  declare retryLabel: string;

  constructor() {
    super();
    this.transferId = '';
    this.label = 'Transfer';
    this.phase = 'queued';
    this.phaseLabel = '';
    this.waitingReason = '';
    this.transferred = 0;
    this.total = null;
    this.pending = false;
    this.disabled = false;
    this.hideCancel = false;
    this.hideRetry = false;
    this.progressLabel = 'Transfer progress';
    this.cancelLabel = 'Cancel';
    this.retryLabel = 'Retry';
  }

  get #phase(): MetroTransferPhase {
    return Object.hasOwn(phaseLabels, this.phase) ? this.phase : 'queued';
  }

  get #action(): MetroTransferAction | undefined {
    const phase = this.#phase;
    if (!this.hideCancel && (phase === 'queued' || phase === 'waiting' || phase === 'transferring')) return 'cancel';
    if (!this.hideRetry && (phase === 'error' || phase === 'cancelled')) return 'retry';
  }

  #activate(action: MetroTransferAction): void {
    if (this.disabled || this.pending || !this.transferId?.trim() || action !== this.#action) return;
    this.dispatchEvent(new CustomEvent<MetroTransferActionDetail>('metro-transfer-action', {
      detail: { id: this.transferId, phase: this.#phase, action }, bubbles: true, composed: true,
    }));
  }

  protected override update(changed: PropertyValues<this>): void {
    const action = this.shadowRoot?.activeElement;
    super.update(changed);
    if (!(action instanceof HTMLButtonElement) || (action.isConnected && !action.disabled)) return;
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || active === this || active === this.ownerDocument.body) {
      tryFocus(this.shadowRoot?.querySelector<HTMLElement>('.status'));
    }
  }

  protected override render() {
    const action = this.#action;
    const waiting = this.#phase === 'waiting';
    const reason = waiting ? this.waitingReason?.trim() : '';
    const phase = this.phaseLabel || phaseLabels[this.#phase];
    const total = typeof this.total === 'number' && this.total > 0 && Number.isFinite(this.total) ? this.total : undefined;
    const progress = waiting || this.#phase === 'transferring';
    return html`
      <section part="surface" aria-labelledby="label">
        <div class="label" id="label" part="label"><slot>${this.label}</slot></div>
        <p class="status" part="status" role="status" tabindex="-1">
          ${phase}${reason ? html`<span part="reason"> · ${reason}</span>` : nothing}
        </p>
        ${progress ? html`
          <metro-progress-bar part="progress" exportparts="track, fill, indicator"
            .label=${this.progressLabel} .state=${waiting ? 'paused' : 'normal'}
            .indeterminate=${total === undefined} .value=${this.transferred} .max=${total ?? 100}
            .valueText=${waiting && total === undefined ? [phase, reason].filter(Boolean).join(' · ') : ''}>
          </metro-progress-bar>
        ` : nothing}
        ${action ? html`
          <button type="button" part=${action} ?disabled=${this.disabled || !this.transferId?.trim()}
            aria-disabled=${String(this.pending)} @click=${() => this.#activate(action)}>
            ${action === 'cancel' ? this.cancelLabel : this.retryLabel}
          </button>
        ` : nothing}
      </section>
    `;
  }
}

defineElement('metro-transfer-control', MetroTransferControl);

declare global {
  interface HTMLElementTagNameMap { 'metro-transfer-control': MetroTransferControl }
  interface HTMLElementEventMap { 'metro-transfer-action': CustomEvent<MetroTransferActionDetail> }
}
