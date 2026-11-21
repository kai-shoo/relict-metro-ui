import { LitElement, css, html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AccessibleDescription } from './accessible-description.js';
import { metroTheme } from './theme.js';

type Editor = HTMLInputElement | HTMLTextAreaElement;

const editorAttributes = [
  'name', 'placeholder', 'autocomplete', 'inputmode', 'enterkeyhint', 'autocapitalize', 'spellcheck',
  'minlength', 'maxlength', 'pattern', 'readonly', 'required', 'aria-invalid',
];
const observedAttributes = [...editorAttributes, 'disabled', 'value', 'aria-label', 'aria-labelledby', 'aria-describedby'];

export abstract class TextControl extends LitElement {
  static readonly formAssociated = true;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    description: { type: String },
    value: { attribute: false, noAccessor: true },
  };

  static override get observedAttributes() {
    return [...super.observedAttributes, ...observedAttributes];
  }

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      min-inline-size: 0;
      max-inline-size: 100%;
      color: var(--_metro-fg);
    }

    .field {
      display: grid;
      gap: .25rem;
      padding-inline: var(--_metro-space);
    }

    .field-label, .description {
      color: var(--_metro-muted);
      overflow-wrap: anywhere;
    }

    .field-label { font-size: 1.25rem; }
    .description { font-size: .9375rem; }
    [hidden] { display: none; }

    .control {
      display: flex;
      align-items: stretch;
      min-inline-size: 0;
      border: 3px solid transparent;
      background: var(--metro-input-bg, var(--_metro-input-bg));
      color: var(--metro-input-fg, var(--_metro-input-fg));
    }

    .control:focus-within {
      border-color: var(--_metro-accent);
      background: var(--metro-input-focus-bg, light-dark(transparent, #fff));
    }

    .control:has(.editor:disabled) {
      border-color: var(--_metro-disabled);
      background: transparent;
      color: var(--_metro-disabled);
    }

    .field:has(.editor:disabled) :is(.field-label, .description) { color: var(--_metro-disabled); }

    .editor {
      box-sizing: border-box;
      flex: 1;
      min-inline-size: 0;
      inline-size: 100%;
      min-block-size: 2.375rem;
      margin: 0;
      padding: .125rem .25rem;
      border: 0;
      border-radius: 0;
      appearance: none;
      background: transparent;
      color: inherit;
      caret-color: currentColor;
      font: 400 1.5833rem / 1.3 var(--_metro-font);
      outline: none;
    }

    textarea { resize: vertical; }
    .editor:read-only:enabled { color: var(--metro-input-readonly-fg, light-dark(#0009, #000a)); }
    .editor:disabled { opacity: 1; }
    .editor::placeholder { color: currentColor; opacity: .68; }
    .editor::selection { background: var(--_metro-accent); color: var(--_metro-on-accent); }

    @media (forced-colors: active) {
      .control { border-color: CanvasText; }
      .control:focus-within { border-color: Highlight; }
      .editor::selection { background: Highlight; color: HighlightText; }
    }
  `];

  declare label: string;
  declare description: string;
  #internals = this.attachInternals();
  #editor: Editor | null = null;
  #pendingValue = '';
  #dirtyValue = false;
  #formDisabled = false;
  #customMessage = '';
  readonly #accessibleDescription = new AccessibleDescription(this);

  constructor() {
    super();
    this.label = '';
    this.description = '';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#synchronize();
    this.#syncDescription();
  }

  override disconnectedCallback(): void {
    this.#accessibleDescription.disconnect();
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observedAttributes.includes(name)) return;

    if (name === 'value' && !this.#dirtyValue) this.#writeValue(this.defaultValue);
    if (name === 'aria-describedby') this.#syncDescription();
    this.#synchronize();
    this.requestUpdate();
  }

  protected override updated(): void {
    const editor = this.shadowRoot?.querySelector<Editor>('.editor') ?? null;
    if (editor !== this.#editor) {
      const value = this.value;
      this.#editor = editor;
      this.#writeValue(value);
    }
    this.#synchronize();
    this.#syncDescription();
  }

  #syncDescription(): void {
    const own = this.shadowRoot?.querySelector<HTMLElement>('.description:not([hidden])') ?? null;
    this.#accessibleDescription.update(this.#editor, own);
  }

  get value() { return this.#editor?.value ?? this.#pendingValue; }
  set value(value: string) {
    this.#dirtyValue = true;
    this.#writeValue(String(value));
    this.#synchronize();
    this.requestUpdate();
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }

  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }

  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }

  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(value: boolean) { this.toggleAttribute('readonly', value); }

  get placeholder() { return this.getAttribute('placeholder') ?? ''; }
  set placeholder(value: string) { this.setAttribute('placeholder', value); }

  get autocomplete() { return this.getAttribute('autocomplete') ?? this.defaultAutocomplete; }
  set autocomplete(value: string) { this.setAttribute('autocomplete', value); }

  get maxLength() { return this.#editor?.maxLength ?? -1; }
  set maxLength(value: number) { this.setAttribute('maxlength', String(value)); }

  get minLength() { return this.#editor?.minLength ?? -1; }
  set minLength(value: number) { this.setAttribute('minlength', String(value)); }

  get pattern() { return this.getAttribute('pattern') ?? ''; }
  set pattern(value: string) { this.setAttribute('pattern', value); }

  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  setCustomValidity(message: string): void {
    this.#customMessage = String(message);
    this.#synchronize();
  }

  get selectionStart() { return this.#editor?.selectionStart ?? null; }
  get selectionEnd() { return this.#editor?.selectionEnd ?? null; }
  get selectionDirection() { return this.#editor?.selectionDirection ?? null; }

  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void {
    this.#editor?.setSelectionRange(start, end, direction);
  }

  select(): void { this.#editor?.select(); }

  override focus(options?: FocusOptions): void { this.#editor?.focus(options); }
  override blur(): void { this.#editor?.blur(); }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#synchronize();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.#dirtyValue = false;
    this.#writeValue(this.defaultValue);
    this.#synchronize();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (this.restoreValue && typeof state === 'string') this.value = state;
  }

  protected get editor() { return this.#editor; }
  protected get controlDisabled() { return this.disabled || this.#formDisabled; }
  protected get editorType() { return 'text'; }
  protected get editorRows() { return 0; }
  protected get restoreValue() { return true; }
  protected get defaultAutocomplete() { return ''; }
  protected get autocompleteText() { return true; }
  protected trailingControl(): TemplateResult | typeof nothing { return nothing; }

  #writeValue(value: string): void {
    if (!this.#editor) {
      this.#pendingValue = value;
      return;
    }
    if (value !== this.#editor.value) this.#editor.value = value;
  }

  #synchronize(): void {
    const editor = this.#editor;
    let flags: ValidityStateFlags = {};
    let message = '';
    if (editor) {
      for (const name of editorAttributes) {
        const value = this.getAttribute(name) ?? (
          name === 'autocomplete' ? this.defaultAutocomplete || null : null
        );
        if (value === editor.getAttribute(name)) continue;
        if (value === null) editor.removeAttribute(name);
        else editor.setAttribute(name, value);
      }
      if (editor.disabled !== this.controlDisabled) editor.disabled = this.controlDisabled;
      if (!this.autocompleteText) {
        editor.spellcheck = false;
        editor.autocapitalize = 'none';
      }
      editor.setCustomValidity(this.#customMessage);
      if (editor.willValidate && !editor.validity.valid) {
        flags = editor.validity;
        message = editor.validationMessage;
      }
    } else if (!this.controlDisabled && !this.readOnly) {
      flags = { valueMissing: this.required && !this.value, customError: Boolean(this.#customMessage) };
      message = this.#customMessage || (flags.valueMissing ? 'Please fill out this field.' : '');
    }
    this.#internals.setFormValue(this.value, this.restoreValue ? this.value : null);
    this.#internals.setValidity(flags, message, editor ?? undefined);
  }

  #accessibleLabel(hasLabel: boolean): string | undefined {
    const root = this.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      const ids = this.getAttribute('aria-labelledby')?.trim().split(/\s+/) ?? [];
      const names = ids.map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      if (names) return names;
    }
    const explicit = this.getAttribute('aria-label');
    if (explicit || hasLabel) return explicit || undefined;
    return Array.from(this.labels, label => label.textContent?.trim()).filter(Boolean).join(' ') || undefined;
  }

  #onInput(event: Event): void {
    if (event.target !== this.#editor) return;
    this.#dirtyValue = true;
    this.#synchronize();
    this.requestUpdate();
  }

  #onChange(event: Event): void {
    if (event.target !== this.#editor) return;
    this.#synchronize();
    if (event.composed) return;
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.target !== this.#editor || this.#editor instanceof HTMLTextAreaElement || event.key !== 'Enter'
      || event.isComposing || event.keyCode === 229 || event.repeat
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const form = this.form;
    if (!form) return;

    // A shadow editor has no outer form owner. Respect cancellation on the host first.
    setTimeout(() => {
      if (event.defaultPrevented || this.form !== form || this.controlDisabled) return;
      // form.elements excludes image submit buttons.
      const root = form.getRootNode() as Document | ShadowRoot;
      const submitter = Array.from(root.querySelectorAll('button, input, metro-button')).find(control => {
        const button = control as HTMLButtonElement;
        return button.form === form && (button.type === 'submit'
          || (control instanceof HTMLInputElement && control.type === 'image'));
      });
      if (submitter instanceof HTMLElement) submitter.click();
      else form.requestSubmit();
    });
  }

  protected override render() {
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const hasDescription = Boolean(this.description || this.querySelector(':scope > [slot="description"]'));
    const ariaLabel = ifDefined(this.#accessibleLabel(hasLabel));
    return html`
      <div class="field">
        <label class="field-label" part="label" for="editor" ?hidden=${!hasLabel}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </label>
        <div class="control" part="control" @input=${this.#onInput} @change=${this.#onChange} @keydown=${this.#onKeydown}>
          ${this.editorRows ? html`
            <textarea id="editor" class="editor" part="input" rows=${this.editorRows}
              aria-label=${ariaLabel}></textarea>
          ` : html`
            <input id="editor" class="editor" part="input" type=${this.editorType}
              aria-label=${ariaLabel}>
          `}
          ${this.trailingControl()}
        </div>
        <div class="description" id="description" part="description" ?hidden=${!hasDescription}>
          <slot name="description" @slotchange=${() => this.requestUpdate()}>${this.description}</slot>
        </div>
      </div>
    `;
  }
}
