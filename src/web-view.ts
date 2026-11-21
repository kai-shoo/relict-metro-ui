import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { metroTheme } from './theme.js';

export type MetroWebState = 'empty' | 'loading' | 'ready' | 'error';

export interface MetroWebLoadDetail { url: string; documentAccessible: boolean; }
export interface MetroWebErrorDetail { url: string; message: string; }

export class MetroWebView extends LitElement {
  static override properties = {
    src: { type: String },
    label: { type: String },
    sandbox: { type: String },
    allow: { type: String },
    historyEnabled: { type: Boolean, attribute: 'history-enabled' },
    loadTimeout: { type: Number, attribute: 'load-timeout' },
    backLabel: { type: String, attribute: 'back-label' },
    forwardLabel: { type: String, attribute: 'forward-label' },
    retryLabel: { type: String, attribute: 'retry-label' },
    errorLabel: { type: String, attribute: 'error-label' },
  };

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    iframe {
      display: block;
      box-sizing: border-box;
      inline-size: 100%;
      block-size: var(--metro-web-view-height, min(48rem, 65dvh));
      border: 1px solid var(--_metro-border);
      background: var(--_metro-bg);
    }
    nav, .status {
      display: flex;
      column-gap: .5rem;
      row-gap: .25rem;
      flex-wrap: wrap;
      align-items: center;
      padding-block: .25rem;
      overflow-wrap: anywhere;
    }
    button {
      max-inline-size: 100%;
      border: 2px solid currentColor;
      border-radius: 0;
      min-block-size: 2.75rem;
      padding-inline: .75rem;
      color: inherit;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
  `];

  declare src: string;
  declare label: string;
  declare sandbox: string;
  declare allow: string;
  declare historyEnabled: boolean;
  declare loadTimeout: number;
  declare backLabel: string;
  declare forwardLabel: string;
  declare retryLabel: string;
  declare errorLabel: string;

  #entries: string[] = [];
  #index = -1;
  #request = 0;
  #requestedUrl = '';
  #configuredSource = '';
  #state: MetroWebState = 'empty';
  #error = '';
  #focusedControl?: HTMLElement;
  #focusRetry = false;
  #timer?: number;
  #links?: AbortController;

  constructor() {
    super();
    this.src = '';
    this.label = 'Document viewer';
    this.sandbox = 'allow-same-origin';
    this.allow = '';
    this.historyEnabled = false;
    this.loadTimeout = 15_000;
    this.backLabel = 'Back';
    this.forwardLabel = 'Forward';
    this.retryLabel = 'Retry';
    this.errorLabel = 'Document could not be opened';
  }

  get url() { return this.#entries[this.#index] || ''; }
  get state() { return this.#state; }
  get canGoBack() { return this.historyEnabled && this.#index > 0; }
  get canGoForward() { return this.historyEnabled && this.#index >= 0 && this.#index < this.#entries.length - 1; }
  get frame(): HTMLIFrameElement | null { return this.shadowRoot?.querySelector('iframe') ?? null; }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.#state === 'loading') this.#startTimer();
    if (this.#state === 'ready' && this.frame) this.#trackLinks(this.frame);
  }

  override disconnectedCallback(): void {
    this.#clearTimer();
    this.#links?.abort();
    super.disconnectedCallback();
  }

  navigate(address: string): boolean {
    if (this.src !== this.#configuredSource) this.#reset();
    const url = this.#normalize(address, this.url);
    if (!url) return false;
    if (url === this.url && this.#state === 'ready') return true;
    this.#append(url);
    this.#move();
    return true;
  }

  back(): boolean {
    if (!this.canGoBack) return false;
    this.#index--;
    this.#move();
    return true;
  }

  forward(): boolean {
    if (!this.canGoForward) return false;
    this.#index++;
    this.#move();
    return true;
  }

  reload(): boolean {
    if (!this.url) return false;
    this.#load();
    return true;
  }

  reportError(message = this.errorLabel): void {
    if (!this.url) return;
    this.#clearTimer();
    this.#links?.abort();
    if (this.#state === 'loading') this.#requestedUrl = '';
    this.#state = 'error';
    this.#error = message;
    this.#focusRetry = this.frame !== null && this.shadowRoot?.activeElement === this.frame;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-web-error', {
      detail: { url: this.url, message }, bubbles: true, composed: true,
    }));
  }

  #normalize(address: string, base = ''): string {
    if (typeof address !== 'string' || !address.trim()) return '';
    try {
      const url = new URL(address, base || this.ownerDocument.baseURI);
      return ['http:', 'https:', 'blob:'].includes(url.protocol) || url.href === 'about:blank' ? url.href : '';
    } catch {
      return '';
    }
  }

  #reset(): void {
    this.#configuredSource = this.src;
    const url = this.#normalize(this.src);
    this.#entries = url ? [url] : [];
    this.#index = this.#entries.length - 1;
    this.#load(false);
  }

  #append(url: string): void {
    this.#entries = this.historyEnabled ? [...this.#entries.slice(0, this.#index + 1), url] : [url];
    this.#index = this.#entries.length - 1;
  }

  #clearTimer(): void {
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #startTimer(): void {
    this.#clearTimer();
    if (this.isConnected && Number.isFinite(this.loadTimeout) && this.loadTimeout > 0) {
      this.#timer = this.ownerDocument.defaultView?.setTimeout(() => this.reportError(), this.loadTimeout);
    }
  }

  #load(queue = true): void {
    this.#request++;
    this.#requestedUrl = this.url;
    this.#links?.abort();
    this.#error = '';
    this.#state = this.url ? 'loading' : 'empty';
    if (this.url) this.#startTimer();
    else this.#clearTimer();
    if (queue) this.requestUpdate();
  }

  #move(): void {
    // Fragment moves belong to the local journal, while preserving the live document.
    const frame = this.frame;
    const content = frame?.contentDocument;
    const window = frame?.contentWindow;
    if (this.#state === 'ready' && content && window && content.URL.split('#', 1)[0] === this.url.split('#', 1)[0]) {
      try {
        window.history.replaceState(window.history.state, '', this.url);
        const hash = new URL(this.url).hash.slice(1);
        let name = hash;
        try { name = decodeURIComponent(hash); } catch { /* Keep the literal fragment. */ }
        const target = name && (content.getElementById(name) ?? content.getElementsByName(name).item(0));
        if (target) window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top);
        else if (!name || name.toLowerCase() === 'top') window.scrollTo(0, 0);
        this.requestUpdate();
        return;
      } catch { /* Let the iframe load normally if its current document disallows history changes. */ }
    }
    this.#load();
  }

  #trackLinks(frame: HTMLIFrameElement): void {
    this.#links?.abort();
    const document = frame.contentDocument;
    if (!this.isConnected || !this.historyEnabled || !document) return;
    const links = this.#links = new AbortController();
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.composedPath().find(node => (node as Element).localName === 'a') as HTMLAnchorElement | undefined;
      if (!link?.href || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      if (this.navigate(link.href)) event.preventDefault();
    }, { signal: links.signal });

    // A script-disabled sandbox can suppress callbacks registered on the embedded document.
    const view = this.ownerDocument.defaultView;
    const observer = view?.setInterval(() => {
      if (this.#state !== 'ready' || frame.contentDocument !== document) return;
      const url = document.URL;
      if (!url || url === 'about:blank' || url === this.url) return;
      this.#append(url);
      this.requestUpdate();
    }, 120);
    if (observer !== undefined) links.signal.addEventListener('abort', () => view?.clearInterval(observer), { once: true });
  }

  #loaded = (event: Event) => {
    const frame = event.currentTarget as HTMLIFrameElement;
    if (frame !== this.frame || this.#state === 'empty' || this.#state === 'error') return;
    const accessible = frame.contentDocument;
    const url = accessible?.URL;
    if (url === 'about:blank' && this.#requestedUrl !== url) return;
    if (this.#state === 'ready') {
      if (!this.historyEnabled || !url || url === 'about:blank') {
        this.#links?.abort();
        return;
      }
      if (url !== this.url) this.#append(url);
    } else if (url && url !== 'about:blank') {
      this.#entries[this.#index] = url;
    }
    this.#clearTimer();
    this.#state = 'ready';
    this.#trackLinks(frame);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-web-load', {
      detail: { url: this.url, documentAccessible: Boolean(accessible) }, bubbles: true, composed: true,
    }));
  };

  protected override willUpdate(changes: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedControl = active instanceof HTMLElement ? active : undefined;
    if (changes.has('src') && this.src !== this.#configuredSource) this.#reset();
    else if (changes.has('sandbox') && this.url) this.#load(false);
    else if (changes.has('loadTimeout') && this.#state === 'loading') this.#startTimer();
    if (changes.has('historyEnabled') && this.#state === 'ready' && this.frame) this.#trackLinks(this.frame);
  }

  protected override updated(): void {
    const wasFocused = this.#focusedControl;
    const focusRetry = this.#focusRetry && this.#state === 'error';
    this.#focusRetry = false;
    if (!wasFocused) return;
    const owner = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (owner && owner !== this && owner !== this.ownerDocument.body) return;
    const root = this.shadowRoot;
    if (root?.activeElement && root.activeElement !== wasFocused) return;
    if (focusRetry && wasFocused.matches('iframe')) {
      root?.querySelector<HTMLButtonElement>('[part="retry"]')?.focus();
    } else if (!wasFocused.isConnected || wasFocused.matches(':disabled')) {
      if (!wasFocused.matches('nav button') || !tryFocus(root?.querySelector<HTMLButtonElement>('nav button:enabled'))) {
        tryFocus(this.frame);
      }
    }
  }

  protected override render() {
    const label = this.label || 'Document viewer';
    return html`
      ${this.historyEnabled && this.url ? html`
        <nav part="navigation" aria-label=${label}>
          <button type="button" part="back" ?disabled=${!this.canGoBack} @click=${() => this.back()}>${this.backLabel}</button>
          <button type="button" part="forward" ?disabled=${!this.canGoForward} @click=${() => this.forward()}>${this.forwardLabel}</button>
        </nav>
      ` : nothing}
      ${this.#requestedUrl ? repeat([this.#request], request => request, () => html`
        <iframe part="frame" src=${this.#requestedUrl} title=${label} sandbox=${this.sandbox ?? 'allow-same-origin'}
          allow=${ifDefined(this.allow || undefined)} @load=${this.#loaded}
          @error=${(event: Event) => { if (event.currentTarget === this.frame && this.#state === 'loading') this.reportError(); }}></iframe>
      `) : this.url ? nothing : html`<slot name="empty"></slot>`}
      ${this.#state === 'error' ? html`
        <div class="status" part="status"><span role="alert">${this.#error}</span>
          <button type="button" part="retry" @click=${() => this.reload()}>${this.retryLabel}</button>
        </div>
      ` : nothing}
    `;
  }
}

defineElement('metro-web-view', MetroWebView);

declare global {
  interface HTMLElementTagNameMap { 'metro-web-view': MetroWebView; }
  interface HTMLElementEventMap {
    'metro-web-load': CustomEvent<MetroWebLoadDetail>;
    'metro-web-error': CustomEvent<MetroWebErrorDetail>;
  }
}
