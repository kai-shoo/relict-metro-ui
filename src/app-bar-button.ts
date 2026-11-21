import { LitElement, css, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { MetroCommand, MetroCommandDetail, MetroCommandEvent } from './command-bar.js';
import { defineElement } from './define.js';
import './icon.js';
import type { MetroIconName } from './icon.js';
import { metroTheme } from './theme.js';

export class MetroAppBarButton extends LitElement {
  static override properties = {
    commandId: { type: String, attribute: 'command-id', reflect: true },
    label: { type: String, reflect: true },
    icon: { type: String, reflect: true },
    iconName: { type: String, attribute: 'icon-name', reflect: true },
    disabled: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true },
    priority: { type: Number, reflect: true },
  };

  static override styles = [metroTheme, css`
    :host { display: inline-grid; min-inline-size: 0; max-inline-size: 100%; color: var(--_metro-fg); }
    button {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      place-items: center;
      min-block-size: 2.75rem;
      gap: .25rem;
      padding: .125rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: 600 .833rem / 1.2 var(--_metro-font);
      cursor: pointer;
    }
    [part="label"] { overflow-wrap: anywhere; }
    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); }
    .icon {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      inline-size: 3rem;
      max-inline-size: 100%;
      aspect-ratio: 1;
      border: 2px solid currentColor;
      border-radius: 50%;
      font-size: 1.5rem;
      font-weight: 400;
      line-height: 1;
      transition: transform var(--_metro-motion) ease;
    }
    button:enabled:active .icon { transform: scale(.92); }
    button[aria-pressed="true"] { color: var(--_metro-accent-text); }
    button[aria-pressed="true"]:disabled { color: var(--_metro-disabled); }
    @media (prefers-reduced-motion: reduce) {
      .icon { transition: none; }
      button:enabled:active .icon { transform: none; }
    }
  `];

  declare commandId: string;
  declare label: string;
  declare icon: string;
  declare iconName: MetroIconName | '';
  declare disabled: boolean;
  declare placement: NonNullable<MetroCommand['placement']>;
  declare priority: number;

  constructor() {
    super();
    this.commandId = '';
    this.label = '';
    this.icon = '';
    this.iconName = '';
    this.disabled = false;
    this.placement = 'primary';
    this.priority = 0;
  }

  get command(): MetroCommand {
    return {
      id: this.commandId, label: this.label || this.commandId, disabled: this.disabled,
      icon: this.icon || undefined, iconName: this.iconName || undefined,
      placement: this.placement, priority: this.priority, checked: this.pressedState,
    };
  }

  protected get pressedState(): boolean | undefined { return undefined; }
  protected toggle(): boolean | undefined { return undefined; }

  /** @internal Activation shared by the standalone control and its CommandBar. */
  activate(): boolean {
    if (this.disabled || !this.commandId) return false;
    const detail: MetroCommandDetail = { id: this.commandId };
    const checked = this.toggle();
    if (checked !== undefined) detail.checked = checked;
    this.dispatchEvent(new CustomEvent('metro-command', { detail, bubbles: true, composed: true }) satisfies MetroCommandEvent);
    return true;
  }

  override focus(options?: FocusOptions): void { this.shadowRoot?.querySelector('button')?.focus(options); }
  override click(): void { this.shadowRoot?.querySelector('button')?.click(); }

  protected override render() {
    return html`
      <button type="button" part="button" aria-pressed=${ifDefined(this.pressedState === undefined ? undefined : String(this.pressedState))}
        ?disabled=${this.disabled || !this.commandId} @click=${() => this.activate()}>
        ${this.iconName || this.icon ? html`<span class="icon" aria-hidden="true" part="icon">
          ${this.iconName ? html`<metro-icon name=${this.iconName}></metro-icon>` : this.icon}
        </span>` : null}
        <span part="label">${this.label || this.commandId}</span>
      </button>
    `;
  }
}

defineElement('metro-app-bar-button', MetroAppBarButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-app-bar-button': MetroAppBarButton; }
}
