import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import './icon.js';
import { requestNotificationActivation, type MetroNotification } from './notification-data.js';
import { metroTheme } from './theme.js';
export type { MetroNotification, MetroNotificationActivation, MetroNotificationDismissal } from './notification-data.js';

export class MetroToast extends LitElement {
  static override properties = {
    notification: { attribute: false },
    duration: { type: Number },
    label: { type: String },
    openLabel: { type: String, attribute: 'open-label' },
    dismissLabel: { type: String, attribute: 'dismiss-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }
    aside {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      align-items: start;
      inline-size: min(100%, var(--metro-toast-width, 30rem));
      padding: .65rem min(var(--_metro-space), 4%);
      box-sizing: border-box;
      background: var(--metro-toast-background, var(--_metro-chrome));
      border-block-start: 3px solid var(--_metro-accent);
      overflow-wrap: anywhere;
    }
    .content { display: flex; flex: 1 1 11rem; min-inline-size: 0; align-items: start; gap: min(.5rem, 4%); }
    .content > metro-icon { flex: none; font-size: min(1rem, 24px); }
    .body { min-inline-size: 0; }
    p { margin: .125rem 0 .25rem; }
    .source { color: var(--_metro-muted); font-size: .875rem; }
    button, a {
      min-block-size: 2.75rem;
      display: inline-grid;
      align-items: center;
      color: inherit;
    }
    button {
      min-inline-size: 2.75rem;
      place-items: center;
      border: 0;
      border-radius: 0;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    [part="dismiss"] { flex: none; margin-inline-start: auto; }
    a:focus-visible, button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    @media (forced-colors: active) { aside { border: 1px solid CanvasText; } }
  `];

  declare notification: MetroNotification | null;
  declare duration: number;
  declare label: string;
  declare openLabel: string;
  declare dismissLabel: string;

  #timer?: number;
  #started = 0;
  #remaining = 0;
  #source: { notification: MetroNotification; element: HTMLElement } | null = null;
  #hover = false;
  #visibility?: AbortController;
  #activationHadFocus = false;

  constructor() {
    super();
    this.notification = null;
    this.duration = 5500;
    this.label = 'Notification';
    this.openLabel = 'Open';
    this.dismissLabel = 'Dismiss notification';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#visibility = new AbortController();
    this.ownerDocument.addEventListener('visibilitychange', this.#schedule, { signal: this.#visibility.signal });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#visibility?.abort();
    this.#pause();
    this.#hover = false;
    super.disconnectedCallback();
  }

  show(notification: MetroNotification, source?: HTMLElement): void {
    if (notification === this.notification) {
      this.#pause();
      this.#remaining = this.duration;
      this.#schedule();
    }
    this.#source = source ? { notification, element: source } : null;
    this.notification = notification;
  }

  dismiss(): boolean { return this.#finish('dismiss'); }

  #finish(reason: 'dismiss' | 'timeout' | 'activate'): boolean {
    const notification = this.notification;
    if (!notification) return false;
    this.#pause();
    const source = this.#source?.notification === notification && this.matches(':focus-within')
      ? this.#source.element : null;
    this.#source = null;
    this.#hover = false;
    this.notification = null;
    if (source?.isConnected) source.focus({ preventScroll: true });
    this.dispatchEvent(new CustomEvent('metro-notification-dismiss', {
      detail: { id: notification.id, notification, reason, surface: 'toast' }, bubbles: true, composed: true,
    }));
    return true;
  }

  #pause(): void {
    if (this.#timer === undefined) return;
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#remaining = Math.max(0, this.#remaining - (performance.now() - this.#started));
  }

  #schedule = () => {
    this.#pause();
    const notification = this.notification;
    if (!notification || !this.isConnected || this.ownerDocument.hidden || this.#hover
      || this.matches(':focus-within') || !Number.isFinite(this.duration) || this.duration <= 0) return;
    this.#started = performance.now();
    const wait = Math.min(this.#remaining, 2_147_483_647);
    this.#timer = this.ownerDocument.defaultView?.setTimeout(() => {
      this.#timer = undefined;
      this.#remaining = Math.max(0, this.#remaining - wait);
      if (this.notification !== notification) return;
      if (this.#remaining > 0) this.#schedule();
      else this.#finish('timeout');
    }, wait);
  };

  #activate(event: MouseEvent, notification: MetroNotification) {
    if (requestNotificationActivation(this, notification, 'toast', event) && this.notification === notification) {
      this.#finish('activate');
    }
  }

  protected override willUpdate(changes: PropertyValues<this>): void {
    this.#activationHadFocus = changes.has('notification') && this.notification !== null
      && this.shadowRoot?.activeElement?.matches('[part="activate"]') === true;
  }

  protected override updated(changes: PropertyValues<this>): void {
    if (changes.has('notification') || changes.has('duration')) {
      this.#pause();
      this.#remaining = this.duration;
      if (this.#source?.notification !== this.notification) this.#source = null;
      if (!this.notification) {
        this.#hover = false;
      }
    }
    if (this.#activationHadFocus && this.ownerDocument.activeElement === this.ownerDocument.body) {
      const target = this.shadowRoot?.querySelector<HTMLElement>('[part="activate"], [part="dismiss"]');
      target?.focus({ preventScroll: true });
    }
    this.#schedule();
  }

  protected override render() {
    const notification = this.notification;
    if (!notification) return nothing;
    return html`
      <aside part="surface" aria-label=${this.label || 'Notification'}
        @pointerenter=${(event: PointerEvent) => { if (event.pointerType !== 'touch') { this.#hover = true; this.#pause(); } }}
        @pointerleave=${() => { this.#hover = false; this.#schedule(); }}
        @focusin=${() => this.#pause()} @focusout=${() => queueMicrotask(this.#schedule)}>
        <div class="content">
          ${notification.icon ? html`<metro-icon part="icon" name=${notification.icon}></metro-icon>` : nothing}
          <div class="body" part="body">
            <div role="status">
              ${notification.source ? html`<div class="source">${notification.source}</div>` : nothing}
              <strong part="title">${notification.title}</strong>
              ${notification.message ? html`<p part="message">${notification.message}</p>` : nothing}
            </div>
            ${notification.href ? html`
              <a part="activate" href=${notification.href} @click=${(event: MouseEvent) => this.#activate(event, notification)}>
                ${this.openLabel}
              </a>
            ` : notification.destination !== undefined ? html`
              <button type="button" part="activate" @click=${(event: MouseEvent) => this.#activate(event, notification)}>
                ${this.openLabel}
              </button>
            ` : nothing}
          </div>
        </div>
        <button type="button" part="dismiss" aria-label=${this.dismissLabel || 'Dismiss notification'} @click=${() => this.dismiss()}>
          <metro-icon name="close"></metro-icon>
        </button>
      </aside>
    `;
  }
}

defineElement('metro-toast', MetroToast);

declare global {
  interface HTMLElementTagNameMap { 'metro-toast': MetroToast; }
}
