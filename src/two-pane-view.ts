import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroPanePriority = 'first' | 'second';
export type MetroPaneOrder = 'first-second' | 'second-first' | 'single';
export type MetroPaneMode = 'wide' | 'tall' | 'single';

export class MetroTwoPaneView extends LitElement {
  static override properties = {
    panePriority: { type: String, attribute: 'pane-priority' },
    wideMode: { type: String, attribute: 'wide-mode' },
    tallMode: { type: String, attribute: 'tall-mode' },
    minWideWidth: { type: Number, attribute: 'min-wide-width' },
    minTallHeight: { type: Number, attribute: 'min-tall-height' },
    firstLabel: { type: String, attribute: 'first-label' },
    secondLabel: { type: String, attribute: 'second-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; min-block-size: 0; }
    .layout { display: grid; block-size: 100%; color: var(--_metro-fg); background: var(--_metro-bg); }
    .layout[data-mode="wide"] {
      grid-template-columns: var(--metro-pane-first-size, minmax(0, 1fr)) var(--metro-pane-second-size, minmax(0, 1fr));
      grid-template-areas: "first second";
    }
    .layout[data-mode="wide"][data-reversed] {
      grid-template-columns: var(--metro-pane-second-size, minmax(0, 1fr)) var(--metro-pane-first-size, minmax(0, 1fr));
      grid-template-areas: "second first";
    }
    .layout[data-mode="tall"] {
      grid-template-rows: var(--metro-pane-first-size, minmax(0, 1fr)) var(--metro-pane-second-size, minmax(0, 1fr));
      grid-template-areas: "first" "second";
    }
    .layout[data-mode="tall"][data-reversed] {
      grid-template-rows: var(--metro-pane-second-size, minmax(0, 1fr)) var(--metro-pane-first-size, minmax(0, 1fr));
      grid-template-areas: "second" "first";
    }
    .layout[data-mode="single"][data-priority="first"] { grid-template-areas: "first"; }
    .layout[data-mode="single"][data-priority="second"] { grid-template-areas: "second"; }
    .first { grid-area: first; }
    .second { grid-area: second; }
    .pane { min-inline-size: 0; min-block-size: 0; overflow: auto; }
    .pane[hidden] { display: none; }
    .pane:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
  `];

  declare panePriority: MetroPanePriority;
  declare wideMode: MetroPaneOrder;
  declare tallMode: MetroPaneOrder;
  declare minWideWidth: number;
  declare minTallHeight: number;
  declare firstLabel: string;
  declare secondLabel: string;

  #mode?: MetroPaneMode;
  #focusPane?: MetroPanePriority;
  #watch = new ResizeObserver(() => {
    if (this.#fit() !== this.#mode) this.requestUpdate();
  });

  constructor() {
    super();
    this.panePriority = 'first';
    this.wideMode = 'first-second';
    this.tallMode = 'single';
    this.minWideWidth = 641;
    this.minTallHeight = 641;
    this.firstLabel = 'First pane';
    this.secondLabel = 'Second pane';
  }

  get mode(): MetroPaneMode { return this.#mode ?? 'single'; }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#watch.observe(this);
  }

  override disconnectedCallback(): void {
    this.#watch.disconnect();
    super.disconnectedCallback();
  }

  #fit(): MetroPaneMode {
    if (this.wideMode !== 'single' && this.clientWidth >= Math.max(1, this.minWideWidth || 641)) return 'wide';
    if (this.tallMode !== 'single' && this.clientHeight >= Math.max(1, this.minTallHeight || 641)) return 'tall';
    return 'single';
  }

  protected override willUpdate(): void {
    const priority = this.panePriority === 'second' ? 'second' : 'first';
    const next = this.#fit();
    if (next === 'single' && this.shadowRoot?.querySelector(`.pane:not(.${priority}):focus-within`)) {
      this.#focusPane = priority;
    }
  }

  protected override updated(): void {
    const next = this.shadowRoot?.querySelector<HTMLElement>('.layout')?.dataset.mode as MetroPaneMode;
    const previous = this.#mode;
    this.#mode = next;
    if (this.#focusPane) {
      this.shadowRoot?.querySelector<HTMLElement>(`.${this.#focusPane}`)?.focus({ preventScroll: true });
      this.#focusPane = undefined;
    }
    if (previous && next !== previous) {
      this.dispatchEvent(new CustomEvent('metro-layout-change', {
        detail: { mode: next }, bubbles: true, composed: true,
      }));
    }
  }

  protected override render() {
    const mode = this.#fit();
    const priority = this.panePriority === 'second' ? 'second' : 'first';
    const reversed = (mode === 'wide' ? this.wideMode : this.tallMode) === 'second-first';
    return html`
      <div class="layout" part="layout" data-mode=${mode} data-priority=${priority} ?data-reversed=${reversed}>
        <section class="pane first" part="first" tabindex="-1" aria-label=${this.firstLabel || 'First pane'}
          ?hidden=${mode === 'single' && priority !== 'first'}><slot name="first"></slot></section>
        <section class="pane second" part="second" tabindex="-1" aria-label=${this.secondLabel || 'Second pane'}
          ?hidden=${mode === 'single' && priority !== 'second'}><slot name="second"></slot></section>
      </div>
    `;
  }
}

defineElement('metro-two-pane-view', MetroTwoPaneView);

declare global {
  interface HTMLElementTagNameMap { 'metro-two-pane-view': MetroTwoPaneView; }
  interface HTMLElementEventMap { 'metro-layout-change': CustomEvent<{ mode: MetroPaneMode }>; }
}
