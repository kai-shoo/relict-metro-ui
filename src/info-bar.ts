import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroInfoSeverity = 'info' | 'success' | 'warning' | 'error';
export type MetroDismissEvent = CustomEvent<{ reason: 'dismiss-button' }>;

const markers = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '×',
} as const;

export class MetroInfoBar extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    dismissible: { type: Boolean, reflect: true },
    severity: { type: String, reflect: true },
    heading: { type: String },
    message: { type: String },
    dismissLabel: { type: String, attribute: 'dismiss-label' },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      color: var(--_metro-fg);
      --_info-color: var(--metro-status-info, var(--_metro-accent));
    }

    :host([severity="success"]) { --_info-color: var(--metro-status-success, light-dark(#237615, #7bd362)); }
    :host([severity="warning"]) { --_info-color: var(--metro-status-warning, light-dark(#915a00, #ffc05d)); }
    :host([severity="error"]) { --_info-color: var(--metro-status-error, light-dark(#a80026, #ff617c)); }

    :host([hidden]), :host(:not([open])) { display: none; }

    .surface {
      box-sizing: border-box;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: .375rem;
      min-block-size: 2.75rem;
      padding: calc(var(--_metro-space) * .5) min(var(--_metro-space), 4%);
      border-inline-start: .25rem solid var(--_info-color);
      background: var(--metro-info-background, var(--_metro-chrome));
    }

    .content {
      --_info-line-height: 1.3125rem;
      display: flex;
      flex: 1 1 12rem;
      align-items: flex-start;
      gap: min(var(--_metro-space), 4%);
      min-inline-size: 0;
      padding-block: .375rem;
    }

    .icon {
      --_info-icon-size: min(1.125rem, 24px);
      display: grid;
      flex: none;
      place-items: center;
      box-sizing: border-box;
      inline-size: var(--_info-icon-size);
      block-size: var(--_info-icon-size);
      margin-block-start: calc((var(--_info-line-height) - var(--_info-icon-size)) / 2);
      border: 1px solid currentColor;
      border-radius: 50%;
      color: var(--_info-color);
      font: 600 min(.875rem, 18px) / 1 var(--_metro-font);
    }

    .text {
      display: grid;
      gap: .125rem;
      min-inline-size: 0;
      overflow-wrap: anywhere;
      font-size: .9375rem;
      line-height: var(--_info-line-height);
    }

    .heading { font-weight: 600; }

    .controls, .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .controls { margin-inline-start: auto; gap: .375rem; }

    ::slotted([slot="action"]) {
      box-sizing: border-box;
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow-wrap: anywhere;
    }

    .dismiss {
      flex: none;
      display: grid;
      place-items: center;
      box-sizing: border-box;
      min-inline-size: 2.75rem;
      min-block-size: 2.75rem;
      margin-block: -.375rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: 300 1.5rem / 1 var(--_metro-font);
      cursor: pointer;
    }

    .dismiss:active {
      color: var(--_metro-on-accent);
      background: var(--_metro-accent);
    }

    .dismiss:focus-visible {
      outline: 2px solid var(--_metro-focus);
      outline-offset: -2px;
    }

    .sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (forced-colors: active) {
      .surface { border: 1px solid CanvasText; }
    }
  `];

  declare open: boolean;
  declare dismissible: boolean;
  declare severity: MetroInfoSeverity;
  declare heading: string;
  declare message: string;
  declare dismissLabel: string;

  #previousFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = true;
    this.dismissible = false;
    this.severity = 'info';
    this.heading = '';
    this.message = '';
    this.dismissLabel = 'Dismiss';
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    const closing = changed.has('open') && !this.open && this.matches(':focus-within');
    const removingFocusedDismiss = changed.has('dismissible') && !this.dismissible
      && this.shadowRoot?.activeElement?.matches('.dismiss');
    if ((closing || removingFocusedDismiss) && this.#previousFocus?.isConnected) {
      this.#previousFocus.focus({ preventScroll: true });
    }
  }

  #onFocusIn(event: FocusEvent) {
    const previous = event.relatedTarget;
    if (previous instanceof HTMLElement &&
        !this.contains(previous) && !this.shadowRoot?.contains(previous)) {
      this.#previousFocus = previous;
    }
  }

  #dismiss() {
    if (!this.open || !this.dismissible) return;

    const approved = this.dispatchEvent(new CustomEvent('metro-dismiss', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { reason: 'dismiss-button' },
    }) satisfies MetroDismissEvent);
    if (approved) this.open = false;
  }

  protected override render() {
    const label = this.dismissLabel || 'Dismiss';
    const severity = Object.hasOwn(markers, this.severity) ? this.severity : 'info';

    return html`
      <div class="surface" part="surface" @focusin=${this.#onFocusIn}>
        <div class="content">
          <span class="icon" part="icon" aria-hidden="true">${markers[severity]}</span>
          <div class="text" part="content" role=${severity === 'error' ? 'alert' : 'status'} aria-atomic="true">
            ${severity === 'warning' ? html`<span class="sr-only">Warning: </span>` : null}
            ${this.heading ? html`<strong class="heading" part="heading">${this.heading}</strong>` : null}
            ${this.message ? html`<span part="message">${this.message}</span>` : null}
            <slot></slot>
          </div>
        </div>
        <div class="controls">
          <div class="actions" part="actions"><slot name="action"></slot></div>
          ${this.dismissible ? html`
            <button class="dismiss" part="dismiss" type="button" aria-label=${label} @click=${this.#dismiss}>
              <span aria-hidden="true">×</span>
            </button>
          ` : null}
        </div>
      </div>
    `;
  }
}

defineElement('metro-info-bar', MetroInfoBar);

declare global {
  interface HTMLElementTagNameMap {
    'metro-info-bar': MetroInfoBar;
  }

  interface HTMLElementEventMap {
    'metro-dismiss': MetroDismissEvent;
  }
}
