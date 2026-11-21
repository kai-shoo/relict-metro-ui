import { LitElement, css, html, type PropertyDeclarations } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { AccessibleDescription } from './accessible-description.js';
import './dialog.js';
import type { MetroDialogCloseEvent } from './dialog.js';
import { pickerChevron } from './picker-chevron.js';
import { metroTheme } from './theme.js';

export interface PickerChoice {
  value: string;
  label: string;
  disabled?: boolean;
  shortLabel?: string;
}

const observed = ['value', 'name', 'required', 'disabled', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-invalid', 'lang'];
const manual = { attribute: false, noAccessor: true } as const;

export abstract class PickerControl extends LitElement {
  static readonly formAssociated = true;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    placeholder: { type: String },
    dialogLabel: { type: String, attribute: 'dialog-label' },
    applyLabel: { type: String, attribute: 'apply-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    emptyLabel: { type: String, attribute: 'empty-label' },
    unavailableLabel: { type: String, attribute: 'unavailable-label' },
    value: manual,
    defaultValue: manual,
    name: manual,
    required: manual,
    disabled: manual,
  };

  static override get observedAttributes() { return [...super.observedAttributes, ...observed]; }

  static override styles = [metroTheme, pickerChevron, css`
    :host { display: inline-block; min-inline-size: 0; max-inline-size: 100%; color: var(--_metro-fg); }
    .field { display: grid; padding-inline: var(--_metro-space); }
    .label {
      margin-block-end: .5rem;
      color: var(--_metro-muted);
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    .label[hidden] { display: none; }
    .field:has(.trigger:disabled) .label { color: var(--_metro-disabled); }

    .trigger {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--_metro-space);
      inline-size: 100%;
      min-block-size: 3.25rem;
      padding: .375rem .5rem;
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 400 1.4167rem / 1.3 var(--_metro-font);
      text-align: start;
      cursor: pointer;
    }
    .trigger:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .trigger[aria-expanded="true"] { border-color: var(--_metro-accent); }
    .trigger:disabled { color: var(--_metro-disabled); cursor: default; }
    .trigger-value { overflow-wrap: anywhere; }
    .chevron {
      flex: none;
      margin-inline: .375rem;
    }

    .inline {
      border: 3px solid var(--_metro-accent);
      border-block-start: 0;
      padding-block: .25rem;
    }

    .picker-dialog::part(surface) {
      inline-size: min(100%, 32rem);
      max-inline-size: 100%;
      block-size: 100dvh;
      max-block-size: 100dvh;
      margin: 0 auto;
      padding-inline: min(calc(var(--_metro-space) * 2), 6vi);
      padding-block: min(calc(var(--_metro-space) * 2), 6dvh);
      background: var(--metro-picker-bg, var(--_metro-chrome));
    }

    .picker-dialog[open]::part(surface) {
      display: grid;
      grid-template-rows: auto minmax(4.5rem, 1fr) auto;
    }

    .picker-dialog::part(body) {
      display: flex;
      flex-direction: column;
      min-block-size: 0;
    }

    .picker-dialog::part(heading) { font-size: min(2rem, max(32px, 12vi)); }

    .picker-dialog::part(actions) {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, max-content);
      gap: min(var(--_metro-space), 3vi);
      background: var(--metro-picker-bg, var(--_metro-chrome));
    }
    .picker-dialog > button[slot="actions"] { padding-inline: min(.75rem, 3vi); }

    .list {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      max-block-size: min(20rem, 60dvh);
      overflow: auto;
      overscroll-behavior: contain;
      list-style: none;
    }

    .picker-dialog .list {
      flex: 1 1 auto;
      min-block-size: 0;
      max-block-size: none;
    }

    .option {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: var(--_metro-space);
      inline-size: 100%;
      min-block-size: 3rem;
      padding: .625rem .5rem;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 400 1.4167rem / 1.15 var(--_metro-font);
      text-align: start;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    .picker-dialog .option {
      min-block-size: 4.5rem;
      gap: min(var(--_metro-space), 4vi);
      font-size: min(2rem, max(32px, 14vi));
      font-weight: 300;
    }
    .option[aria-selected="true"], .option:active:enabled {
      background: var(--_metro-accent);
      color: var(--_metro-on-accent);
    }
    .option:disabled { color: var(--_metro-disabled); cursor: default; }
    .trigger:focus-visible, .option:focus-visible, .list:focus-visible {
      outline: 2px solid var(--_metro-focus);
      outline-offset: -2px;
    }

    .mark {
      display: inline-grid;
      place-items: center;
      box-sizing: border-box;
      flex: none;
      inline-size: 2rem;
      block-size: 2rem;
      border: 3px solid currentColor;
    }
    .picker-dialog .mark { inline-size: min(2rem, 10vi); block-size: min(2rem, 10vi); }
    .option[aria-selected="true"] .mark::after {
      content: '';
      inline-size: min(1rem, 5vi);
      block-size: .5rem;
      margin-block-start: -.25rem;
      border-bottom: 3px solid currentColor;
      border-left: 3px solid currentColor;
      transform: rotate(-45deg);
    }

    .status { margin: 0; padding: .5rem; color: var(--_metro-muted); font-size: 1rem; }

    @media (forced-colors: active) {
      .trigger:focus-visible, .option:focus-visible, .list:focus-visible { outline-color: Highlight; }
      .option[aria-selected="true"] { color: SelectedItemText; background: SelectedItem; forced-color-adjust: none; }
    }

    @media (prefers-reduced-motion: no-preference) {
      .inline { animation: metro-picker-expand min(200ms, var(--_metro-motion)) ease-out; }
      @keyframes metro-picker-expand { from { opacity: 0; } }
    }
  `];

  declare label: string;
  declare placeholder: string;
  declare dialogLabel: string;
  declare applyLabel: string;
  declare cancelLabel: string;
  declare emptyLabel: string;
  declare unavailableLabel: string;

  #internals = this.attachInternals();
  #requested: readonly string[] | undefined;
  #mode: 'inline' | 'dialog' | 'page' | undefined;
  #draft: readonly string[] = [];
  #activeKey: string | undefined;
  #opening = 0;
  #fieldsetDisabled = false;
  #customMessage = '';
  #prefix = '';
  #prefixAt = 0;
  #hadListFocus = false;
  readonly #accessibleDescription = new AccessibleDescription(this);

  constructor() {
    super();
    this.label = '';
    this.placeholder = 'Choose an option';
    this.dialogLabel = '';
    this.applyLabel = 'Apply';
    this.cancelLabel = 'Cancel';
    this.emptyLabel = 'No options available';
    this.unavailableLabel = 'A selected option is no longer available.';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncForm();
    this.#accessibleDescription.update(this.#trigger);
  }

  override disconnectedCallback(): void {
    const mode = this.#mode;
    this.#mode = undefined;
    this.#opening++;
    if (mode === 'page') this.dismissPage();
    const dialog = this.#dialog;
    if (dialog) dialog.open = false;
    this.requestUpdate();
    this.#accessibleDescription.disconnect();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;
    if (name === 'aria-describedby') this.#accessibleDescription.update(this.#trigger);
    this.#syncForm();
    this.requestUpdate();
  }

  protected override willUpdate(): void {
    this.#hadListFocus = this.open && this.#listHasFocus;
  }

  protected override updated(): void {
    this.#syncForm();
    this.#accessibleDescription.update(this.#trigger);
    if (!this.#hadListFocus) return;
    const active = this.shadowRoot?.activeElement;
    if (!this.#listHasFocus || active?.matches('[data-choice]:disabled')
      || (this.#activeKey && active?.matches('.list'))) this.#focusChoice();
  }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }
  get open() { return this.#mode !== undefined; }

  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  setCustomValidity(message: string): void {
    this.#customMessage = String(message);
    this.#syncForm();
  }

  override focus(options?: FocusOptions): void { this.#trigger?.focus(options); }
  override blur(): void { this.#trigger?.blur(); }

  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled;
    this.#syncForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.close();
    this.#requested = undefined;
    this.#syncForm();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state !== 'string') return;
    try {
      const values: unknown = JSON.parse(state);
      if (Array.isArray(values) && values.every(value => typeof value === 'string')) this.currentSelection = values;
    } catch {
      // State from a previous version has no selection to restore.
    }
  }

  showPicker(): void {
    if (!this.isConnected || this.open || this.#controlDisabled) return;
    this.#mode = this.#preferredMode;
    this.#draft = this.currentSelection;
    this.#activeKey = this.#draft[0] ?? this.#enabledChoices[0]?.value;
    this.#prefix = '';
    const opening = ++this.#opening;
    this.requestUpdate();
    void this.#present(opening);
  }

  close(): void {
    if (!this.open) return;
    if (this.#mode === 'dialog' && this.#dialog?.close()) return;
    this.#dismiss(true);
  }

  protected abstract get choices(): readonly PickerChoice[];
  protected abstract get initialSelection(): readonly string[];
  protected get multipleMode() { return false; }
  protected get fullScreenMode() { return false; }
  protected get expandedMode(): 'dialog' | 'page' { return 'dialog'; }

  protected presentPage(): void {}
  protected dismissPage(): void {}

  protected renderPage(_title: string, _list: ReturnType<typeof html>, _applyDisabled: boolean) {
    return html``;
  }

  protected applyDraft(): void {
    if (this.#mode !== 'page' || this.#controlDisabled) return;
    const draft = this.#draft;
    this.close();
    this.#commit(draft);
  }

  protected get currentSelection(): readonly string[] {
    return this.#normalize(this.#requested ?? this.initialSelection);
  }

  protected set currentSelection(values: readonly string[]) {
    this.#requested = [...values];
    if (this.open) this.#draft = this.currentSelection;
    this.#syncForm();
    this.requestUpdate();
  }

  protected orderSelection(values: string[]): string[] { return values; }

  protected summarize(selection: readonly PickerChoice[]): string {
    return selection.map(choice => choice.label).join(', ');
  }

  protected choicesChanged(): void {
    if (this.open && !this.#enabledChoices.some(choice => choice.value === this.#activeKey)) {
      this.#activeKey = this.#enabledChoices[0]?.value;
    }
    this.#syncForm();
    this.requestUpdate();
  }

  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }
  get #trigger() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger') ?? null; }
  get #dialog() { return this.shadowRoot?.querySelector('metro-dialog') ?? null; }
  get #enabledChoices() { return this.choices.filter(choice => !choice.disabled); }
  get #listHasFocus() { return this.shadowRoot?.activeElement?.matches('[data-choice], .list') ?? false; }

  get #preferredMode() {
    return this.multipleMode || this.fullScreenMode || this.choices.length > 5 ? this.expandedMode : 'inline';
  }

  #normalize(values: readonly string[]): string[] {
    const requested = new Set(values);
    const valid = this.#enabledChoices.filter(choice => requested.has(choice.value)).map(choice => choice.value);
    return this.multipleMode ? this.orderSelection(valid) : valid.slice(0, 1);
  }

  #syncForm(): void {
    const selection = this.currentSelection;
    const disabled = this.#controlDisabled;
    const trigger = this.#trigger;
    if (trigger) trigger.disabled = disabled;
    if (disabled && this.open) this.close();
    let data: string | FormData | null = selection[0] ?? null;
    if (this.multipleMode && this.name && selection.length) {
      data = new FormData();
      for (const value of selection) data.append(this.name, value);
    }
    this.#internals.setFormValue(data, JSON.stringify(selection));
    const valueMissing = this.required && !selection.length && !disabled;
    const customError = Boolean(this.#customMessage) && !disabled;
    if (valueMissing || customError) {
      this.#internals.setValidity(
        { valueMissing, customError },
        this.#customMessage || 'Choose an option.',
        trigger ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  async #present(opening: number): Promise<void> {
    await this.updateComplete;
    if (opening !== this.#opening || !this.open) return;
    const dialog = this.#dialog;
    if (dialog) {
      dialog.show(this.#trigger ?? undefined);
      await dialog.updateComplete;
    } else if (this.#mode === 'page') this.presentPage();
    if (opening === this.#opening && this.open) this.#focusChoice();
  }

  #focusChoice(): void {
    if (!this.open) return;
    const list = this.shadowRoot?.querySelector<HTMLElement>('.list');
    const target = Array.from(list?.querySelectorAll<HTMLButtonElement>('button[data-choice]:enabled') ?? [])
      .find(button => button.dataset.choice === this.#activeKey);
    (target ?? list)?.focus({ preventScroll: true });
    if (!list || !target) return;
    const bounds = list.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    if (item.top < bounds.top || item.height > list.clientHeight) list.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom) list.scrollTop += item.bottom - bounds.bottom;
  }

  #dismiss(restoreFocus: boolean): void {
    const mode = this.#mode;
    this.#mode = undefined;
    this.#opening++;
    if (mode === 'page') this.dismissPage();
    if (restoreFocus) this.focus({ preventScroll: true });
    this.requestUpdate();
  }

  #commit(values: readonly string[]): void {
    const next = this.#normalize(values);
    if (this.required && !next.length) return;
    const previous = this.currentSelection;
    if (next.length === previous.length && next.every((value, index) => value === previous[index])) return;
    this.currentSelection = next;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #choose(value: string): void {
    if (!this.open || this.#controlDisabled || !this.#enabledChoices.some(choice => choice.value === value)) return;
    if (!this.multipleMode) {
      this.close();
      this.#commit([value]);
      return;
    }
    this.#draft = this.#draft.includes(value) ? this.#draft.filter(key => key !== value) : [...this.#draft, value];
    this.requestUpdate();
  }

  #onClose(event: MetroDialogCloseEvent): void {
    event.stopPropagation();
    this.#dismiss(false);
    if (event.detail.reason === 'action' && event.detail.value === 'apply' && !this.#controlDisabled) this.#commit(this.#draft);
  }

  #onTrigger(): void {
    if (this.open) this.close();
    else this.showPicker();
  }

  #onFocusout(): void {
    if (this.#mode !== 'inline') return;
    queueMicrotask(() => {
      if (this.#mode === 'inline' && !this.shadowRoot?.activeElement?.closest('.field')) this.#dismiss(false);
    });
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.#mode === 'inline') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const choices = this.#enabledChoices;
    if (!choices.length) return;
    const current = choices.findIndex(choice => choice.value === this.#activeKey);
    let next: PickerChoice | undefined;
    switch (event.key) {
      case 'ArrowDown': next = choices[Math.min(current + 1, choices.length - 1)]; break;
      case 'ArrowUp': next = choices[Math.max(current - 1, 0)]; break;
      case 'Home': next = choices[0]; break;
      case 'End': next = choices.at(-1); break;
      default:
        if (event.key.length === 1 && event.key !== ' ') next = this.#typeAhead(event.key, choices, current);
    }
    if (!next) return;
    event.preventDefault();
    this.#activeKey = next.value;
    this.requestUpdate();
    this.#focusChoice();
  }

  #typeAhead(key: string, choices: readonly PickerChoice[], current: number): PickerChoice | undefined {
    const time = performance.now();
    this.#prefix = (time - this.#prefixAt < 700 ? this.#prefix : '') + key.toLocaleLowerCase();
    this.#prefixAt = time;
    const repeated = Array.from(this.#prefix).every(letter => letter === this.#prefix[0]);
    const prefix = repeated ? this.#prefix[0] : this.#prefix;
    const ordered = [...choices.slice(current + 1), ...choices.slice(0, current + 1)];
    return ordered.find(choice => choice.label.toLocaleLowerCase().startsWith(prefix));
  }

  #accessibleLabel(hasLabel: boolean): string {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    if (ids && (root instanceof Document || root instanceof ShadowRoot)) {
      const names = ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    return this.getAttribute('aria-label')
      || (!hasLabel && Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' '))
      || '';
  }

  #renderList(choices: readonly PickerChoice[], name: string) {
    const hasAvailable = choices.some(choice => !choice.disabled);
    const selection = this.#normalize(this.#draft);
    return html`
      <ul class="list" id=${ifDefined(this.#mode === 'inline' ? 'picker' : undefined)}
        part="list" role="listbox" aria-label=${name}
        tabindex=${hasAvailable ? '-1' : '0'} aria-multiselectable=${ifDefined(this.multipleMode ? 'true' : undefined)}
        @keydown=${this.#onKeydown}>
        ${repeat(choices, choice => choice.value, choice => html`
          <li role="presentation">
            <button type="button" class="option" part="option" role="option" data-choice=${choice.value}
              tabindex=${choice.value === this.#activeKey && !choice.disabled ? '0' : '-1'}
              aria-selected=${String(selection.includes(choice.value))} ?disabled=${choice.disabled}
              @focus=${() => { this.#activeKey = choice.value; this.requestUpdate(); }}
              @click=${() => this.#choose(choice.value)}>
              ${this.multipleMode ? html`<span class="mark" part="mark" aria-hidden="true"></span>` : null}
              ${choice.label}
            </button>
          </li>
        `)}
      </ul>
      ${!hasAvailable ? html`<p class="status" part="status" role="status">${this.emptyLabel}</p>` : null}
      ${this.#draft.some(key => !selection.includes(key))
        ? html`<p class="status" part="status" role="status">${this.unavailableLabel}</p>` : null}
    `;
  }

  protected override render() {
    const choices = this.choices;
    const selection = this.currentSelection;
    const summary = this.summarize(choices.filter(choice => selection.includes(choice.value)));
    const text = summary || (choices.some(choice => !choice.disabled) ? this.placeholder : this.emptyLabel);
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const ariaLabel = this.#accessibleLabel(hasLabel);
    const title = this.dialogLabel || this.label || ariaLabel || 'Choose an option';
    const mode = this.#mode ?? this.#preferredMode;
    return html`
      <div class="field" @focusout=${this.#onFocusout}>
        <label class="label" part="label" id="label" for="trigger" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <button type="button" class="trigger" part="trigger" id="trigger"
          aria-label=${ifDefined(ariaLabel ? `${ariaLabel}, ${text}` : undefined)}
          aria-labelledby=${ifDefined(hasLabel && !ariaLabel ? 'label value' : undefined)}
          aria-haspopup=${ifDefined(mode === 'page' ? undefined : mode === 'dialog' ? 'dialog' : 'listbox')}
          aria-expanded=${String(this.open)} aria-controls=${ifDefined(this.open ? 'picker' : undefined)}
          aria-invalid=${ifDefined(this.getAttribute('aria-invalid') ?? undefined)}
          ?disabled=${this.#controlDisabled} @click=${this.#onTrigger}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === 'ArrowDown' && !this.open) {
              event.preventDefault();
              this.showPicker();
            } else if (event.key === 'Escape' && this.#mode === 'inline') {
              event.preventDefault();
              event.stopPropagation();
              this.close();
            }
          }}>
          <span class="trigger-value" id="value" part="value">${text}</span><span class="chevron" aria-hidden="true"></span>
        </button>
        ${this.#mode === 'inline' ? html`
          <div class="inline" part="inline">${this.#renderList(choices, title)}</div>
        ` : null}
      </div>
      ${this.#mode === 'dialog' ? html`
        <metro-dialog class="picker-dialog" id="picker" .label=${title} exportparts="surface:dialog, heading:dialog-heading, actions"
          @metro-before-close=${(event: Event) => event.stopPropagation()} @metro-close=${this.#onClose}>
          ${this.#renderList(choices, title)}
          <button type="button" slot="actions" part="cancel" data-metro-value="cancel">${this.cancelLabel}</button>
          ${this.multipleMode ? html`<button type="button" slot="actions" part="apply" data-metro-value="apply"
            ?disabled=${this.required && !this.#normalize(this.#draft).length}>${this.applyLabel}</button>` : null}
        </metro-dialog>
      ` : null}
      ${this.#mode === 'page'
        ? this.renderPage(title, this.#renderList(choices, title), this.required && !this.#normalize(this.#draft).length)
        : null}
    `;
  }
}
