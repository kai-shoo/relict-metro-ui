import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import './app-bar-button.js';
import type { MetroAppBarButton } from './app-bar-button.js';
import './app-bar-toggle-button.js';
import './app-bar-separator.js';
import type { MetroAppBarSeparator } from './app-bar-separator.js';
import { defineElement } from './define.js';
import { revealVertically, tryFocus } from './focus-target.js';
import { metroIconNames, type MetroIconName } from './icon.js';
import { metroTheme } from './theme.js';

export interface MetroCommand {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly iconName?: MetroIconName;
  readonly disabled?: boolean;
  readonly placement?: 'primary' | 'secondary';
  readonly priority?: number;
  readonly checked?: boolean;
}

export interface MetroCommandDetail { id: string; checked?: boolean; }
export type MetroCommandEvent = CustomEvent<MetroCommandDetail>;
export type MetroCommandBarMode = 'default' | 'compact' | 'minimal' | 'minimized';
export type MetroCommandBarProfile = 'standard' | 'wp8';

interface BarAction { type: 'action'; command: MetroCommand; source?: MetroAppBarButton; }
interface BarSeparator { type: 'separator'; source: MetroAppBarSeparator; }
type BarEntry = BarAction | BarSeparator;

function omitOrphanSeparators(entries: BarEntry[]): BarEntry[] {
  const result: BarEntry[] = [];
  let separator: BarSeparator | undefined;
  for (const entry of entries) {
    if (entry.type === 'separator') {
      if (result.length) separator ??= entry;
    } else {
      if (separator) result.push(separator);
      result.push(entry);
      separator = undefined;
    }
  }
  return result;
}

export class MetroCommandBar extends LitElement {
  static override properties = {
    commands: { attribute: false },
    label: { type: String },
    moreLabel: { type: String, attribute: 'more-label' },
    open: { type: Boolean, reflect: true },
    profile: { type: String, reflect: true },
    opacity: { type: Number },
    mode: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    hideSecondary: { type: Boolean, attribute: 'hide-secondary' },
    fixedOverflow: { type: Boolean, attribute: 'fixed-overflow' },
    context: { type: String },
    returnFocus: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      color: var(--_metro-fg);
      background: var(--metro-command-bar-bg, var(--_metro-chrome));
      font-family: var(--_metro-font);
    }

