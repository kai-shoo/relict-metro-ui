import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { metroTheme } from './theme.js';

export interface MetroShareData { title?: string; text?: string; url?: string; files?: readonly File[] }
export type MetroShareOutcome = 'shared' | 'cancelled' | 'unsupported';
export type MetroShareStatus = 'idle' | 'pending' | MetroShareOutcome | 'copied' | 'error';
export type MetroShareMethod = 'share' | 'copy';
export interface MetroShareAdapter {
  share(data: MetroShareData): Promise<MetroShareOutcome | void>;
  canShare?(data: MetroShareData): boolean;
}
export type MetroCopyAdapter = (text: string) => Promise<void>;
export interface MetroShareResultDetail {
  method: MetroShareMethod;
  status: Exclude<MetroShareStatus, 'idle' | 'pending'>;
  requestId: number;
  contextKey: string;
}

const messages: Readonly<Record<MetroShareStatus, string>> = {
  idle: '',
  pending: 'Working…',
  shared: 'Shared.',
  copied: 'Copied to clipboard.',
  cancelled: 'Sharing cancelled.',
  unsupported: 'This share action is unavailable.',
  error: 'The action failed. You can try again.',
};

function platformData(data: MetroShareData): ShareData {
  return { title: data.title, text: data.text, url: data.url, files: data.files?.length ? [...data.files] : undefined };
}

export class MetroShareButton extends LitElement {
  static override properties = {
    label: { type: String },
    shareTitle: { type: String, attribute: 'share-title' },
    text: { type: String },
    url: { type: String },
    contextKey: { attribute: false, noAccessor: true },
    data: { attribute: false },
    shareAdapter: { attribute: false },
    copyAdapter: { attribute: false },
    copyFallback: { type: Boolean, attribute: 'copy-fallback' },
    copyLabel: { type: String, attribute: 'copy-label' },
    shareMessages: { attribute: false },
    disabled: { type: Boolean, reflect: true },
  };

  static override get observedAttributes() { return [...super.observedAttributes, 'context-key']; }

  static override styles = [metroTheme, metroButtonStyles, css`
    .actions { display: flex; flex-wrap: wrap; max-inline-size: 100%; gap: .375rem; }
    .actions button {
      font-size: clamp(1rem, 7vi, 1.4167rem);
      padding-inline: min(.625rem, 2.25vi);
    }
    .status { margin: 0; color: var(--_metro-muted); font-size: .9375rem; overflow-wrap: anywhere; }
    .status:not(:empty) { margin-block-start: .375rem; }
    button[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }
    button[aria-disabled="true"]:active { background: transparent; color: var(--_metro-disabled); }
  `];

  declare label: string;
  declare shareTitle: string;
  declare text: string;
  declare url: string;
  declare data: MetroShareData | undefined;
  declare shareAdapter: MetroShareAdapter | null | undefined;
  declare copyAdapter: MetroCopyAdapter | null | undefined;
  declare copyFallback: boolean;
  declare copyLabel: string;
  declare shareMessages: Readonly<Partial<Record<MetroShareStatus, string>>>;
  declare disabled: boolean;

  #status: MetroShareStatus = 'idle';
  #sequence = 0;
  #request: Omit<MetroShareResultDetail, 'status'> | undefined;

  constructor() {
    super();
    this.label = '';
    this.shareTitle = '';
    this.text = '';
    this.url = '';
    this.copyFallback = false;
    this.copyLabel = '';
    this.shareMessages = {};
    this.disabled = false;
  }

  override disconnectedCallback(): void {
    this.#invalidate();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (name === 'context-key' && previous !== next) this.#invalidate();
  }

