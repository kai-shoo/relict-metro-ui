import { css, html, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import type { MetroCommand, MetroCommandDetail, MetroCommandEvent } from './command-bar.js';
import { defineElement } from './define.js';
import { MetroFlyout } from './flyout.js';
import './icon.js';

export type MetroMenuCommand = Pick<MetroCommand, 'id' | 'label' | 'icon' | 'iconName' | 'disabled' | 'checked'>;

export class MetroMenuFlyout extends MetroFlyout {
  static override properties = {
    ...MetroFlyout.properties,
    commands: { attribute: false },
  };

  static override styles = [...MetroFlyout.styles, css`
    .surface {
      min-inline-size: min(12rem, var(--_metro-flyout-width, calc(100vw - 1rem)));
      padding: .75rem 0;
      background: var(--metro-menu-bg, light-dark(#000, #fff));
      color: var(--metro-menu-fg, var(--_metro-bg));
    }

    .item {
      display: flex;
      align-items: center;
      gap: .75rem;
      box-sizing: border-box;
      inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .5rem min(1.25rem, 6.25vw);
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 1.5rem;
      font-weight: 300;
      text-align: start;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    .item:disabled { opacity: .5; cursor: default; }
    .item[aria-checked="true"] { border-inline-start: 3px solid var(--_metro-accent); }
    .item:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }
    .item:enabled:active { background: var(--_metro-accent); color: var(--_metro-on-accent); }

    @media (hover: hover) {
      .item:enabled:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
    }
  `];

  declare commands: readonly MetroMenuCommand[];
  #focusedItem: Element | null = null;

  constructor() {
    super();
    this.commands = [];
  }

  protected override get surfaceRole(): 'menu' { return 'menu'; }

  #items(): HTMLButtonElement[] {
    return Array.from(this.surface?.querySelectorAll<HTMLButtonElement>('.item:enabled') ?? []);
  }

  protected override focusSurface(): void {
    const first = this.#items()[0];
    if (first) this.focusSurfaceItem(first);
    else super.focusSurface();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    this.#focusedItem = this.open && changed.has('commands') && this.surface?.matches(':focus-within')
      ? this.shadowRoot?.activeElement ?? null
      : null;
  }

  protected override updated(): void {
    super.updated();
    const focusedItem = this.#focusedItem;
    this.#focusedItem = null;
    if (!focusedItem || !this.open) return;

    // Keyed rendering retains the button, but moving it can drop focus or scroll it out of view.
    const retained = this.#items().find(item => item === focusedItem);
    if (retained) this.focusSurfaceItem(retained);
    else this.focusSurface();
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    super.handleKeydown(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Tab') {
      this.closeLayer('dismiss');
      return;
    }

    const items = this.#items();
    if (!items.length) return;
    const index = items.findIndex(item => item === this.shadowRoot?.activeElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % items.length;
        break;
      case 'ArrowUp':
        next = index < 0 ? items.length - 1 : (index + items.length - 1) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.focusSurfaceItem(items[next]);
  }

  #choose(command: MetroMenuCommand): void {
    if (command.disabled) return;
    this.closeLayer('action');
    const detail: MetroCommandDetail = { id: command.id };
    if (command.checked !== undefined) detail.checked = !command.checked;
    this.dispatchEvent(new CustomEvent('metro-command', {
      detail, bubbles: true, composed: true,
    }) satisfies MetroCommandEvent);
  }

  protected override renderContent() {
    return html`${repeat(this.commands, command => command.id, command => html`
      <button type="button" role=${command.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
        aria-checked=${ifDefined(command.checked === undefined ? undefined : String(command.checked))}
        tabindex="-1" class="item" part="item"
        ?disabled=${command.disabled} @click=${() => this.#choose(command)}>
        ${command.iconName || command.icon ? html`
          <span part="icon" aria-hidden="true">
            ${command.iconName ? html`<metro-icon name=${command.iconName}></metro-icon>` : command.icon}
          </span>
        ` : null}
        <span part="label">${command.label}</span>
      </button>
    `)}`;
  }
}

defineElement('metro-menu-flyout', MetroMenuFlyout);

declare global {
  interface HTMLElementTagNameMap { 'metro-menu-flyout': MetroMenuFlyout; }
}
