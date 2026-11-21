import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './icon.js';
import { requestNotificationActivation, type MetroNotification } from './notification-data.js';
import { metroTheme } from './theme.js';
export type { MetroNotification, MetroNotificationActivation, MetroNotificationDismissal } from './notification-data.js';

export class MetroNotificationCenter extends LitElement {
  static override properties = {
    notifications: { attribute: false },
    heading: { type: String },
    emptyLabel: { type: String, attribute: 'empty-label' },
    openLabel: { type: String, attribute: 'open-label' },
    clearLabel: { type: String, attribute: 'clear-label' },
    dismissLabel: { type: String, attribute: 'dismiss-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); background: var(--_metro-bg); }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      padding: var(--_metro-space) min(var(--_metro-space), 4%);
      gap: .5rem;
      container-type: inline-size;
    }
    h2 { font-size: min(clamp(1.5rem, 5vi, 2rem), max(1.25rem, 15cqi)); font-weight: 300; margin: 0; overflow-wrap: anywhere; }
    ol { list-style: none; margin: 0; padding: 0; }
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: start;
      gap: .5rem;
      border-block-start: 1px solid var(--_metro-border);
      padding: var(--_metro-space) min(var(--_metro-space), 4%);
      overflow-wrap: anywhere;
    }
    li[data-unread] { border-inline-start: 3px solid var(--_metro-accent); }
    .content { display: flex; flex: 1 1 11rem; min-inline-size: 0; align-items: start; gap: min(.5rem, 4%); }
    .content > metro-icon { flex: none; font-size: min(1rem, 24px); }
    [part="body"] { min-inline-size: 0; }
    [part="dismiss"] { flex: none; margin-inline-start: auto; }
    [part="clear"] { max-inline-size: 100%; overflow-wrap: anywhere; }
    p { margin-block: .15rem; }
    .source { color: var(--_metro-muted); }
    .empty { padding: var(--_metro-space); }
    button, a {
      display: inline-grid;
      align-items: center;
      color: inherit;
      min-block-size: 2.75rem;
    }
    button {
      min-inline-size: 2.75rem;
      place-items: center;
      background: transparent;
      border: 0;
      border-radius: 0;
      font: inherit;
      cursor: pointer;
    }
    :is(a, button, h2):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
  `];

  declare notifications: readonly MetroNotification[];
  declare heading: string;
  declare emptyLabel: string;
  declare openLabel: string;
  declare clearLabel: string;
  declare dismissLabel: string;

  #records: MetroNotification[] = [];
  #restore?: { control: HTMLElement; key?: string; index: number; part: 'activate' | 'dismiss' };

  constructor() {
    super();
    this.notifications = [];
    this.heading = 'Notifications';
    this.emptyLabel = 'No notifications';
    this.openLabel = 'Open';
    this.clearLabel = 'Clear all';
    this.dismissLabel = 'Dismiss';
  }

  #dismiss(notification: MetroNotification): void {
    this.dispatchEvent(new CustomEvent('metro-notification-dismiss', {
      detail: { id: notification.id, notification, reason: 'dismiss', surface: 'center' }, bubbles: true, composed: true,
    }));
  }

  #clear = () => {
    this.dispatchEvent(new CustomEvent('metro-notifications-clear', {
      detail: { ids: this.#records.map(notification => notification.id) }, bubbles: true, composed: true,
    }));
  };

  protected override willUpdate(): void {
    const active = this.shadowRoot?.activeElement;
    const activeRow = active?.closest<HTMLElement>('li');
    const previous = this.#records;
    const seen = new Set<string>();
    this.#records = this.notifications.filter(record => {
      if (!record.id || seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    });
    this.#restore = undefined;
    if (active instanceof HTMLElement && activeRow) {
      const key = activeRow.dataset.key;
      this.#restore = { control: active, key, index: previous.findIndex(record => record.id === key),
        part: active.getAttribute('part') === 'activate' ? 'activate' : 'dismiss' };
    } else if (active instanceof HTMLElement && active.getAttribute('part') === 'clear' && !this.#records.length) {
      this.#restore = { control: active, index: 0, part: 'dismiss' };
    }
  }

  protected override updated(): void {
    const restore = this.#restore;
    this.#restore = undefined;
    const root = this.shadowRoot;
    if (!restore || !root) return;
    if (root.activeElement === restore.control) {
      if (this.#records[restore.index]?.id !== restore.key) {
        restore.control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      return;
    }
    if (this.ownerDocument.activeElement !== this.ownerDocument.body) return;
    const rows = Array.from(root.querySelectorAll<HTMLLIElement>('li'));
    const keyed = rows.find(row => row.dataset.key === restore.key);
    const nearby = rows[Math.max(0, Math.min(restore.index, rows.length - 1))];
    const target = keyed?.querySelector<HTMLElement>(`[part="${restore.part}"]`)
      ?? (keyed ?? nearby)?.querySelector<HTMLElement>('[part="dismiss"]')
      ?? root.querySelector<HTMLElement>('h2');
    target?.focus({ preventScroll: true });
    if (root.activeElement === target) target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  protected override render() {
    return html`
      <section part="surface" aria-labelledby="heading">
        <div class="header" part="header">
          <h2 id="heading" tabindex="-1" part="heading">${this.heading || 'Notifications'}</h2>
          ${this.#records.length ? html`
            <button type="button" part="clear" @click=${this.#clear}>${this.clearLabel}</button>
          ` : nothing}
        </div>
        ${this.#records.length ? html`
          <ol part="list" role="list">${repeat(this.#records, notification => notification.id, notification => {
            const activate = (event: MouseEvent) => requestNotificationActivation(this, notification, 'center', event);
            return html`
              <li part="item" data-key=${notification.id} ?data-unread=${!notification.read}>
                <div class="content">
                  ${notification.icon ? html`<metro-icon part="icon" name=${notification.icon}></metro-icon>` : nothing}
                  <div part="body">
                    ${notification.source ? html`<div class="source">${notification.source}</div>` : nothing}
                    <strong part="title">${notification.title}</strong>
                    ${notification.message ? html`<p part="message">${notification.message}</p>` : nothing}
                    ${notification.href ? html`
                      <a part="activate" href=${notification.href} aria-label=${`${this.openLabel} ${notification.title}`} @click=${activate}>
                        ${this.openLabel}
                      </a>
                    ` : notification.destination !== undefined ? html`
                      <button type="button" part="activate" aria-label=${`${this.openLabel} ${notification.title}`} @click=${activate}>
                        ${this.openLabel}
                      </button>
                    ` : nothing}
                  </div>
                </div>
                <button type="button" part="dismiss" aria-label=${`${this.dismissLabel} ${notification.title}`}
                  @click=${() => this.#dismiss(notification)}><metro-icon name="close"></metro-icon></button>
              </li>
            `;
          })}</ol>
        ` : html`<div class="empty" part="empty"><slot name="empty">${this.emptyLabel}</slot></div>`}
      </section>
    `;
  }
}

defineElement('metro-notification-center', MetroNotificationCenter);

declare global {
  interface HTMLElementTagNameMap { 'metro-notification-center': MetroNotificationCenter; }
  interface HTMLElementEventMap { 'metro-notifications-clear': CustomEvent<{ ids: readonly string[] }>; }
}
