import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { metroTheme } from './theme.js';

export interface MetroDialogCloseDetail {
  readonly reason: 'action' | 'escape' | 'programmatic';
  readonly value: string;
}

export type MetroDialogCloseEvent = CustomEvent<MetroDialogCloseDetail>;

export class MetroDialog extends LitElement {
  static override properties = {
    label: { type: String },
    triggerLabel: { type: String, attribute: 'trigger-label' },
    open: { type: Boolean, reflect: true },
    returnFocus: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: inline; }

    dialog {
      box-sizing: border-box;
      inline-size: min(30rem, calc(100% - 1rem));
      max-inline-size: none;
      max-block-size: min(80dvh, calc(100% - 2rem));
      margin: min(12dvh, 6rem) auto auto;
      padding-block: calc(var(--_metro-space) * 2);
      padding-inline: min(calc(var(--_metro-space) * 2), 5vi);
      border: 0;
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--_metro-chrome);
      color: var(--_metro-fg);
      font: inherit;
    }

    dialog::backdrop { background: var(--metro-dialog-backdrop, #000b); }

    h2 {
      margin: 0 0 var(--_metro-space);
      font-size: clamp(1.5rem, 6.7vi, 2rem);
      font-weight: 600;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }

    .body { font-size: 1.25rem; line-height: 1.45; overflow-wrap: anywhere; }

    .actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--_metro-space);
    }

    button,
    ::slotted(button[slot="actions"]) {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem min(.75rem, 3vi);
      border: 3px solid currentColor;
      background: transparent;
      color: var(--_metro-fg);
      font: inherit;
      font-weight: 600;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    ::slotted(button[slot="actions"]) { margin-block-start: var(--_metro-space); }

    button:enabled:active,
    ::slotted(button[slot="actions"]:enabled:active) {
      border-color: var(--_metro-accent);
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }

    button:focus-visible,
    ::slotted(button[slot="actions"]:focus-visible) {
      outline: 2px solid var(--_metro-focus);
      outline-offset: 2px;
    }

    ::slotted(button[slot="actions"]:disabled) {
      color: var(--_metro-disabled);
      cursor: default;
    }

    @media (forced-colors: active) { dialog { border: 1px solid CanvasText; } }

    @media (prefers-reduced-motion: no-preference) {
      dialog[open] { animation: metro-dialog-enter var(--_metro-motion) ease-out; }
      @keyframes metro-dialog-enter { from { opacity: .5; transform: translateY(-.5rem); } }
    }
  `];

  declare label: string;
  declare triggerLabel: string;
  declare open: boolean;
  declare returnFocus: HTMLElement | null;

  #invoker: HTMLElement | null = null;
  #displayed = false;
  #returnValue = '';

  constructor() {
    super();
    this.label = '';
    this.triggerLabel = '';
    this.open = false;
    this.returnFocus = null;
  }

  get returnValue(): string {
    return this.#returnValue;
  }

  show(trigger?: HTMLElement): void {
    if (!this.#displayed) {
      this.#invoker = trigger ?? this.#activeElement();
    }
    this.open = true;
  }

  close(value = ''): boolean {
    return this.#requestClose({ reason: 'programmatic', value });
  }

  override disconnectedCallback(): void {
    this.#displayed = false;
    this.#invoker = null;
    this.#surface?.close();
    super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  protected override updated(): void {
    const surface = this.#surface;
    if (!surface || !this.isConnected) return;

    if (this.open && !surface.open) {
      this.#invoker ??= this.#activeElement();
      this.#returnValue = '';
      surface.returnValue = '';
      surface.showModal();
      this.#displayed = true;
      if (this.open) this.#focusInitial(surface);
    } else if (!this.open && this.#displayed) {
      this.#finish({ reason: 'programmatic', value: '' });
    }
  }

  #focusInitial(surface: HTMLDialogElement): void {
    const autofocus = Array.from(this.querySelectorAll<HTMLElement>('[autofocus]')).find(element =>
      element.getClientRects().length > 0 && !element.matches(':disabled') && !element.closest('[inert]'),
    );
    if (autofocus) {
      if (!autofocus.matches(':focus-within')) autofocus.focus();
      return;
    }

    if (surface.scrollHeight > surface.clientHeight + 1) {
      const active = this.shadowRoot?.activeElement ?? this.#activeElement();
      const viewportBottom = surface.getBoundingClientRect().top + surface.clientTop + surface.clientHeight;
      if (active === surface || (active && active.getBoundingClientRect().bottom + surface.scrollTop > viewportBottom + 1)) {
        surface.querySelector<HTMLElement>('h2, .body')?.focus({ preventScroll: true });
      }
    }
    surface.scrollTop = 0;
  }

  get #surface(): HTMLDialogElement | null | undefined {
    return this.shadowRoot?.querySelector('dialog');
  }

  #activeElement(): HTMLElement | null {
    const root = this.getRootNode();
    const active = root instanceof ShadowRoot ? root.activeElement : this.ownerDocument.activeElement;
    return active instanceof HTMLElement ? active : null;
  }

  #requestClose(detail: MetroDialogCloseDetail): boolean {
    if (!this.#displayed) {
      this.open = false;
      this.#invoker = null;
      return false;
    }
    if (!this.dispatchEvent(new CustomEvent('metro-before-close', {
      detail, bubbles: true, composed: true, cancelable: true,
    }))) return false;

    this.#finish(detail);
    return true;
  }

  #finish(detail: MetroDialogCloseDetail): void {
    this.#displayed = false;
    this.open = false;
    this.#returnValue = detail.value;
    const invoker = this.#invoker;
    this.#invoker = null;
    this.#surface?.close(detail.value);
    if (!tryFocus(invoker)) tryFocus(this.returnFocus);
    this.dispatchEvent(new CustomEvent('metro-close', { detail, bubbles: true, composed: true }));
  }

  #cancel = (event: Event) => {
    event.preventDefault();
    this.#requestClose({ reason: 'escape', value: '' });
  };

  #onNativeClose = () => {
    if (this.#displayed && !this.#surface?.open) {
      this.#finish({ reason: 'programmatic', value: this.#surface?.returnValue ?? '' });
    }
  };

  #onTrigger = (event: Event) => this.show(event.currentTarget as HTMLElement);

  #onAction = (event: Event) => {
    if (event.defaultPrevented) return;
    const button = event.composedPath().find(node =>
      node instanceof HTMLButtonElement && node.hasAttribute('data-metro-value'),
    ) as HTMLButtonElement | undefined;
    if (!button || button.matches(':disabled')) return;

    event.preventDefault();
    this.#requestClose({ reason: 'action', value: button.dataset.metroValue ?? '' });
  };

  protected override render() {
    return html`
      ${this.triggerLabel ? html`
        <button type="button" part="trigger" aria-haspopup="dialog"
          aria-controls="dialog" @click=${this.#onTrigger}>${this.triggerLabel}</button>
      ` : null}
      <dialog id="dialog" part="surface" aria-label=${this.label || 'Dialog'}
        @cancel=${this.#cancel} @close=${this.#onNativeClose}>
        ${this.label ? html`<h2 part="heading" tabindex="-1">${this.label}</h2>` : null}
        <div class="body" part="body" tabindex="-1"><slot></slot></div>
        <div class="actions" part="actions" @click=${this.#onAction}>
          <slot name="actions"></slot>
        </div>
      </dialog>
    `;
  }
}

defineElement('metro-dialog', MetroDialog);

declare global {
  interface HTMLElementTagNameMap { 'metro-dialog': MetroDialog; }
}
