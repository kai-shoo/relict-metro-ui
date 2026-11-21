import { css, html, type PropertyValues } from 'lit';
import './command-bar.js';
import type { MetroCommand, MetroCommandBar } from './command-bar.js';
import { defineElement } from './define.js';
import { MetroFlyout } from './flyout.js';

export class MetroCommandBarFlyout extends MetroFlyout {
  static override properties = {
    ...MetroFlyout.properties,
    commands: { attribute: false },
    moreLabel: { type: String, attribute: 'more-label' },
    context: { type: String },
  };

  static override styles = [...MetroFlyout.styles, css`
    .surface { padding: 0; inline-size: min(24rem, var(--_metro-flyout-width, calc(100vw - 1rem))); }
  `];

  declare commands: readonly MetroCommand[];
  declare moreLabel: string;
  declare context: string;

  constructor() {
    super();
    this.commands = [];
    this.moreLabel = 'More commands';
    this.context = '';
    this.addEventListener('metro-close', event => {
      if (event.target === this && this.#bar) this.#bar.open = false;
    });
  }

  get #bar(): MetroCommandBar | null | undefined { return this.shadowRoot?.querySelector('metro-command-bar'); }
  protected override get accessibleLabel(): string { return this.label || 'Commands'; }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.open && changed.get('open') !== false && changed.has('context') && changed.get('context') !== undefined) {
      this.closeLayer('dismiss');
    }
  }

  protected override focusSurface(): void {
    super.focusSurface();
    const bar = this.#bar;
    void bar?.updateComplete.then(() => {
      if (this.open && this.surface?.matches(':focus-within')) bar.focus({ preventScroll: true });
    });
  }

  protected override renderContent() {
    return html`
      <metro-command-bar .commands=${this.commands} .label=${this.accessibleLabel} .moreLabel=${this.moreLabel} .context=${this.context}
        exportparts="bar,primary,command,icon,overflow-toggle,overflow,separator"
        @metro-command=${() => this.closeLayer('action')}></metro-command-bar>
    `;
  }
}

defineElement('metro-command-bar-flyout', MetroCommandBarFlyout);

declare global {
  interface HTMLElementTagNameMap { 'metro-command-bar-flyout': MetroCommandBarFlyout; }
}
