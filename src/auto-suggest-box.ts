import { LitElement, css, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { observeAnchorScroll } from './anchored-scroll.js';
import { defineElement } from './define.js';
import { revealVertically } from './focus-target.js';
import { metroTheme } from './theme.js';

export interface MetroSuggestion {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
}

export interface MetroQueryDetail {
  query: string;
  queryId: number;
}

export interface MetroSubmitDetail {
  query: string;
  item?: MetroSuggestion;
}

export interface MetroSuggestionOptions {
  status?: 'ready' | 'loading' | 'error';
  message?: string;
}

export class MetroAutoSuggestBox extends LitElement {
  static override properties = {
    value: { type: String, noAccessor: true },
    label: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    clearLabel: { type: String, attribute: 'clear-label' },
    suggestionsLabel: { type: String, attribute: 'suggestions-label' },
    loadingLabel: { type: String, attribute: 'loading-label' },
    emptyLabel: { type: String, attribute: 'empty-label' },
    errorLabel: { type: String, attribute: 'error-label' },
    ariaLabel: { type: String, attribute: 'aria-label', reflect: true },
  };

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      min-inline-size: 0;
      max-inline-size: 100%;
      color: var(--_metro-fg);
    }

    .field { display: grid; gap: .25rem; padding-inline: var(--_metro-space); }
    .label { color: var(--_metro-muted); font-size: 1.25rem; overflow-wrap: anywhere; }
    .label[hidden] { display: none; }
    :host([disabled]) .label { color: var(--_metro-disabled); }

    .anchor { position: relative; min-inline-size: 0; }

    .control {
      display: flex;
      min-inline-size: 0;
      border: 3px solid transparent;
      background: var(--metro-input-bg, var(--_metro-input-bg));
      color: var(--metro-input-fg, var(--_metro-input-fg));
    }

    .control:focus-within {
      border-color: var(--_metro-accent);
      background: var(--metro-input-focus-bg, light-dark(transparent, #fff));
    }

    :host([disabled]) .control {
      border-color: var(--_metro-disabled);
      background: transparent;
      color: var(--_metro-disabled);
    }

    input, button {
      box-sizing: border-box;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
    }

    input {
      flex: 1;
      min-inline-size: 0;
      inline-size: 100%;
      min-block-size: 2.5rem;
      padding: .125rem .25rem;
      appearance: none;
      caret-color: currentColor;
      font: 400 1.5833rem / 1.3 var(--_metro-font);
      outline: none;
    }

    input::selection { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    input::placeholder { color: currentColor; opacity: .68; }
    input:disabled { opacity: 1; }

    .clear {
      position: relative;
      flex: none;
      min-inline-size: 2.75rem;
      min-block-size: 2.75rem;
      padding: 0;
      cursor: pointer;
    }

    .clear:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }
    .clear:active { background: var(--_metro-accent); color: var(--_metro-on-accent); }

    .clear::before, .clear::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      inline-size: 1rem;
      border-block-start: 2px solid currentColor;
      transform: translate(-50%, -50%) rotate(45deg);
    }

    .clear::after { transform: translate(-50%, -50%) rotate(-45deg); }

    .popup {
      position: fixed;
      z-index: var(--metro-suggest-z-index, 2);
      inset: auto;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      max-block-size: var(--_suggest-space, 100dvh);
      margin: 0;
      padding: 0;
      overflow: hidden;
      border: 3px solid var(--_metro-accent);
      background: var(--metro-suggest-bg, var(--_metro-bg));
      color: var(--metro-suggest-fg, var(--_metro-fg));
    }

    .popup:not(:popover-open), .suggestions[hidden] { display: none; }

    .suggestions {
      box-sizing: border-box;
      min-block-size: 0;
      max-block-size: min(16rem, 55dvh);
      overflow: auto;
      overscroll-behavior: contain;
      margin: 0;
      padding: .5rem 0;
      list-style: none;
    }

    .suggestion {
      min-block-size: 2.75rem;
      box-sizing: border-box;
      padding: .4375rem .5rem;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
      cursor: pointer;
      user-select: none;
    }

    .suggestion[aria-selected="true"] { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .suggestion[aria-disabled="true"] { color: var(--_metro-disabled); cursor: default; }

    .status {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      clip-path: inset(50%);
      overflow: hidden;
    }

    .feedback {
      box-sizing: border-box;
      min-block-size: 0;
      margin: 0;
      padding: .5rem;
      overflow: auto;
      color: var(--_metro-muted);
      font-size: 1.125rem;
      overflow-wrap: anywhere;
    }

    @media (forced-colors: active) {
      .control { border-color: ButtonText; }
      .control:focus-within, .popup { border-color: Highlight; }
      .suggestion[aria-selected="true"] { background: Highlight; color: HighlightText; forced-color-adjust: none; }
    }
  `];

  declare label: string;
  declare placeholder: string;
  declare disabled: boolean;
  declare clearLabel: string;
  declare suggestionsLabel: string;
  declare loadingLabel: string;
  declare emptyLabel: string;
  declare errorLabel: string;

  #value = '';
  #sequence = 0;
  #currentQuery: MetroQueryDetail | undefined;
  #items: readonly MetroSuggestion[] = [];
  #outcome: MetroSuggestionOptions = {};
  #activeId: string | undefined;
  #reveal = false;
  #composing = false;
  #lastEdited = '';
  #positionEvents?: AbortController;
  #anchorSize?: ResizeObserver;

  constructor() {
    super();
    this.label = '';
    this.placeholder = '';
    this.disabled = false;
    this.clearLabel = 'Clear search';
    this.suggestionsLabel = 'Suggestions';
    this.loadingLabel = 'Searching…';
    this.emptyLabel = 'No suggestions found';
    this.errorLabel = 'Suggestions are unavailable';
  }

  get value() { return this.#value; }
  set value(value: string) {
    const next = String(value).replace(/[\r\n]/g, '');
    if (next === this.#value) return;
    this.#updateValue(next);
    if (this.#input) this.#input.value = next;
    this.#lastEdited = next;
    this.#invalidateQuery();
  }

  get open() {
    return this.#reveal && !this.disabled && this.shadowRoot?.activeElement === this.#input;
  }

  override disconnectedCallback(): void {
    this.#stopPositioning();
    this.#composing = false;
    this.#invalidateQuery();
    super.disconnectedCallback();
  }

  protected override updated(): void {
    const input = this.#input;
    if (input && input.value !== this.value) input.value = this.value;
    if (this.disabled && this.#currentQuery) this.#invalidateQuery();
    this.#updatePopup();
  }

  override focus(options?: FocusOptions): void { this.#input?.focus(options); }
  override blur(): void { this.#input?.blur(); }

  close(): void {
    this.#reveal = false;
    this.#activeId = undefined;
    this.requestUpdate();
  }

  requestSuggestions(): number {
    if (this.disabled || this.#composing) return this.#sequence;
    const query = this.value;
    const queryId = ++this.#sequence;
    this.#currentQuery = { query, queryId };
    this.#lastEdited = query;
    this.#items = [];
    this.#activeId = undefined;
    this.#reveal = Boolean(query.trim());
    this.#outcome = { status: 'loading' };
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent<MetroQueryDetail>('metro-query', {
      detail: { query, queryId }, bubbles: true, composed: true,
    }));
    return queryId;
  }

  setSuggestions(queryId: number, suggestions: readonly MetroSuggestion[], options: MetroSuggestionOptions = {}): boolean {
    const query = this.#currentQuery;
    if (!query || query.queryId !== queryId || query.query !== this.value || !query.query.trim() || this.disabled) return false;

    const next: MetroSuggestion[] = [];
    const seen = new Set<string>();
    const status = options.status ?? 'ready';
    if (status === 'ready') {
      for (const item of suggestions) {
        if (!item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        next.push({ ...item, label: item.label || item.value || item.id });
      }
    }
    if (!next.some(item => item.id === this.#activeId && !item.disabled)) this.#activeId = undefined;
    this.#items = next;
    this.#outcome = { status, message: options.message };
    this.requestUpdate();
    return true;
  }

  get #input() { return this.shadowRoot?.querySelector('input') ?? null; }

  #updateValue(value: string): void {
    if (this.value === value) return;
    const previous = this.value;
    this.#value = value;
    this.requestUpdate('value', previous);
  }

  #invalidateQuery(): void {
    this.#currentQuery = undefined;
    this.#items = [];
    this.#outcome = {};
    this.close();
  }

  #onInput(event: InputEvent): void {
    this.#updateValue((event.currentTarget as HTMLInputElement).value);
    if (!event.isComposing && !this.#composing && this.value !== this.#lastEdited) this.requestSuggestions();
  }

  #onCompositionStart(): void {
    this.#composing = true;
    this.#invalidateQuery();
  }

  #onCompositionEnd(): void {
    this.#composing = false;
    queueMicrotask(() => {
      if (this.#composing || !this.isConnected || !this.#input) return;
      this.#updateValue(this.#input.value);
      if (this.value !== this.#lastEdited || !this.#currentQuery) this.requestSuggestions();
    });
  }

  #retainFocus(event: MouseEvent): void {
    if (event.button === 0) event.preventDefault();
  }

  #clear(): void {
    if (this.disabled || !this.value) return;
    this.#composing = false;
    this.value = '';
    this.focus();
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
    this.requestSuggestions();
  }

  #submit(item?: MetroSuggestion): void {
    const previous = this.value;
    if (item) this.value = item.value ?? item.label;
    if (!item && !this.value.trim()) return;
    this.#invalidateQuery();
    this.focus();
    const query = this.value;
    if (previous !== query) {
      this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }));
    }
    this.dispatchEvent(new CustomEvent<MetroSubmitDetail>('metro-submit', {
      detail: item ? { query, item } : { query },
      bubbles: true, composed: true,
    }));
  }

  #choose(id: string): void {
    if (!this.open) return;
    const item = this.#items.find(candidate => candidate.id === id && !candidate.disabled);
    if (item) this.#submit(item);
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || this.disabled || this.#composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Enter' && this.value.trim() && !event.repeat) {
      event.preventDefault();
      this.#submit(this.open ? this.#items.find(item => item.id === this.#activeId && !item.disabled) : undefined);
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && this.#currentQuery?.query.trim()) {
      event.preventDefault();
      this.#reveal = true;
      const enabled = this.#items.filter(item => !item.disabled);
      if (enabled.length) {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const active = enabled.findIndex(item => item.id === this.#activeId);
        const next = active === -1
          ? (direction === 1 ? 0 : enabled.length - 1)
          : (active + direction + enabled.length) % enabled.length;
        this.#activeId = enabled[next].id;
      }
      this.requestUpdate();
    }
    if (this.#activeId && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      this.#activeId = undefined;
      this.requestUpdate();
    }
  }

  #scrollActiveIntoView(): void {
    if (!this.open || !this.#activeId) return;
    const list = this.shadowRoot?.querySelector<HTMLElement>('.suggestions');
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && active) revealVertically(active, list);
  }

  #updatePopup(): void {
    const popup = this.shadowRoot?.querySelector<HTMLElement>('.popup');
    const control = this.shadowRoot?.querySelector<HTMLElement>('.control');
    const view = this.ownerDocument.defaultView;
    if (!popup || !control || !view || !this.isConnected) return;
    if (!this.open) {
      if (popup.matches(':popover-open')) popup.hidePopover();
      this.#stopPositioning();
      return;
    }
    if (!popup.matches(':popover-open')) popup.showPopover();
    if (!this.#positionEvents) {
      this.#positionEvents = new AbortController();
      const { signal } = this.#positionEvents;
      view.addEventListener('resize', this.#positionPopup, { signal });
      view.visualViewport?.addEventListener('resize', this.#positionPopup, { signal });
      view.visualViewport?.addEventListener('scroll', this.#positionPopup, { signal });
      observeAnchorScroll(this, this.#positionPopup, signal);
      this.#anchorSize = new ResizeObserver(this.#positionPopup);
      this.#anchorSize.observe(control);
    }
    this.#positionPopup();
  }

  #stopPositioning(): void {
    this.#positionEvents?.abort();
    this.#positionEvents = undefined;
    this.#anchorSize?.disconnect();
    this.#anchorSize = undefined;
  }

  #positionPopup = (): void => {
    const popup = this.shadowRoot?.querySelector<HTMLElement>('.popup');
    const control = this.shadowRoot?.querySelector<HTMLElement>('.control');
    const content = popup?.querySelector<HTMLElement>('.suggestions:not([hidden]), .feedback');
    const view = this.ownerDocument.defaultView;
    if (!popup || !control || !content || !view || !this.open) return;

    const rect = control.getBoundingClientRect();
    const viewport = view.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? this.ownerDocument.documentElement.clientWidth;
    const bottom = top + (viewport?.height ?? this.ownerDocument.documentElement.clientHeight);
    if (rect.bottom <= top || rect.top >= bottom) { this.close(); return; }

    const width = Math.min(rect.width, viewportWidth);
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(left, Math.min(rect.left, left + viewportWidth - width))}px`;

    const contentLimit = parseFloat(view.getComputedStyle(content).maxBlockSize);
    const preferred = Math.min(content.scrollHeight, Number.isFinite(contentLimit) ? contentLimit : Infinity)
      + popup.offsetHeight - popup.clientHeight;
    const below = bottom - rect.bottom;
    const above = rect.top - top;
    const flip = preferred > below && above > below;
    popup.style.setProperty('--_suggest-space', `${Math.max(0, flip ? above : below)}px`);
    popup.style.top = `${flip ? rect.top - popup.getBoundingClientRect().height : rect.bottom}px`;
    this.#scrollActiveIntoView();
  };

  #statusText(): string {
    if (!this.open) return '';
    if (this.#outcome.message !== undefined) return this.#outcome.message;
    if (this.#outcome.status === 'loading') return this.loadingLabel;
    if (this.#outcome.status === 'error') return this.errorLabel;
    if (!this.#items.length) return this.emptyLabel;
    return `${this.#items.length} ${this.#items.length === 1 ? 'suggestion' : 'suggestions'}`;
  }

  protected override render() {
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const showList = this.open && Boolean(this.#items.length);
    const selectedIndex = this.#items.findIndex(item => item.id === this.#activeId);
    const status = this.#statusText();
    return html`
      <div class="field">
        <label class="label" part="label" for="query" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <div class="anchor">
          <div class="control" part="control">
            <input id="query" part="input" type="text" inputmode="search" enterkeyhint="search"
              autocomplete="off" role="combobox" aria-autocomplete="list"
              aria-label=${ifDefined(this.ariaLabel || undefined)}
              aria-expanded=${String(showList)} aria-controls="suggestions"
              aria-activedescendant=${ifDefined(showList && selectedIndex >= 0 ? `option-${selectedIndex}` : undefined)}
              placeholder=${this.placeholder} ?disabled=${this.disabled}
              @input=${this.#onInput} @compositionstart=${this.#onCompositionStart} @compositionend=${this.#onCompositionEnd}
              @focus=${() => this.requestUpdate()} @blur=${this.close} @keydown=${this.#onKeydown}>
            ${this.value && !this.disabled ? html`
              <button class="clear" type="button" part="clear" aria-label=${this.clearLabel}
                @mousedown=${this.#retainFocus} @click=${this.#clear}></button>
            ` : nothing}
          </div>
          <div class="popup" part="popup" popover="manual">
            <ul id="suggestions" class="suggestions" part="list" role="listbox" aria-label=${this.suggestionsLabel} ?hidden=${!showList}>
              ${repeat(this.#items, item => item.id, (item, index) => html`
                <li id=${`option-${index}`} class="suggestion" part="option" role="option"
                  aria-selected=${String(this.#activeId === item.id)} aria-disabled=${ifDefined(item.disabled ? 'true' : undefined)}
                  @mousedown=${this.#retainFocus} @click=${() => this.#choose(item.id)}>${item.label}</li>
              `)}
            </ul>
            ${this.open && !showList ? html`<p class="feedback" part="status" aria-hidden="true">${status}</p>` : nothing}
          </div>
          <div class="status" role="status" aria-atomic="true">${status}</div>
        </div>
      </div>
    `;
  }
}

defineElement('metro-auto-suggest-box', MetroAutoSuggestBox);

declare global {
  interface HTMLElementTagNameMap {
    'metro-auto-suggest-box': MetroAutoSuggestBox;
  }
  interface HTMLElementEventMap {
    'metro-query': CustomEvent<MetroQueryDetail>;
    'metro-submit': CustomEvent<MetroSubmitDetail>;
  }
}