  get contextKey() { return this.getAttribute('context-key') ?? ''; }
  set contextKey(value: string) { this.setAttribute('context-key', value); }
  get shareStatus() { return this.#status; }
  get shareAvailable() { return this.#canShare(this.#snapshot()); }
  get copyAvailable() { return Boolean(this.copyFallback && this.#copyText && this.#copy()); }

  override focus(options?: FocusOptions): void {
    this.#shareButton?.focus(options);
  }

  get #shareButton() { return this.shadowRoot?.querySelector<HTMLButtonElement>('[part="button"]'); }

  get #hasPayload() {
    const data = this.#snapshot();
    return Boolean(data.title || data.text || data.url || data.files?.length);
  }

  get #copyText() {
    const data = this.#snapshot();
    return data.url || data.text || '';
  }

  #snapshot(): MetroShareData {
    const source: MetroShareData = this.data ?? { title: this.shareTitle, text: this.text, url: this.url };
    return {
      ...(source.title && { title: source.title }),
      ...(source.text && { text: source.text }),
      ...(source.url && { url: source.url }),
      ...(source.files?.length && { files: [...source.files] }),
    };
  }

  #canShare(data: MetroShareData): boolean {
    if (!this.#hasPayload || this.shareAdapter === null) return false;
    try {
      if (this.shareAdapter) return this.shareAdapter.canShare?.(data) ?? true;
      const view = this.ownerDocument.defaultView;
      if (!view?.isSecureContext || typeof view.navigator.share !== 'function') return false;
      if (typeof view.navigator.canShare !== 'function') return !data.files?.length;
      return view.navigator.canShare(platformData(data));
    } catch {
      return false;
    }
  }

  #copy(): MetroCopyAdapter | undefined {
    if (this.copyAdapter !== undefined) return this.copyAdapter ?? undefined;
    const view = this.ownerDocument.defaultView;
    if (!view?.isSecureContext || typeof view.navigator.clipboard?.writeText !== 'function') return undefined;
    return text => view.navigator.clipboard.writeText(text);
  }

  #invalidate(): void {
    this.#request = undefined;
    this.#status = 'idle';
    this.requestUpdate();
  }

  #finish(request: Omit<MetroShareResultDetail, 'status'>, status: MetroShareResultDetail['status']): void {
    if (!this.isConnected || request !== this.#request) return;
    this.#request = undefined;
    this.#status = status;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent<MetroShareResultDetail>('metro-share-result', {
      detail: { ...request, status }, bubbles: true, composed: true,
    }));
  }

  #handleError(request: Omit<MetroShareResultDetail, 'status'>, error: unknown): void {
    const name = error !== null && typeof error === 'object' && 'name' in error ? error.name : '';
    this.#finish(request, name === 'AbortError' ? 'cancelled' : name === 'NotSupportedError' ? 'unsupported' : 'error');
  }

  #activate(event: MouseEvent, method: MetroShareMethod): void {
    if (!event.isTrusted || this.disabled || this.#request) return;
    const request = { method, requestId: ++this.#sequence, contextKey: this.contextKey };
    this.#request = request;
    this.#status = 'pending';
    this.requestUpdate();
    try {
      if (method === 'copy') {
        const copy = this.#copy();
        const text = this.#copyText;
        if (!this.copyFallback || !copy || !text) {
          this.#finish(request, 'unsupported');
          return;
        }
        void copy(text).then(() => this.#finish(request, 'copied'), error => this.#handleError(request, error));
        return;
      }
      const data = this.#snapshot();
      if (!this.#canShare(data)) {
        this.#finish(request, 'unsupported');
        return;
      }
      const view = this.ownerDocument.defaultView;
      if (this.shareAdapter === undefined && view?.navigator.userActivation?.isActive === false) {
        this.#finish(request, 'error');
        return;
      }
      const operation = this.shareAdapter
        ? this.shareAdapter.share(data)
        : view!.navigator.share(platformData(data));
      void operation.then(result => this.#finish(request, result ?? 'shared'), error => this.#handleError(request, error));
    } catch (error) {
      this.#handleError(request, error);
    }
  }

  protected override update(changed: PropertyValues<this>): void {
    const copy = this.shadowRoot?.activeElement;
    super.update(changed);
    if (!copy?.matches('[part="copy"]') || copy.isConnected) return;

    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || active === this || active === this.ownerDocument.body) tryFocus(this.#shareButton);
  }

  protected override render() {
    const pending = this.#status === 'pending';
    return html`
      <div>
        <div class="actions" part="actions">
          <button type="button" part="button" aria-label=${ifDefined(this.label || undefined)}
            ?disabled=${this.disabled || !this.#hasPayload} aria-disabled=${String(pending)}
            @click=${(event: MouseEvent) => this.#activate(event, 'share')}>
            <slot>${this.label || 'Share'}</slot>
          </button>
          ${this.copyAvailable ? html`
            <button type="button" part="copy" ?disabled=${this.disabled} aria-disabled=${String(pending)}
              @click=${(event: MouseEvent) => this.#activate(event, 'copy')}>
              ${this.copyLabel || (this.#snapshot().url ? 'Copy link' : 'Copy text')}
            </button>
          ` : nothing}
        </div>
        <p class="status" part="status" role="status">${this.shareMessages[this.#status] ?? messages[this.#status]}</p>
      </div>
    `;
  }
}

defineElement('metro-share-button', MetroShareButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-share-button': MetroShareButton }
  interface HTMLElementEventMap { 'metro-share-result': CustomEvent<MetroShareResultDetail> }
}
