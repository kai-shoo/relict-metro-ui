import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';
import './icon.js';
import { metroTheme } from './theme.js';

export type MetroWindowAction = 'minimize' | 'maximize' | 'restore' | 'close';
export type MetroWindowAdapter = Partial<Record<MetroWindowAction, () => void | Promise<void>>>;

interface Overlay extends EventTarget { readonly visible: boolean; }

const defaults: Record<MetroWindowAction, string> = {
  minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore', close: 'Close window',
};
const icons = { minimize: 'minus', maximize: 'fullscreen', restore: 'fullscreen', close: 'close' } as const;
const pendingKey = (action: MetroWindowAction) => action === 'restore' ? 'maximize' : action;

export class MetroTitleBar extends LitElement {
  static override properties = {
    heading: { type: String },
    label: { type: String },
    maximized: { type: Boolean, reflect: true },
    overlay: { type: Boolean, reflect: true },
    windowAdapter: { attribute: false },
    actionLabels: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem;
      min-block-size: 2.75rem;
      padding-inline-start: var(--_metro-space);
      box-sizing: border-box;
      background: var(--metro-title-bar-background, var(--_metro-chrome));
    }
    .title {
      flex: 1 1 min(8ch, 100%);
      min-inline-size: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 1.125rem;
      font-weight: 300;
    }
    .controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      min-inline-size: 0;
      max-inline-size: 100%;
      margin-inline-start: auto;
    }
    .controls slot::slotted(*) { max-inline-size: 100%; overflow-wrap: anywhere; }
    button {
      box-sizing: border-box;
      min-block-size: 44px;
      min-inline-size: 44px;
      padding: .25em;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:not([aria-disabled="true"]):hover { background: color-mix(in srgb, currentColor 12%, transparent); }
    button[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
    .bar[data-overlay] {
      flex-wrap: nowrap;
      inline-size: env(titlebar-area-width, 100%);
      min-block-size: env(titlebar-area-height, 2.75rem);
      margin-left: env(titlebar-area-x, 0px);
      -webkit-app-region: drag;
      app-region: drag;
    }
    .bar[data-overlay] .controls { flex-wrap: nowrap; -webkit-app-region: no-drag; app-region: no-drag; }
  `];

  declare heading: string;
  declare label: string;
  declare maximized: boolean;
  declare overlay: boolean;
  declare windowAdapter: MetroWindowAdapter | null;
  declare actionLabels: Partial<Record<MetroWindowAction, string>>;

  #capability?: Overlay;
  #subscription?: AbortController;
  #pending = new Set<MetroWindowAction>();

  constructor() {
    super();
    this.heading = '';
    this.label = 'Window actions';
    this.maximized = false;
    this.overlay = false;
    this.windowAdapter = null;
    this.actionLabels = {};
  }

  get overlayVisible() { return this.overlay && Boolean(this.#capability?.visible); }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#subscription = new AbortController();
    const navigator = this.ownerDocument.defaultView?.navigator as (Navigator & {
      windowControlsOverlay?: Overlay;
    }) | undefined;
    this.#capability = navigator?.windowControlsOverlay;
    this.#capability?.addEventListener('geometrychange', () => this.requestUpdate(), { signal: this.#subscription.signal });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#subscription?.abort();
    this.#capability = undefined;
    super.disconnectedCallback();
  }

  async invoke(action: MetroWindowAction): Promise<boolean> {
    const adapter = this.windowAdapter;
    const operation = adapter?.[action];
    const key = pendingKey(action);
    if (!operation || this.#pending.has(key)) return false;
    this.#pending.add(key);
    this.requestUpdate();
    try {
      if (!this.dispatchEvent(new CustomEvent('metro-window-action', {
        detail: { action }, cancelable: true, bubbles: true, composed: true,
      }))) return false;
      await operation.call(adapter);
      return true;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('metro-window-action-error', {
        detail: { action, error }, bubbles: true, composed: true,
      }));
      return false;
    } finally {
      this.#pending.delete(key);
      this.requestUpdate();
    }
  }

  protected override render() {
    const actions = ['minimize', this.maximized ? 'restore' : 'maximize', 'close'] as const;
    return html`
      <div class="bar" part="bar" ?data-overlay=${this.overlayVisible}>
        <slot name="start"></slot>
        <div class="title" part="title"><slot>${this.heading}</slot></div>
        <div class="controls" part="controls" role="group" aria-label=${this.label || 'Window actions'}>
          <slot name="actions"></slot>
          ${actions.map(action => this.windowAdapter?.[action] ? html`
            <button type="button" part="action" aria-label=${this.actionLabels[action] || defaults[action]}
              aria-disabled=${this.#pending.has(pendingKey(action)) ? 'true' : nothing}
              @click=${() => void this.invoke(action)}>
              <metro-icon name=${icons[action]}></metro-icon>
            </button>
          ` : nothing)}
        </div>
      </div>
    `;
  }
}

defineElement('metro-title-bar', MetroTitleBar);

declare global {
  interface HTMLElementTagNameMap { 'metro-title-bar': MetroTitleBar; }
  interface HTMLElementEventMap {
    'metro-window-action': CustomEvent<{ action: MetroWindowAction }>;
    'metro-window-action-error': CustomEvent<{ action: MetroWindowAction; error: unknown }>;
  }
}
