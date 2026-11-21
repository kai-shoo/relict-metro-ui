import { LitElement, css, html, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import './menu-flyout.js';
import type { MetroMenuFlyout, MetroMenuCommand } from './menu-flyout.js';
import { pickerChevron } from './picker-chevron.js';
import { metroTheme } from './theme.js';

export class MetroDropDownButton extends LitElement {
  static override properties = {
    label: { type: String },
    menuLabel: { type: String, attribute: 'menu-label' },
    disabled: { type: Boolean, reflect: true },
    commands: { attribute: false },
    returnFocus: { attribute: false },
  };

  static override styles = [metroTheme, pickerChevron, css`
    :host { display: inline-flex; max-inline-size: 100%; vertical-align: middle; }
    .control { display: inline-flex; min-inline-size: 0; max-inline-size: 100%; }

    button {
      display: inline-flex;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      min-inline-size: 3rem;
      min-block-size: 3rem;
      overflow-wrap: anywhere;
      gap: .75rem;
      padding: .3125rem .625rem .375rem;
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: var(--_metro-fg);
      font: 600 1.4167rem / 1.15 var(--_metro-font);
      cursor: pointer;
    }

    button:enabled:active {
      border-color: var(--_metro-accent);
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }

    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { position: relative; outline: 2px solid var(--_metro-focus); outline-offset: 2px; }

    #trigger { padding-block: .34375rem; }
    #trigger:has(> slot) {
      gap: min(.75rem, 3vi);
      padding-inline: min(.625rem, 2.25vi);
    }

    .chevron { flex: none; }
  `];

  declare label: string;
  declare menuLabel: string;
  declare disabled: boolean;
  declare commands: readonly MetroMenuCommand[];
  declare returnFocus: HTMLElement | null;

  #showPending = false;

  constructor() {
    super();
    this.label = '';
    this.menuLabel = '';
    this.disabled = false;
    this.commands = [];
    this.returnFocus = null;
  }

  get #trigger(): HTMLButtonElement | null | undefined {
    return this.shadowRoot?.querySelector('#trigger');
  }

  get #menu(): MetroMenuFlyout | null | undefined {
    return this.shadowRoot?.querySelector('metro-menu-flyout');
  }

  get open(): boolean {
    return this.#menu?.open ?? false;
  }

  show(): void {
    if (this.disabled || !this.commands.length) return;
    const trigger = this.#trigger;
    if (!trigger) {
      this.#showPending = true;
      return;
    }
    this.#menu?.show(trigger);
    this.requestUpdate();
  }

  close(): void {
    this.#showPending = false;
    const menu = this.#menu;
    if (menu) {
      menu.returnFocus = this.menuReturnFocus;
      menu.close();
    }
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    this.#trigger?.focus(options);
  }

  override click(): void {
    this.#trigger?.click();
  }

  protected override updated(): void {
    const menu = this.#menu;
    if (menu) menu.returnFocus = this.menuReturnFocus;
    if (this.open && (this.disabled || !this.commands.length)) this.close();
    if (this.#showPending) {
      this.#showPending = false;
      this.show();
    }
  }

  #toggle = () => {
    if (this.open) this.close();
    else this.show();
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.show();
  };

  protected get resolvedMenuLabel(): string { return this.menuLabel || this.label || 'Commands'; }
  protected get menuReturnFocus(): HTMLElement | null { return this.returnFocus; }
  protected get triggerLabel(): string { return this.label; }

  protected renderPrimary(): TemplateResult | undefined { return undefined; }
  protected renderTriggerText(): TemplateResult | undefined { return html`<slot>${this.label || 'Options'}</slot>`; }

  protected override render() {
    return html`
      <div class="control">
        ${this.renderPrimary()}
        <button id="trigger" type="button" part="trigger" aria-label=${ifDefined(this.triggerLabel || undefined)}
          ?disabled=${this.disabled || !this.commands.length} aria-haspopup="menu" aria-expanded=${this.open}
          @click=${this.#toggle} @keydown=${this.#onKeyDown}>
          ${this.renderTriggerText()}
          <span aria-hidden="true" class="chevron" part="indicator"></span>
        </button>
      </div>
      <metro-menu-flyout .commands=${this.commands} .label=${this.resolvedMenuLabel}
        exportparts="surface, item, icon, label" @metro-close=${() => this.requestUpdate()}>
      </metro-menu-flyout>
    `;
  }
}

defineElement('metro-drop-down-button', MetroDropDownButton);

declare global {
  interface HTMLElementTagNameMap { 'metro-drop-down-button': MetroDropDownButton; }
}
