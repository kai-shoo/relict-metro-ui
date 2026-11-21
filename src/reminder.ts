import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { metroTheme } from './theme.js';

export type MetroReminderState = 'scheduled' | 'due' | 'snoozed' | 'dismissed' | 'missed' | 'unavailable';
export type MetroReminderAction = 'open' | 'snooze' | 'dismiss';
export interface MetroReminderActionDetail {
  id: string;
  action: MetroReminderAction;
  scheduledAt: string;
  snoozeMinutes?: number;
}

const labels: Readonly<Record<MetroReminderState, string>> = {
  scheduled: 'Scheduled',
  due: 'Due',
  snoozed: 'Snoozed',
  dismissed: 'Dismissed',
  missed: 'Missed',
  unavailable: 'Unavailable',
};

export class MetroReminder extends LitElement {
  static override properties = {
    reminderId: { type: String, attribute: 'reminder-id' },
    heading: { type: String },
    message: { type: String },
    scheduledAt: { type: String, attribute: 'scheduled-at' },
    timeText: { type: String, attribute: 'time-text' },
    locale: { type: String },
    state: { type: String, reflect: true },
    stateLabel: { type: String, attribute: 'state-label' },
    pending: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    snoozeMinutes: { type: Number, attribute: 'snooze-minutes' },
    openLabel: { type: String, attribute: 'open-label' },
    snoozeLabel: { type: String, attribute: 'snooze-label' },
    dismissLabel: { type: String, attribute: 'dismiss-label' },
    hideOpen: { type: Boolean, attribute: 'hide-open' },
    hideSnooze: { type: Boolean, attribute: 'hide-snooze' },
    hideDismiss: { type: Boolean, attribute: 'hide-dismiss' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; container-type: inline-size; color: var(--_metro-fg); }
    .surface {
      box-sizing: border-box;
      min-inline-size: 0;
      padding-block: var(--_metro-space);
      padding-inline: min(var(--_metro-space), 6.5cqi);
      border-block-start: .25rem solid var(--metro-reminder-accent, var(--_metro-accent));
      background: var(--metro-reminder-bg, var(--_metro-chrome));
      color: var(--metro-reminder-fg, var(--_metro-fg));
    }
    header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .25rem 1rem; }
    h2 { margin: 0; font-size: clamp(1rem, 9.3cqi, 1.75rem); line-height: 1.15; font-weight: 400; overflow-wrap: anywhere; }
    .time, .status { margin: 0; color: var(--_metro-muted); font-size: 1.0625rem; overflow-wrap: anywhere; }
    .status { scroll-margin-block: 4px; }
    .status:not(:empty) { margin-block-start: .375rem; }
    .message { margin-block-start: .375rem; overflow-wrap: anywhere; font-size: 1.125rem; }
    .actions { display: flex; flex-wrap: wrap; gap: .375rem; margin-block-start: .75rem; }
    button {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem min(.625rem, 3cqi);
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 600 1.0625rem / 1.2 var(--_metro-font);
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button:active:enabled:not([aria-disabled="true"]) { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    button:disabled, button[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }
    :is(button, .status):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    @media (forced-colors: active) {
      .surface { border-color: Highlight; }
      :is(button, .status):focus-visible { outline-color: Highlight; }
    }
  `];

  declare reminderId: string;
  declare heading: string;
  declare message: string;
  declare scheduledAt: string;
  declare timeText: string;
  declare locale: string;
  declare state: MetroReminderState;
  declare stateLabel: string;
  declare pending: boolean;
  declare disabled: boolean;
  declare snoozeMinutes: number | null;
  declare openLabel: string;
  declare snoozeLabel: string;
  declare dismissLabel: string;
  declare hideOpen: boolean;
  declare hideSnooze: boolean;
  declare hideDismiss: boolean;

  constructor() {
    super();
    this.reminderId = '';
    this.heading = 'Reminder';
    this.message = '';
    this.scheduledAt = '';
    this.timeText = '';
    this.locale = '';
    this.state = 'due';
    this.stateLabel = '';
    this.pending = false;
    this.disabled = false;
    this.snoozeMinutes = null;
    this.openLabel = 'Open';
    this.snoozeLabel = 'Snooze';
    this.dismissLabel = 'Dismiss';
    this.hideOpen = false;
    this.hideSnooze = false;
    this.hideDismiss = false;
  }

  #date(): Date | null {
    if (!this.scheduledAt) return null;
    const date = new Date(this.scheduledAt);
    return Number.isFinite(date.valueOf()) ? date : null;
  }

  #time(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
    const locale = this.locale || this.closest('[lang]')?.getAttribute('lang') || this.ownerDocument.documentElement.lang;
    try {
      return new Intl.DateTimeFormat(locale || undefined, options).format(date);
    } catch {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    }
  }

  #activate(action: MetroReminderAction): void {
    if (this.disabled || this.pending || !this.reminderId.trim()) return;
    const minutes = this.snoozeMinutes;
    this.dispatchEvent(new CustomEvent<MetroReminderActionDetail>('metro-reminder-action', {
      detail: {
        id: this.reminderId, action, scheduledAt: this.scheduledAt,
        ...(action === 'snooze' && typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
          && { snoozeMinutes: minutes }),
      },
      bubbles: true, composed: true,
    }));
  }

  #renderAction(action: MetroReminderAction, label: string) {
    return html`
      <button type="button" part=${action} ?disabled=${this.disabled || !this.reminderId.trim()}
        aria-disabled=${String(this.pending)} @click=${() => this.#activate(action)}>${label}</button>
    `;
  }

  protected override update(changed: PropertyValues<this>): void {
    const action = this.shadowRoot?.activeElement;
    super.update(changed);
    if (!(action instanceof HTMLButtonElement) || (action.isConnected && !action.disabled)) return;

    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (active && active !== this && active !== this.ownerDocument.body) return;
    const status = this.shadowRoot?.querySelector<HTMLElement>('.status');
    if (status && tryFocus(status)) {
      status.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  protected override render() {
    const date = this.#date();
    const time = this.timeText || (date ? this.#time(date) : '');
    const hasMessage = Boolean(this.message || Array.from(this.childNodes).some(node =>
      node instanceof Text ? Boolean(node.data.trim()) : node instanceof Element && !node.getAttribute('slot'),
    ));
    return html`
      <section class="surface" part="surface" aria-labelledby="heading" aria-busy=${String(this.pending)}>
        <header>
          <h2 id="heading" part="heading"><slot name="heading">${this.heading || 'Reminder'}</slot></h2>
          ${time ? date
            ? html`<time class="time" part="time" datetime=${this.scheduledAt}>${time}</time>`
            : html`<span class="time" part="time">${time}</span>`
          : nothing}
        </header>
        <p class="status" part="status" role="status" tabindex="-1">${this.stateLabel || labels[this.state] || ''}</p>
        <div class="message" part="message" ?hidden=${!hasMessage}>
          <slot @slotchange=${() => this.requestUpdate()}>${this.message}</slot>
        </div>
        ${this.hideOpen && this.hideSnooze && this.hideDismiss ? nothing : html`
          <div class="actions" part="actions">
            ${this.hideOpen ? nothing : this.#renderAction('open', this.openLabel)}
            ${this.hideSnooze ? nothing : this.#renderAction('snooze', this.snoozeLabel)}
            ${this.hideDismiss ? nothing : this.#renderAction('dismiss', this.dismissLabel)}
          </div>
        `}
      </section>
    `;
  }
}

defineElement('metro-reminder', MetroReminder);

declare global {
  interface HTMLElementTagNameMap { 'metro-reminder': MetroReminder }
  interface HTMLElementEventMap { 'metro-reminder-action': CustomEvent<MetroReminderActionDetail> }
}
