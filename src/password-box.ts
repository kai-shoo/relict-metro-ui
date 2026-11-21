import { css, html, nothing, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { TextControl } from './text-control.js';

export class MetroPasswordBox extends TextControl {
  static override properties = {
    reveal: { type: Boolean, reflect: true },
    revealLabel: { type: String, attribute: 'reveal-label' },
  };

  static override styles = [...TextControl.styles, css`
    .editor { padding-inline: .375rem; }

    .reveal {
      display: inline-grid;
      flex: none;
      place-items: center;
      min-inline-size: 2.75rem;
      min-block-size: 2.75rem;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      touch-action: none;
    }

    .reveal:disabled { color: inherit; opacity: .45; cursor: default; }
    .reveal[aria-pressed="true"] { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .reveal:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }

    .eye {
      display: grid;
      place-items: center;
      inline-size: 1.25rem;
      block-size: .75rem;
      border: 2px solid currentColor;
      border-radius: 50%;
    }

    .eye::after {
      content: '';
      inline-size: .375rem;
      block-size: .375rem;
      border-radius: 50%;
      background: currentColor;
    }
  `];

  declare reveal: boolean;
  declare revealLabel: string;
  #holding: number | string | undefined;
  #activeListeners: AbortController | undefined;

  constructor() {
    super();
    this.reveal = false;
    this.revealLabel = 'Show password while held';
  }

  protected override get editorType() { return this.#holding === undefined ? 'password' : 'text'; }
  protected override get restoreValue() { return false; }
  protected override get defaultAutocomplete() { return 'current-password'; }
  protected override get autocompleteText() { return false; }

  override disconnectedCallback(): void {
    this.#mask();
    super.disconnectedCallback();
  }

  override formResetCallback(): void {
    this.#mask();
    super.formResetCallback();
  }

  override formDisabledCallback(disabled: boolean): void {
    if (disabled) this.#mask();
    super.formDisabledCallback(disabled);
  }

  protected override update(changed: PropertyValues<this>): void {
    const button = this.shadowRoot?.activeElement;
    if (!this.reveal || this.controlDisabled || !this.value) this.#mask();
    super.update(changed);
    if (!(button instanceof HTMLButtonElement) || !button.matches('.reveal')) return;
    if (button.isConnected && !button.disabled) return;

    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || active === this || active === this.ownerDocument.body) tryFocus(this.editor);
  }

  #setType(type: 'password' | 'text'): void {
    const editor = this.editor;
    if (!(editor instanceof HTMLInputElement) || editor.type === type) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const direction = editor.selectionDirection;
    editor.type = type;
    if (start !== null && end !== null) editor.setSelectionRange(start, end, direction ?? undefined);
  }

  #show(gesture: number | string): void {
    if (this.#holding !== undefined || !this.reveal || this.controlDisabled || !this.value) return;
    this.#holding = gesture;
    this.#setType('text');
    this.requestUpdate();

    this.#activeListeners = new AbortController();
    const signal = this.#activeListeners.signal;
    this.ownerDocument.defaultView?.addEventListener('blur', this.#mask, { signal });
    this.ownerDocument.addEventListener('visibilitychange', this.#mask, { signal });
    this.addEventListener('focusout', this.#mask, { signal });
  }

  #mask = (): void => {
    if (this.#holding === undefined) return;
    this.#holding = undefined;
    this.#activeListeners?.abort();
    this.#activeListeners = undefined;
    this.#setType('password');
    this.requestUpdate();
  };

  #onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0 || this.#holding !== undefined) return;
    event.preventDefault();
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
    this.#show(event.pointerId);
  }

  #onPointerRelease(event: PointerEvent): void {
    if (this.#holding === event.pointerId) this.#mask();
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.#holding !== undefined) {
      event.preventDefault();
      this.#mask();
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) this.#show(event.key);
  }

  #onKeyUp(event: KeyboardEvent): void {
    if (this.#holding !== event.key) return;
    event.preventDefault();
    this.#mask();
  }

  protected override trailingControl() {
    if (!this.reveal) return nothing;
    return html`
      <button class="reveal" type="button" part="reveal" aria-label=${this.revealLabel}
        aria-pressed=${String(this.#holding !== undefined)} ?disabled=${this.controlDisabled || !this.value}
        @pointerdown=${this.#onPointerDown} @pointerup=${this.#onPointerRelease}
        @pointercancel=${this.#onPointerRelease} @lostpointercapture=${this.#onPointerRelease}
        @keydown=${this.#onKeyDown} @keyup=${this.#onKeyUp} @blur=${this.#mask}>
        <span class="eye" aria-hidden="true"></span>
      </button>
    `;
  }
}

defineElement('metro-password-box', MetroPasswordBox);

declare global {
  interface HTMLElementTagNameMap {
    'metro-password-box': MetroPasswordBox;
  }
}
