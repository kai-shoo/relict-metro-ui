import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroRepeatActivateEvent = CustomEvent<{ repeat: boolean }>;

const DEFAULT_DELAY = 400;
const DEFAULT_INTERVAL = 80;
const MAX_TIMEOUT = 2_147_483_647;

type Press = ({ kind: 'pointer'; id: number } | { kind: 'keyboard'; key: string }) & { repeated: boolean };

export class MetroRepeatButton extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties = {
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    delay: { type: Number },
    interval: { type: Number },
  };

  static override styles = [metroTheme, metroButtonStyles, css`
    button[data-pressing]:enabled {
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }
  `];

  declare disabled: boolean;
  declare label: string;
  declare delay: number;
  declare interval: number;

  #press: Press | null = null;
  #timer: number | undefined;
  #watch: AbortController | null = null;
  #suppressPointerClick = false;

  constructor() {
    super();
    this.disabled = false;
    this.label = '';
    this.delay = DEFAULT_DELAY;
    this.interval = DEFAULT_INTERVAL;
  }

  override disconnectedCallback(): void {
    this.#cancelPress();
    super.disconnectedCallback();
  }

  override click(): void {
    this.shadowRoot?.querySelector('button')?.click();
  }

  protected override willUpdate(): void {
    if (this.disabled) this.#cancelPress();
  }

  #wait(milliseconds: number, fallback: number, minimum: number): void {
    const duration = Number.isFinite(milliseconds) ? Math.min(MAX_TIMEOUT, Math.max(minimum, milliseconds)) : fallback;
    this.#timer = this.ownerDocument.defaultView?.setTimeout(this.#repeat, duration);
  }

  #begin(press: Press): void {
    this.#press = press;
    this.requestUpdate();
    this.#watch = new AbortController();
    const options = { signal: this.#watch.signal };
    this.ownerDocument.defaultView?.addEventListener('blur', this.#cancelPress, options);
    this.ownerDocument.addEventListener('visibilitychange', this.#onVisibilityChange, options);
    this.#wait(this.delay, DEFAULT_DELAY, 0);
  }

  #end(cancelled: boolean): void {
    const press = this.#press;
    if (!press) return;
    this.#press = null;
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#watch?.abort();
    this.#watch = null;
    if (press.kind === 'pointer') this.#suppressPointerClick = cancelled || press.repeated;
    this.requestUpdate();
  }

  #cancelPress = () => this.#end(true);

  #onVisibilityChange = () => {
    if (this.ownerDocument.hidden) this.#cancelPress();
  };

  #repeat = () => {
    const press = this.#press;
    if (!press || !this.isConnected || this.disabled) {
      this.#cancelPress();
      return;
    }

    press.repeated = true;
    this.#activate(true);
    if (this.#press === press && !this.disabled) this.#wait(this.interval, DEFAULT_INTERVAL, 16);
  };

  #activate(repeat: boolean): void {
    this.dispatchEvent(new CustomEvent('metro-activate', {
      detail: { repeat }, bubbles: true, composed: true,
    }) satisfies MetroRepeatActivateEvent);
  }

  #onPointerDown = (event: PointerEvent) => {
    if (!event.isTrusted || !event.isPrimary || event.button !== 0 || event.defaultPrevented || this.disabled) return;
    this.#suppressPointerClick = this.#press !== null;
    if (!this.#press) this.#begin({ kind: 'pointer', id: event.pointerId, repeated: false });
  };

  #pointerMatches(event: PointerEvent): boolean {
    return event.isTrusted && this.#press?.kind === 'pointer' && this.#press.id === event.pointerId;
  }

  #onPointerUp = (event: PointerEvent) => {
    if (this.#pointerMatches(event)) this.#end(false);
  };

  #onPointerCancel = (event: PointerEvent) => {
    if (this.#pointerMatches(event)) this.#cancelPress();
  };

  #onPointerMove = (event: PointerEvent) => {
    if (!this.#pointerMatches(event)) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) this.#cancelPress();
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (!event.isTrusted || event.defaultPrevented || this.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat && !this.#press) this.#begin({ kind: 'keyboard', key: event.key, repeated: false });
  };

  #onKeyUp = (event: KeyboardEvent) => {
    const press = this.#press;
    if (!event.isTrusted || press?.kind !== 'keyboard' || press.key !== event.key) return;
    event.preventDefault();
    this.#end(false);
    if (!press.repeated && !this.disabled) this.click();
  };

  #onClick = (event: MouseEvent) => {
    if (event.isTrusted && event.detail > 0 && this.#suppressPointerClick) {
      this.#suppressPointerClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (this.disabled || event.defaultPrevented) return;
    this.#activate(false);
  };

  protected override render() {
    return html`
      <button type="button" part="button" aria-label=${ifDefined(this.label || undefined)} ?disabled=${this.disabled}
        ?data-pressing=${this.#press !== null} @click=${this.#onClick} @blur=${this.#cancelPress}
        @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp}
        @pointerleave=${this.#onPointerCancel} @pointercancel=${this.#onPointerCancel}
        @lostpointercapture=${this.#onPointerCancel} @keydown=${this.#onKeyDown} @keyup=${this.#onKeyUp}>
        <slot>${this.label}</slot>
      </button>
    `;
  }
}

defineElement('metro-repeat-button', MetroRepeatButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-repeat-button': MetroRepeatButton; }
  interface HTMLElementEventMap { 'metro-activate': MetroRepeatActivateEvent; }
}