    :host([hidden]), [hidden] { display: none; }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      box-sizing: border-box;
      min-block-size: 4.5rem;
      padding: .5rem .75rem;
      gap: .25rem;
    }

    :host([mode="compact"]:not([open], [orientation="vertical"], [profile="wp8"])) .row {
      min-block-size: var(--metro-command-bar-compact-height, 3.59375rem);
      padding-block: .3125rem;
    }
    :host([mode="compact"]:not([open], [orientation="vertical"], [profile="wp8"])) .icon { inline-size: 2.40625rem; }

    :host([mode="minimal"]:not([open], [orientation="vertical"], [profile="wp8"])) .row {
      min-block-size: var(--metro-command-bar-minimal-height, 2.75rem);
      padding-block: 0;
    }
    :host([mode="minimal"]:not([open], [orientation="vertical"], [profile="wp8"])) .toggle { grid-column: 2; }

    .primary {
      display: flex;
      justify-content: center;
      min-inline-size: 0;
      gap: .25rem;
    }
    .primary[hidden] { display: none; }

    button {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      min-inline-size: 0;
      min-block-size: 2.75rem;
      padding: .125rem;
      border: 0;
      border-radius: 0;
      color: inherit;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    button:disabled { color: var(--_metro-disabled); cursor: default; }
    button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }

    .primary button {
      flex: 0 1 5rem;
      grid-template-columns: minmax(0, 1fr);
      align-content: start;
      gap: .25rem;
    }

    .icon {
      display: grid;
      grid-template: minmax(0, 1fr) / minmax(0, 1fr);
      place-items: center;
      box-sizing: border-box;
      inline-size: 3rem;
      max-inline-size: 100%;
      aspect-ratio: 1;
      border: 2px solid currentColor;
      border-radius: 50%;
      font-size: 1.5rem;
      line-height: 1;
      transition: transform var(--_metro-motion) ease;
    }

    .icon metro-icon {
      max-inline-size: calc(100% - .25rem);
      max-block-size: calc(100% - .25rem);
    }

    .label {
      max-inline-size: 100%;
      overflow-wrap: anywhere;
      font-size: .833rem;
      font-weight: 600;
      line-height: 1.2;
    }

    :host(:not([open])) .with-icon .label { display: none; }
    .primary .text-only { align-content: center; }

    :host(:not([orientation="vertical"])) .primary:not(:has(> :not(.text-only))) {
      flex-wrap: wrap;
    }

    :host(:not([orientation="vertical"])) .primary:not(:has(> :not(.text-only))) > .text-only {
      flex-basis: max-content;
      min-inline-size: min(2.75rem, 100%);
      max-inline-size: 100%;
    }

    .primary button[aria-pressed="true"]:enabled { color: var(--_metro-accent-text); }
    .overflow button[aria-pressed="true"]:enabled { border-inline-start: 3px solid var(--_metro-accent); }
    .separator { color: var(--_metro-border); }
    .primary .separator { align-self: center; block-size: 1.5rem; border-inline-start: 1px solid currentColor; }
    .overflow .separator { margin: .25rem .5rem; border-block-start: 1px solid currentColor; }

    .toggle {
      inline-size: 2.75rem;
      align-content: start;
      font-weight: 600;
      letter-spacing: .125em;
      line-height: 2rem;
    }

    .overflow {
      display: grid;
      box-sizing: border-box;
      max-block-size: 50vh;
      padding: 0 .75rem .75rem;
      overflow: auto;
    }

    :host([orientation="vertical"]) {
      position: relative;
      inline-size: var(--metro-command-rail-width, 4.5rem);
    }
    :host([orientation="vertical"]) .row {
      grid-template: auto 1fr / minmax(0, 1fr);
      align-items: start;
      justify-items: center;
      padding: .5rem .25rem;
    }
    :host([orientation="vertical"]) .primary { flex-direction: column; align-items: center; }
    :host([orientation="vertical"]) .primary button { flex: none; max-inline-size: 100%; }
    :host([orientation="vertical"]) .primary .separator {
      inline-size: 1.5rem;
      block-size: 0;
      border-inline-start: 0;
      border-block-start: 1px solid currentColor;
    }
    :host([orientation="vertical"]) .overflow {
      position: absolute;
      z-index: 1;
      inset-block-start: 0;
      left: var(--_rail-menu-left, 100%);
      inline-size: max-content;
      max-inline-size: var(--_rail-menu-max-width, 100vw);
      max-block-size: 100%;
      background: var(--metro-command-bar-bg, var(--_metro-chrome));
    }

    .overflow[hidden] { display: none; }

    .overflow button {
      justify-items: start;
      padding-inline: .5rem;
      text-align: start;
      font-size: 1.25rem;
      font-weight: 300;
      overflow-wrap: anywhere;
    }

    .overflow button:focus-visible { outline-offset: -2px; }
    :host(:not([orientation="vertical"])) .overflow { padding-inline: min(.75rem, 4%); }
    :host(:not([orientation="vertical"])) .overflow button { padding-inline: min(.5rem, 4%); }

    :host([profile="wp8"]) {
      position: relative;
      background: none;
    }

    :host([profile="wp8"]:not([data-wp8-active])) { display: none; }

    :host([profile="wp8"]) [part="bar"] {
      --_wp8-background: color-mix(in srgb, var(--metro-command-bar-bg, var(--_metro-chrome))
        calc(var(--_wp8-opacity) * 100%), transparent);
    }

    :host([profile="wp8"][open]) [part="bar"] {
      --_wp8-background: var(--metro-command-bar-bg, var(--_metro-chrome));
    }

    :host([profile="wp8"]) :is(.row, .overflow) { background: var(--_wp8-background); }
    :host([profile="wp8"]) .row { padding-block: 8px; }
    :host([profile="wp8"]) .row button { min-block-size: 44px; }
    :host([profile="wp8"]) .toggle { inline-size: 44px; line-height: 32px; }
    :host([profile="wp8"]) .icon { inline-size: 48px; font-size: 24px; }

    :host([profile="wp8"]:not([orientation="vertical"])) [part="bar"]:not([hidden]) {
      display: grid;
      /* Keep the closed footprint; anchor the expanded tracks to the bottom edge. */
      align-content: end;
      grid-template-rows: max-content max-content;
      block-size: 72px;
    }

    :host([profile="wp8"]:not([orientation="vertical"])) .row {
      min-block-size: 72px;
      padding-inline: min(.75rem, 3%);
    }

    :host([profile="wp8"][mode="minimized"]:not([orientation="vertical"])) [part="bar"] {
      block-size: 30px;
    }

    :host([profile="wp8"][mode="minimized"]:not([open], [orientation="vertical"])) .row {
      min-block-size: 30px;
      padding-block: 0;
    }

    :host([profile="wp8"][mode="minimized"]:not([open], [orientation="vertical"])) .toggle {
      grid-column: 2;
      min-block-size: 30px;
      line-height: 1;
      align-content: center;
      outline-offset: -2px;
    }

    :host([profile="wp8"][orientation="vertical"]) { inline-size: 72px; }
    :host([profile="wp8"][orientation="vertical"]) [part="bar"] { block-size: 100%; }
    :host([profile="wp8"][orientation="vertical"]) .row {
      block-size: 100%;
      overflow: auto;
    }

    :host([profile="wp8"][orientation="vertical"]) .overflow {
      inset-inline: auto 100%;
      max-inline-size: max(0px, calc(100cqi - 72px));
    }

    :host([profile="wp8"]) .overflow button { text-transform: lowercase; }

    @media (hover: hover) {
      button:enabled:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
    }

    button:enabled:active .icon { transform: scale(.92); }
    .overflow button:enabled:active { background: var(--_metro-accent); color: var(--_metro-on-accent); }

    @media (prefers-reduced-motion: reduce) {
      .icon { transition: none; }
      button:enabled:active .icon { transform: none; }
    }
  `];

  declare commands: readonly MetroCommand[];
  declare label: string;
  declare moreLabel: string;
  declare open: boolean;
  declare profile: MetroCommandBarProfile;
  declare opacity: number;
  declare mode: MetroCommandBarMode;
  declare orientation: 'horizontal' | 'vertical';
  declare hideSecondary: boolean;
  declare fixedOverflow: boolean;
  declare context: string;
  declare returnFocus: HTMLElement | null;

  #primary: BarEntry[] = [];
  #overflow: BarEntry[] = [];
  #keys = new Set<string>();
  #keepFocus?: string;
  #keepToggle = false;
  #extent = 0;
  #resizeFrame?: number;
  #resize = new ResizeObserver(([entry]) => {
    if (this.#wp8) return;
    const extent = Math.round(this.orientation === 'vertical' ? entry.contentRect.height : entry.contentRect.width);
    if (extent === this.#extent) return;
    this.#extent = extent;
    if (this.#resizeFrame !== undefined) return;
    this.#resizeFrame = this.ownerDocument.defaultView?.requestAnimationFrame(() => {
      this.#resizeFrame = undefined;
      this.requestUpdate();
    });
  });
  #children = new MutationObserver(records => {
    if (records.some(record => record.target === this || record.target.parentNode === this)) this.requestUpdate();
  });

  constructor() {
    super();
    this.commands = [];
    this.label = 'Commands';
    this.moreLabel = 'More commands';
    this.open = false;
    this.profile = 'standard';
    this.opacity = 1;
    this.mode = 'default';
    this.orientation = 'horizontal';
    this.hideSecondary = false;
    this.fixedOverflow = false;
    this.context = '';
    this.returnFocus = null;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.observeOutside(this.open);
    this.#resize.observe(this);
    this.#children.observe(this, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['command-id', 'label', 'icon', 'icon-name', 'disabled', 'checked', 'priority', 'placement', 'hidden'],
    });
    this.requestUpdate();
  }

  override disconnectedCallback() {
    this.observeOutside(false);
    this.#resize.disconnect();
    if (this.#resizeFrame !== undefined) this.ownerDocument.defaultView?.cancelAnimationFrame(this.#resizeFrame);
    this.#resizeFrame = undefined;
    this.#extent = 0;
    this.#children.disconnect();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    const active = this.shadowRoot?.activeElement as HTMLElement | undefined;
    this.#keepFocus = active?.dataset.command;
    this.#keepToggle = active?.matches('.toggle') === true;
    const previousKeys = this.#keys;
    this.#partition();
    const replacedContext = changed.has('context') && changed.get('context') !== undefined;
    const lostCommands = previousKeys.size > 0 && !Array.from(previousKeys).some(id => this.#keys.has(id));
    if (this.open && changed.get('open') !== false && (replacedContext || lostCommands)) {
      this.open = false;
      if (this.overflowHasFocus()) this.#keepToggle = true;
    }
    if (changed.has('open') && !this.open && this.overflowHasFocus()) this.#keepToggle = true;
  }

  protected override updated(changed: PropertyValues<this>) {
    this.toggleAttribute('data-wp8-active', this.#wp8 && this.#keys.size > 0);
    this.toggleAttribute('data-wp8-overlay', this.#wp8 && this.#backgroundOpacity < 1);
    this.#placeRailMenu();
    if (changed.has('open') && this.isConnected) {
      this.observeOutside(this.open);
    }
    if (this.#keepToggle) {
      this.focusTrigger();
    } else if (this.#keepFocus) {
      const id = this.#keepFocus;
      const visible = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('button[data-command]:enabled')]
        .find(node => node.dataset.command === id && !node.closest('[hidden]'));
      if (visible && (visible === this.shadowRoot?.activeElement || tryFocus(visible))) {
        this.#revealOverflowItem(visible);
      } else {
        this.focusTrigger();
      }
    }
  }

  get #wp8() { return this.profile === 'wp8'; }

  get #backgroundOpacity() {
    return Number.isFinite(this.opacity) ? Math.max(0, Math.min(1, this.opacity)) : 1;
  }

  get #minimized() {
    return this.orientation !== 'vertical' && this.mode === (this.#wp8 ? 'minimized' : 'minimal');
  }

  #partition(): void {
    const entries: BarEntry[] = [];
    const ids = new Set<string>();
    const append = (command: MetroCommand, source?: MetroAppBarButton) => {
      if (!command.id || ids.has(command.id) || (this.hideSecondary && command.placement === 'secondary')) return;
      ids.add(command.id);
      entries.push({ type: 'action', command, source });
    };
    for (const command of this.commands) append(command);
    for (const child of this.children) {
      if ((child as HTMLElement).hidden) continue;
      if (child.localName === 'metro-app-bar-button' || child.localName === 'metro-app-bar-toggle-button') {
        const source = child as MetroAppBarButton;
        append(source.command, source);
      } else if (child.localName === 'metro-app-bar-separator') {
        entries.push({ type: 'separator', source: child as MetroAppBarSeparator });
      }
    }
    const candidates = entries.filter((item): item is BarAction => item.type === 'action' && item.command.placement !== 'secondary');
    if (this.#wp8) {
      const primary = candidates.filter(({ command }) =>
        command.icon?.trim() || (command.iconName && metroIconNames.includes(command.iconName))).slice(0, 4);
      const secondary = entries.filter((item): item is BarAction => item.type === 'action' && item.command.placement === 'secondary');
      this.#primary = primary;
      this.#overflow = secondary;
      this.#keys = new Set([...primary, ...secondary].map(({ command }) => command.id));
      return;
    }

    this.#keys = ids;
    const priority = (item: BarAction) => {
      const value = item.command.priority ?? 0;
      return Number.isFinite(value) ? value : 0;
    };
    const rem = parseFloat(getComputedStyle(this.ownerDocument.documentElement).fontSize) || 16;
    const extent = this.orientation === 'vertical' ? this.clientHeight : this.clientWidth;
    const space = extent / rem - 1.5;
    const needsToggle = ids.size !== candidates.length || candidates.length > 4 || space < candidates.length * 3.25
      || candidates.some(entry => entry.command.iconName || entry.command.icon);
    const capacity = this.fixedOverflow || !extent ? 4
      : Math.max(0, Math.min(4, Math.floor((space - (needsToggle ? 2.75 : 0)) / 3.25)));
    const primary = new Set(candidates.sort((a, b) => priority(b) - priority(a)).slice(0, capacity));
    const isPrimary = (item: BarEntry) => item.type === 'action' ? primary.has(item) : item.source.placement !== 'secondary';
    this.#primary = omitOrphanSeparators(entries.filter(isPrimary));
    this.#overflow = omitOrphanSeparators(entries.filter(item => !isPrimary(item)));
  }

  private readonly onOutside = (event: Event) => {
    if (!this.open || event.composedPath().includes(this)) return;
    this.close(event.type === 'pointerdown' && this.overflowHasFocus());
  };

  #placeRailMenu = () => {
    if (this.#wp8 || !this.open || this.orientation !== 'vertical') return;
    const menu = this.shadowRoot?.querySelector<HTMLElement>('#overflow');
    if (!menu || menu.hidden) return;
    const bar = this.getBoundingClientRect();
    const viewport = this.ownerDocument.documentElement.clientWidth;
    const leftSpace = Math.max(0, Math.min(bar.left, viewport));
    const rightSpace = Math.max(0, Math.min(viewport - bar.right, viewport));
    const sideSpace = Math.max(leftSpace, rightSpace);
    // Keep a usable target even when a custom rail occupies almost the entire viewport.
    const maxWidth = sideSpace >= 44 ? sideSpace : viewport;
    menu.style.setProperty('--_rail-menu-max-width', `${maxWidth}px`);
    const width = menu.getBoundingClientRect().width;
    const preferred = leftSpace >= width || leftSpace > rightSpace ? bar.left - width : bar.right;
    const left = Math.max(0, Math.min(preferred, viewport - width));
    menu.style.setProperty('--_rail-menu-left', `${left - bar.left}px`);
  };

  private observeOutside(observe: boolean) {
    const method = observe ? 'addEventListener' : 'removeEventListener';
    this.ownerDocument.defaultView?.[method]('resize', this.#placeRailMenu);
    this.ownerDocument[method]('scroll', this.#placeRailMenu, true);
    this.ownerDocument[method]('pointerdown', this.onOutside, true);
    this.ownerDocument[method]('focusin', this.onOutside, true);
  }

  private overflowHasFocus() {
    const active = this.shadowRoot?.activeElement;
    return active != null && this.renderRoot.querySelector('#overflow')?.contains(active) === true;
  }

  private focusTrigger() {
    const toggle = this.renderRoot.querySelector<HTMLButtonElement>('.toggle:not([hidden])');
    const primary = this.renderRoot.querySelector<HTMLButtonElement>('.primary button:enabled');
    if (!tryFocus(toggle) && !tryFocus(primary)) tryFocus(this.returnFocus);
  }

  override focus(options?: FocusOptions): void {
    const preferred = this.renderRoot.querySelector<HTMLButtonElement>('.primary:not([hidden]) button:enabled')
      ?? this.renderRoot.querySelector<HTMLButtonElement>('.toggle:not([hidden])');
    preferred?.focus(options);
  }

  private close(restoreFocus: boolean) {
    this.open = false;
    if (restoreFocus) this.focusTrigger();
  }

  closeMenu(): boolean {
    if (!this.open) return false;
    this.close(true);
    return true;
  }

  private activate(action: BarAction, fromOverflow = false) {
    const command = action.source?.command ?? action.command;
    if (command.disabled) return;
    if (this.open) this.close(fromOverflow || this.overflowHasFocus());
    if (action.source) {
      action.source.activate();
      this.requestUpdate();
      return;
    }
    const detail: MetroCommandDetail = { id: command.id };
    if (command.checked !== undefined) detail.checked = !command.checked;
    this.dispatchEvent(new CustomEvent('metro-command', {
      bubbles: true,
      composed: true,
      detail,
    }) satisfies MetroCommandEvent);
  }

  private enabledOverflowButtons() {
    return Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>('#overflow button:enabled'));
  }

  #revealOverflowItem(item: HTMLButtonElement): void {
    const overflow = item.closest<HTMLElement>('#overflow');
    if (overflow) revealVertically(item, overflow);
  }

  private async show(first: boolean) {
    this.open = true;
    await this.updateComplete;
    if (!this.open || !this.isConnected) return;
    const index = first ? 0 : -1;
    const action = this.enabledOverflowButtons().at(index);
    if (action) {
      action.focus();
      this.#revealOverflowItem(action);
    } else if (this.#minimized) {
      Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>('.primary button:enabled')).at(index)?.focus();
    }
  }

  private toggleOverflow() {
    if (this.open) this.close(true);
    else void this.show(true);
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }

    const active = this.shadowRoot?.activeElement;
    const forward = event.key === 'ArrowDown';

    if ((forward || event.key === 'ArrowUp') && active?.matches('.toggle')) {
      event.preventDefault();
      void this.show(forward);
      return;
    }

    if (!this.open || !this.overflowHasFocus()) return;
    const buttons = this.enabledOverflowButtons();
    const index = buttons.findIndex(button => button === active);
    if (index === -1) return;

    let target: HTMLButtonElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        target = buttons[(index + 1) % buttons.length];
        break;
      case 'ArrowUp':
        target = buttons[(index + buttons.length - 1) % buttons.length];
        break;
      case 'Home':
        target = buttons[0];
        break;
      case 'End':
        target = buttons.at(-1);
        break;
      default:
        return;
    }

    event.preventDefault();
    if (target) {
      target.focus();
      this.#revealOverflowItem(target);
    }
  }

  protected override render() {
    const primary = this.#primary;
    const overflow = this.#overflow;
    const minimal = this.#minimized;
    const canExpand = overflow.length > 0 || (minimal && this.#keys.size > 0)
      || primary.some(entry => entry.type === 'action' && (entry.command.iconName || entry.command.icon));
    const key = (entry: BarEntry) => entry.type === 'action' ? entry.command.id : entry.source;
    const pressed = (command: MetroCommand) => ifDefined(command.checked === undefined ? undefined : String(command.checked));

    return html`
      <div part="bar" role="group" aria-label=${this.label} @keydown=${this.handleKeydown}
        style=${this.#wp8 ? `--_wp8-opacity: ${this.#backgroundOpacity}` : nothing}
        ?hidden=${this.#keys.size === 0}>
        <div class="row">
          <div class="primary" part="primary" ?hidden=${minimal && !this.open}>
            ${repeat(primary, key, entry => {
              if (entry.type === 'separator') return html`<span class="separator" part="separator" role="separator" aria-orientation=${this.orientation === 'vertical' ? 'horizontal' : 'vertical'}></span>`;
              const { command } = entry;
              return html`
              <button type="button" part="command" class=${command.iconName || command.icon ? 'with-icon' : 'text-only'}
                data-command=${command.id} aria-label=${command.label} aria-pressed=${pressed(command)} ?disabled=${command.disabled}
                @click=${() => this.activate(entry)}>
                ${command.iconName || command.icon ? html`
                  <span class="icon" part="icon" aria-hidden="true">
                    ${command.iconName && (!this.#wp8 || metroIconNames.includes(command.iconName))
                      ? html`<metro-icon name=${command.iconName}></metro-icon>` : command.icon}
                  </span>
                ` : null}
                <span class="label">${command.label}</span>
              </button>
            `; })}
          </div>
          <button class="toggle" part="overflow-toggle" type="button" aria-label=${this.moreLabel}
            aria-expanded=${this.open && canExpand}
            aria-controls=${ifDefined(overflow.length ? 'overflow' : undefined)} ?hidden=${!canExpand}
            @click=${this.toggleOverflow}>
            <span aria-hidden="true">•••</span>
          </button>
        </div>
        <div id="overflow" class="overflow" part="overflow" ?hidden=${!this.open || !overflow.length}>
          ${repeat(overflow, key, entry => entry.type === 'separator'
            ? html`<span class="separator" part="separator" role="separator"></span>`
            : html`<button part="command" type="button" data-command=${entry.command.id}
              aria-pressed=${pressed(entry.command)} ?disabled=${entry.command.disabled}
              @click=${() => this.activate(entry, true)}>${entry.command.label}</button>`)}
        </div>
      </div>
    `;
  }
}

defineElement('metro-command-bar', MetroCommandBar);

declare global {
  interface HTMLElementTagNameMap {
    'metro-command-bar': MetroCommandBar;
  }

  interface HTMLElementEventMap {
    'metro-command': MetroCommandEvent;
  }
}
