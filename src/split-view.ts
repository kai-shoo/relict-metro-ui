import { LitElement, css, html, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroSplitDisplayMode = 'inline' | 'overlay' | 'compact-inline' | 'compact-overlay';
export type MetroPanePlacement = 'start' | 'end';

export class MetroSplitView extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    displayMode: { type: String, attribute: 'display-mode' },
    placement: { type: String },
    paneLabel: { type: String, attribute: 'pane-label' },
    toggleLabel: { type: String, attribute: 'toggle-label' },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      --_rail: var(--metro-split-compact-size, 3.25rem);
      --_pane: var(--metro-split-pane-size, 19rem);
    }
    .shell { position: relative; isolation: isolate; color: var(--_metro-fg); background: var(--_metro-bg); }
    .toggle {
      min-block-size: 2.75rem;
      padding-inline: var(--_metro-space);
      border: 2px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .body { position: relative; display: flex; min-inline-size: 0; min-block-size: 0; }
    .body[data-end] { flex-direction: row-reverse; }
    [hidden] { display: none; }
    .rail { flex: 0 0 var(--_rail); min-inline-size: 0; background: var(--_metro-chrome); }
    .pane {
      box-sizing: border-box;
      flex: 0 0 min(100%, var(--_pane));
      max-inline-size: min(100%, var(--_pane));
      background: var(--_metro-chrome);
    }
    .content { flex: 1; min-inline-size: 0; }
    .body[data-overlay] .pane {
      position: absolute;
      z-index: 2;
      inset-block: 0;
      inset-inline-start: 0;
      inline-size: min(100%, var(--_pane));
      overflow: auto;
    }
    .body[data-overlay][data-end] .pane { inset-inline: auto 0; }
    .scrim {
      position: absolute;
      z-index: 1;
      inset: 0;
      border: 0;
      background: var(--metro-split-scrim, #0008);
    }
    :is(.pane, .toggle):focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
  `];

  declare open: boolean;
  declare displayMode: MetroSplitDisplayMode;
  declare placement: MetroPanePlacement;
  declare paneLabel: string;
  declare toggleLabel: string;

  #trigger?: HTMLElement;
  #restoreFocus = false;
  #focusPart?: 'pane' | 'toggle';

  constructor() {
    super();
    this.open = false;
    this.displayMode = 'inline';
    this.placement = 'start';
    this.paneLabel = 'Pane';
    this.toggleLabel = 'Toggle pane';
  }

  showPane(trigger?: HTMLElement): boolean {
    if (this.open) return false;
    this.#trigger = trigger;
    this.open = true;
    this.#announce();
    return true;
  }

  closePane(): boolean {
    if (!this.open) return false;
    this.#restoreFocus = true;
    this.open = false;
    this.#announce();
    return true;
  }

  #announce() {
    this.dispatchEvent(new CustomEvent('metro-pane-change', {
      detail: { open: this.open }, bubbles: true, composed: true,
    }));
  }

  get #overlay() { return this.displayMode === 'overlay' || this.displayMode === 'compact-overlay'; }
  get #compact() { return this.displayMode === 'compact-overlay' || this.displayMode === 'compact-inline'; }

  protected override willUpdate(changes: PropertyValues<this>): void {
    const paneHasFocus = this.shadowRoot?.querySelector('.pane:focus-within');
    const railHasFocus = this.shadowRoot?.querySelector('.rail:focus-within');
    if (changes.has('open') && !this.open && paneHasFocus) this.#restoreFocus = true;
    if (this.open && this.#overlay && !paneHasFocus) {
      const layoutHidesFocus = changes.has('displayMode')
        && (railHasFocus || this.shadowRoot?.querySelector('.content:focus-within'));
      if (changes.has('open') || layoutHidesFocus) this.#focusPart = 'pane';
    } else if (railHasFocus && (!this.#compact || this.open)) {
      this.#focusPart = 'toggle';
    }
  }

  protected override updated(): void {
    if (this.#focusPart) {
      this.shadowRoot?.querySelector<HTMLElement>(`.${this.#focusPart}`)?.focus({ preventScroll: true });
      this.#focusPart = undefined;
    }
    if (!this.open) {
      if (this.#restoreFocus) {
        if (this.#trigger?.isConnected) this.#trigger.focus({ preventScroll: true });
        if (!this.#trigger?.matches(':focus-within')) {
          this.shadowRoot?.querySelector<HTMLElement>('.toggle')?.focus({ preventScroll: true });
        }
      }
      this.#trigger = undefined;
    }
    this.#restoreFocus = false;
  }

  #escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.#overlay || !this.closePane()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  protected override render() {
    return html`
      <div class="shell" @keydown=${this.#escape}>
        <button type="button" class="toggle" part="toggle" aria-expanded=${this.open} aria-controls="pane"
          @click=${(event: Event) => this.open ? this.closePane() : this.showPane(event.currentTarget as HTMLElement)}>
          ${this.toggleLabel || 'Toggle pane'}
        </button>
        <div class="body" part="body" ?data-overlay=${this.#overlay} ?data-end=${this.placement === 'end'}>
          <div class="rail" part="compact" ?hidden=${!this.#compact || (this.open && !this.#overlay)}
            ?inert=${this.open && this.#overlay}><slot name="compact"></slot></div>
          <aside id="pane" class="pane" part="pane" tabindex="-1" aria-label=${this.paneLabel || 'Pane'} ?hidden=${!this.open}>
            <slot name="pane"></slot>
          </aside>
          <div class="content" part="content" ?inert=${this.open && this.#overlay}><slot></slot></div>
          ${this.open && this.#overlay ? html`
            <div class="scrim" part="scrim" aria-hidden="true" @click=${() => this.closePane()}></div>
          ` : null}
        </div>
      </div>
    `;
  }
}

defineElement('metro-split-view', MetroSplitView);

declare global {
  interface HTMLElementTagNameMap { 'metro-split-view': MetroSplitView; }
  interface HTMLElementEventMap { 'metro-pane-change': CustomEvent<{ open: boolean }>; }
}
