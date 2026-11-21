import { css, html } from 'lit';
import { defineElement } from './define.js';
import './option.js';
import type { MetroOption } from './option.js';
import { PickerControl, type PickerChoice } from './picker-control.js';

export class MetroListPicker extends PickerControl {
  static override properties = {
    multiple: { type: Boolean, reflect: true },
    fullScreen: { type: Boolean, reflect: true, attribute: 'full-screen' },
    selectedValues: { attribute: false, noAccessor: true },
    backLabel: { type: String, attribute: 'back-label' },
  };

  static override styles = [...PickerControl.styles, css`
    .picker-page {
      box-sizing: border-box;
      position: fixed;
      inset: 0;
      inline-size: 100%;
      block-size: 100dvh;
      max-inline-size: none;
      max-block-size: none;
      margin: 0;
      border: 0;
      padding: min(var(--_metro-space), 3dvh) min(calc(var(--_metro-space) * 2), 6vi);
      background: var(--metro-picker-bg, var(--_metro-bg));
      color: var(--_metro-fg);
      font-family: var(--_metro-font);
      overflow: auto;
      overscroll-behavior: contain;
    }

    .picker-page:popover-open {
      display: grid;
      grid-template-rows: auto minmax(2.5rem, 1fr) auto;
      gap: min(var(--_metro-space), 2dvh);
    }

    .page-header, .page-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: min(var(--_metro-space), 3vi);
    }

    .page-heading {
      flex: 1;
      margin: 0;
      font-size: min(2rem, max(1.25rem, 7dvh));
      font-weight: 300;
      overflow-wrap: anywhere;
    }

    .page-content { display: flex; flex-direction: column; min-block-size: 0; }
    .picker-page .list { flex: 1; min-block-size: 0; max-block-size: none; }
    .picker-page .option {
      min-block-size: min(4.5rem, max(2.5rem, 35dvh));
      font-size: min(2rem, max(1.4167rem, 6dvh));
      font-weight: 300;
    }
    .picker-page .mark { inline-size: min(2rem, 10vi); block-size: min(2rem, 10vi); }

    .page-button {
      min-block-size: min(2.75rem, max(2rem, 27dvh));
      padding-inline: min(.75rem, 3vi);
      border: 2px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    .page-button:disabled { color: var(--_metro-disabled); cursor: default; }
    .page-button:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
  `];

  declare multiple: boolean;
  declare fullScreen: boolean;
  declare backLabel: string;

  #inertSiblings: HTMLElement[] = [];
  #observer = new MutationObserver(records => {
    if (records.some(record => record.target !== this || record.type === 'childList')) this.choicesChanged();
  });

  constructor() {
    super();
    this.multiple = false;
    this.fullScreen = false;
    this.applyLabel = 'Done';
    this.backLabel = 'Back';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'selected', 'slot'],
    });
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    super.disconnectedCallback();
  }

  get value() { return this.selectedValues[0] ?? ''; }
  set value(value: string) { this.selectedValues = value ? [value] : []; }

  get selectedValues() { return this.currentSelection; }
  set selectedValues(values: readonly string[]) { this.currentSelection = values; }

  protected override get multipleMode() { return this.multiple; }
  protected override get fullScreenMode() { return this.fullScreen; }
  protected override get expandedMode() { return 'page' as const; }

  protected override presentPage(): void {
    const page = this.#page;
    if (!page) return;
    // Follow the flat tree so that forms in a shadow root or slot also become inactive.
    const siblings: HTMLElement[] = [];
    let branch: Element = page;
    while (branch !== this.ownerDocument.body) {
      if (branch instanceof HTMLElement && branch.inert) {
        this.close();
        return;
      }
      const slot = branch.assignedSlot;
      const parent: Node | null = slot ?? branch.parentNode;
      if (!(parent instanceof Element || parent instanceof ShadowRoot)) break;
      for (const sibling of slot?.assignedElements() ?? parent.children) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert
          && !sibling.matches('style, script, link, template')) siblings.push(sibling);
      }
      branch = parent instanceof ShadowRoot ? parent.host : parent;
    }
    page.showPopover();
    this.#inertSiblings = siblings;
    for (const sibling of siblings) sibling.inert = true;
  }

  protected override dismissPage(): void {
    for (const sibling of this.#inertSiblings) sibling.inert = false;
    this.#inertSiblings = [];
    const page = this.#page;
    if (page?.matches(':popover-open')) page.hidePopover();
  }

  protected override renderPage(title: string, list: ReturnType<typeof html>, applyDisabled: boolean) {
    return html`
      <section class="picker-page" part="page" id="picker" popover="manual" aria-labelledby="page-title"
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }}>
        <header class="page-header">
          <button type="button" class="page-button" part="back" @click=${() => this.close()}>${this.backLabel}</button>
          <h1 class="page-heading" part="page-heading" id="page-title">${title}</h1>
        </header>
        <div class="page-content">${list}</div>
        ${this.multiple ? html`
          <footer class="page-actions" part="actions">
            <button type="button" class="page-button" part="cancel" @click=${() => this.close()}>${this.cancelLabel}</button>
            <button type="button" class="page-button" part="apply" ?disabled=${applyDisabled}
              @click=${() => this.applyDraft()}>${this.applyLabel}</button>
          </footer>` : null}
      </section>
    `;
  }

  protected override get initialSelection(): readonly string[] {
    const selected = this.#options().filter(option => option.hasAttribute('selected')).map(option => option.value);
    if (this.multiple && selected.length) return selected;
    return this.defaultValue ? [this.defaultValue] : selected;
  }

  protected override get choices(): readonly PickerChoice[] {
    return this.#options().map(option => ({
      value: option.value,
      label: option.label || option.textContent?.trim() || option.value,
      disabled: option.disabled,
    }));
  }

  get #page() { return this.shadowRoot?.querySelector<HTMLElement>('.picker-page'); }

  #options(): MetroOption[] {
    const seen = new Set<string>();
    return Array.from(this.children).filter((child): child is MetroOption => {
      if (child.localName !== 'metro-option') return false;
      const option = child as MetroOption;
      if (!option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }
}

defineElement('metro-list-picker', MetroListPicker);

declare global {
  interface HTMLElementTagNameMap { 'metro-list-picker': MetroListPicker; }
}
