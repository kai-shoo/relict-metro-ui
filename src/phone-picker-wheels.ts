import { css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { shiftedColumnValue, type MetroDateTimeColumn, type PhoneDateTimeColumn } from './phone-date-time.js';

const offsets = [-2, -1, 0, 1, 2] as const;
type WheelChange = (id: MetroDateTimeColumn, amount: number | 'first' | 'last') => void;

export const phonePickerStyles = css`
  .phone-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
    text-align: start;
    cursor: pointer;
  }
  .phone-trigger:disabled, .phone-trigger[aria-disabled="true"] { cursor: default; }
  .phone-trigger.input:enabled { color: var(--metro-picker-fg, var(--_metro-fg)); }
  .phone-trigger.input:active:enabled:not([aria-disabled="true"]) {
    background: var(--_metro-accent);
    border-color: var(--_metro-accent);
    color: var(--_metro-on-accent);
  }
  .phone-trigger[aria-disabled="true"]:enabled { color: var(--_metro-muted); }
  .phone-trigger-icon {
    flex: none;
    inline-size: .55rem;
    block-size: .55rem;
    margin: -.25rem .375rem 0 0;
    border-inline-end: 2px solid currentColor;
    border-block-end: 2px solid currentColor;
    transform: rotate(45deg);
  }
  .phone-page {
    box-sizing: border-box;
    position: fixed;
    inset: 0;
    inline-size: 100%;
    max-inline-size: 100%;
    block-size: 100dvh;
    max-block-size: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: var(--_metro-chrome);
    color: var(--_metro-fg);
    font-family: var(--_metro-font);
    overflow: hidden;
  }
  .phone-page:popover-open {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .phone-page-scroll { overflow: auto; overscroll-behavior: contain; }
  .phone-page-content {
    box-sizing: border-box;
    max-inline-size: 42rem;
    margin-inline: auto;
    padding: clamp(.75rem, 4vi, 1.5rem);
    padding-block-start: clamp(.75rem, 5dvh, 2rem);
  }
  .phone-title {
    margin: 0 0 .75rem;
    font-size: clamp(1.25rem, 5vi, 1.5rem);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .phone-app-bar {
    display: flex;
    justify-content: center;
    gap: .5rem;
    padding: .25rem .75rem max(.25rem, env(safe-area-inset-bottom));
    background: var(--metro-command-bar-bg, var(--_metro-chrome));
    border-block-start: 1px solid var(--_metro-border);
  }
  .phone-action {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: .125rem;
    flex: 0 1 8rem;
    min-inline-size: 0;
    min-block-size: 44px;
    padding: .125rem;
    border: 0;
    background: transparent;
    color: inherit;
    font: 600 .833rem / 1.2 var(--_metro-font);
    overflow-wrap: anywhere;
    cursor: pointer;
  }
  .phone-action:disabled { color: var(--_metro-disabled); cursor: default; }
  .phone-action:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
  .phone-action metro-icon {
    box-sizing: border-box;
    inline-size: 2rem;
    block-size: 2rem;
    padding: .375rem;
    border: 2px solid currentColor;
    border-radius: 50%;
  }
  .phone-wheels {
    display: flex;
    gap: .375rem;
    overflow-x: auto;
    padding-block: .125rem;
    scroll-padding-inline: .125rem;
  }
  .phone-column {
    --_wheel-cell: clamp(3.25rem, 18dvh, 9.25rem);
    flex: 1 0 max(3.85rem, calc((100% - .75rem) / 3));
    min-inline-size: 0;
  }
  .phone-wheels:not(:has(.phone-column:nth-child(3))) .phone-column {
    flex-basis: max(3.25rem, calc((100% - .375rem) / 2));
  }
  .wheel-name {
    display: block;
    margin-block-end: .375rem;
    color: var(--_metro-muted);
    font-size: .9rem;
    overflow-wrap: anywhere;
  }
  .wheel {
    block-size: calc(var(--_wheel-cell) * 3);
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    overflow-anchor: none;
    scrollbar-width: none;
    scroll-snap-type: y mandatory;
  }
  .wheel:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
  .wheel::before, .wheel::after { content: ''; display: block; block-size: var(--_wheel-cell); }
  .wheel-cell {
    box-sizing: border-box;
    display: flex;
    block-size: var(--_wheel-cell);
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    padding: .3rem;
    border: 3px solid var(--_metro-muted);
    line-height: 1;
    scroll-snap-align: center;
    overflow: hidden;
  }
  .wheel-cell[data-value] { cursor: pointer; }
  .wheel-cell:not([data-value]) { border-color: transparent; }
  .wheel-cell[data-offset="0"] {
    background: var(--_metro-accent);
    border-color: transparent;
    color: var(--_metro-on-accent);
  }
  .wheel-number { font-size: clamp(.875rem, 7vi, 3.375rem); font-weight: 600; }
  .wheel-caption { margin-block-start: .25rem; font-size: clamp(.75rem, 3vi, 1.25rem); }
  .phone-picker-error { min-block-size: 1lh; margin: .5rem 0 0; font-size: .9rem; }
  @media (forced-colors: active) {
    .wheel-cell[data-offset="0"] { forced-color-adjust: none; background: Highlight; color: HighlightText; }
  }
`;

export class PhonePickerWheels {
  #timers = new Map<HTMLElement, number>();
  #changes: WheelChange;

  constructor(changes: WheelChange) {
    this.#changes = changes;
  }

  #stop(wheel: HTMLElement) {
    const timer = this.#timers.get(wheel);
    if (timer === undefined) return;
    wheel.ownerDocument.defaultView?.clearTimeout(timer);
    this.#timers.delete(wheel);
  }

  clear() {
    for (const wheel of this.#timers.keys()) this.#stop(wheel);
  }

  #metrics(wheel: HTMLElement) {
    const selected = wheel.querySelector<HTMLElement>('[data-offset="0"]');
    if (!selected) return undefined;
    const cell = selected.getBoundingClientRect();
    if (!cell.height) return undefined;
    const center = wheel.scrollTop + cell.top - wheel.getBoundingClientRect().top + (cell.height - wheel.clientHeight) / 2;
    return { center, cellHeight: cell.height };
  }

  #align(wheel: HTMLElement) {
    const center = this.#metrics(wheel)?.center;
    if (center !== undefined && Math.abs(wheel.scrollTop - center) > 1) wheel.scrollTop = center;
  }

  centerAll(root: ParentNode) {
    for (const wheel of root.querySelectorAll<HTMLElement>('.wheel')) this.#align(wheel);
  }

  settleAll(root: ParentNode) {
    for (const wheel of root.querySelectorAll<HTMLElement>('.wheel')) this.#settle(wheel);
  }

  #settle(wheel: HTMLElement) {
    this.#stop(wheel);
    const metrics = this.#metrics(wheel);
    if (!metrics) return;
    const offset = Math.round((wheel.scrollTop - metrics.center) / metrics.cellHeight);
    if (offset) this.#changes(wheel.dataset.column as MetroDateTimeColumn, offset);
    this.#align(wheel);
  }

  #scroll = (event: Event) => {
    const wheel = event.currentTarget as HTMLElement;
    // Let native scrolling and snapping finish before changing the staged value.
    if (Reflect.has(wheel, 'onscrollend')) return;
    const view = wheel.ownerDocument.defaultView;
    this.#stop(wheel);
    if (view) this.#timers.set(wheel, view.setTimeout(() => this.#settle(wheel), 140));
  };

  #scrollend = (event: Event) => this.#settle(event.currentTarget as HTMLElement);

  #keyboard(event: KeyboardEvent, column: PhoneDateTimeColumn) {
    const steps: Record<string, number | 'first' | 'last'> = {
      ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10, Home: 'first', End: 'last',
    };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const wheel = event.currentTarget as HTMLElement;
    this.#settle(wheel);
    this.#changes(column.id, step);
  }

  #click(event: MouseEvent, column: PhoneDateTimeColumn, offset: number) {
    if (!offset) return;
    const wheel = (event.currentTarget as HTMLElement).closest<HTMLElement>('.wheel');
    if (!wheel) return;
    this.#stop(wheel);
    this.#align(wheel);
    this.#changes(column.id, offset);
  }

  render(columns: readonly PhoneDateTimeColumn[]) {
    return html`<div class="phone-wheels" part="wheels">
      ${repeat(columns, column => column.id, column => html`
        <div class="phone-column" part="column">
          <span class="wheel-name" id="wheel-${column.id}" part="column-label">${column.name}</span>
          <div class="wheel" part="wheel" data-column=${column.id} role="spinbutton" tabindex="0"
            aria-labelledby="wheel-${column.id}" aria-valuemin=${column.min} aria-valuemax=${column.max}
            aria-valuenow=${column.value} aria-valuetext=${[column.number(column.value), column.caption?.(column.value)].filter(Boolean).join(' ')}
            @keydown=${(event: KeyboardEvent) => this.#keyboard(event, column)} @scroll=${this.#scroll} @scrollend=${this.#scrollend}>
            ${offsets.map(offset => {
              const value = shiftedColumnValue(column, offset);
              return html`<div class="wheel-cell" part=${offset === 0 ? 'cell selected-cell' : 'cell'} aria-hidden="true"
                data-offset=${offset} data-value=${ifDefined(value)}
                @click=${value === undefined ? null : (event: MouseEvent) => this.#click(event, column, offset)}>
                ${value === undefined ? null : html`<span class="wheel-number">${column.number(value)}</span>
                  ${column.caption ? html`<span class="wheel-caption">${column.caption(value)}</span>` : null}`}
              </div>`;
            })}
          </div>
        </div>
      `)}
    </div>`;
  }
}
