import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import './menu-flyout.js';
import type { MetroCommandEvent } from './command-bar.js';
import type { MetroMenuFlyout } from './menu-flyout.js';
import { metroTheme } from './theme.js';

export type MetroTextFormat = 'bold' | 'italic' | 'underline';

export interface MetroRichTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type MetroRichClipboardAction = 'copy' | 'cut' | 'paste';

export interface MetroRichClipboardAdapter {
  readText?(signal: AbortSignal): Promise<string | null>;
  writeText?(text: string, signal: AbortSignal): Promise<void>;
}

export interface MetroRichClipboardResultDetail {
  readonly action: MetroRichClipboardAction;
  readonly status: 'complete' | 'unavailable' | 'empty' | 'stale' | 'error';
}

export type MetroRichClipboardResultEvent = CustomEvent<MetroRichClipboardResultDetail>;

interface EditSelection {
  readonly startContainer: Node;
  readonly startOffset: number;
  readonly endContainer: Node;
  readonly endOffset: number;
  readonly backward: boolean;
}

interface ClipboardContext {
  readonly editor: HTMLDivElement;
  readonly version: number;
  readonly selection: EditSelection;
}

const formats = ['bold', 'italic', 'underline'] as const;
const clipboardActions = ['copy', 'cut', 'paste'] as const;
const symbols = { bold: 'B', italic: 'I', underline: 'U' };
const blocks = new Set(['DIV', 'P']);
const manual = { attribute: false, noAccessor: true } as const;
const observed = ['value', 'document-key', 'name', 'required', 'disabled', 'readonly', 'aria-label', 'aria-labelledby', 'aria-invalid'];
const clipboardCancelled = Symbol('clipboard cancelled');
const clipboardAnnouncements = {
  unavailable: 'This clipboard action is unavailable.',
  empty: 'There is no text for this clipboard action.',
  stale: '',
  error: 'The clipboard action failed.',
};
const clipboardSuccess = { copy: 'Text copied.', cut: 'Text cut.', paste: 'Text pasted.' };

function sameSelection(a: EditSelection | null, b: EditSelection | null): boolean {
  return a === b || Boolean(a && b && a.startContainer === b.startContainer && a.startOffset === b.startOffset
    && a.endContainer === b.endContainer && a.endOffset === b.endOffset && a.backward === b.backward);
}

function collapsed(selection: EditSelection): boolean {
  return selection.startContainer === selection.endContainer && selection.startOffset === selection.endOffset;
}

function appendRun(runs: MetroRichTextRun[], text: string, style: Omit<MetroRichTextRun, 'text'> = {}): void {
  if (!text) return;
  const previous = runs.at(-1);
  if (previous && formats.every(format => Boolean(previous[format]) === Boolean(style[format]))) {
    previous.text += text;
    return;
  }
  runs.push({
    text,
    ...(style.bold && { bold: true }),
    ...(style.italic && { italic: true }),
    ...(style.underline && { underline: true }),
  });
}

function readRuns(editor: HTMLDivElement): MetroRichTextRun[] {
  const runs: MetroRichTextRun[] = [];
  function visit(parent: HTMLElement, style: Omit<MetroRichTextRun, 'text'>): void {
    let previousBlock = false;
    for (const node of parent.childNodes) {
      const block = node instanceof HTMLElement && blocks.has(node.tagName);
      if (node.previousSibling && (block || previousBlock)) appendRun(runs, '\n', style);
      previousBlock = block;
      if (node instanceof Text) {
        appendRun(runs, node.data, style);
      } else if (node instanceof HTMLBRElement) {
        if (node.nextSibling) appendRun(runs, '\n', style);
      } else if (node instanceof HTMLElement) {
        const weight = node.style.fontWeight;
        const fontStyle = node.style.fontStyle;
        visit(node, {
          bold: weight ? weight === 'bold' || Number(weight) >= 600 : style.bold || node.matches('b, strong'),
          italic: fontStyle ? fontStyle === 'italic' || fontStyle === 'oblique' : style.italic || node.matches('i, em'),
          underline: style.underline || node.matches('u') || node.style.textDecorationLine.includes('underline'),
        });
      }
    }
  }
  visit(editor, {});
  return runs;
}

export class MetroRichEditBox extends LitElement {
  static readonly formAssociated = true;

  static override properties = {
    value: manual,
    defaultValue: manual,
    runs: manual,
    name: manual,
    required: manual,
    disabled: manual,
    readOnly: manual,
    documentKey: manual,
    clipboard: manual,
    label: { type: String },
    toolbarLabel: { type: String, attribute: 'toolbar-label' },
    boldLabel: { type: String, attribute: 'bold-label' },
    italicLabel: { type: String, attribute: 'italic-label' },
    underlineLabel: { type: String, attribute: 'underline-label' },
    clipboardLabel: { type: String, attribute: 'clipboard-label' },
    copyLabel: { type: String, attribute: 'copy-label' },
    cutLabel: { type: String, attribute: 'cut-label' },
    pasteLabel: { type: String, attribute: 'paste-label' },
  };

  static override get observedAttributes() { return [...super.observedAttributes, ...observed]; }

  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .field { display: grid; grid-template-columns: minmax(0, 1fr); gap: .5rem; padding-inline: var(--_metro-space); }
    .label { color: var(--_metro-muted); font-size: 1.25rem; overflow-wrap: anywhere; }
    .label[hidden] { display: none; }
    .tools { display: flex; flex-wrap: wrap; gap: .25rem; }

    .format {
      box-sizing: border-box;
      min-inline-size: 2.75rem;
      min-block-size: 2.75rem;
      padding: .25rem;
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 400 1.25rem / 1.1 var(--_metro-font);
      cursor: pointer;
    }
    .format[aria-pressed="true"], .format:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .format:disabled { color: var(--_metro-disabled); cursor: default; }
    .format:focus-visible { outline: 2px solid var(--_metro-focus); outline-offset: 2px; }
    [data-format="bold"] { font-weight: 700; }
    [data-format="italic"] { font-style: italic; }
    [data-format="underline"] { text-decoration: underline; }
    .clipboard-trigger {
      max-inline-size: 100%;
      padding-inline: .625rem;
      overflow-wrap: anywhere;
    }
    .announcer {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .editor {
      box-sizing: border-box;
      min-block-size: var(--metro-rich-edit-min-height, 8rem);
      padding: .5rem;
      border: 3px solid transparent;
      background: var(--metro-input-bg, var(--_metro-input-bg));
      color: var(--metro-input-fg, var(--_metro-input-fg));
      font: 400 1.25rem / 1.5 var(--_metro-font);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      outline: none;
    }
    .editor:focus { border-color: var(--_metro-accent); background: var(--metro-input-focus-bg, light-dark(transparent, #fff)); }
    .editor[aria-disabled="true"] { border-color: var(--_metro-disabled); color: var(--_metro-disabled); background: transparent; }
    .editor::selection, .editor *::selection { color: var(--_metro-on-accent); background: var(--_metro-accent); }

    @media (forced-colors: active) {
      .editor { border-color: ButtonText; }
      .editor:focus, .format:focus-visible { border-color: Highlight; outline-color: Highlight; }
      .format[aria-pressed="true"] { forced-color-adjust: none; background: Highlight; color: HighlightText; }
    }
  `];

  declare label: string;
  declare toolbarLabel: string;
  declare boldLabel: string;
  declare italicLabel: string;
  declare underlineLabel: string;
  declare clipboardLabel: string;
  declare copyLabel: string;
  declare cutLabel: string;
  declare pasteLabel: string;

  #internals = this.attachInternals();
  #editor: HTMLDivElement;
  #dirty = false;
  #fieldsetDisabled = false;
  #customMessage = '';
  #savedSelection: EditSelection | null = null;
  #menuSelection: EditSelection | null = null;
  #restoringSelection = false;
  #clipboard: MetroRichClipboardAdapter | null | undefined;
  #clipboardPending?: AbortController;
  #clipboardMessage = '';
  #listeners?: AbortController;
  #inputVersion = 0;
  #pressed = new Set<MetroTextFormat>();
  #restoreFocus = false;

  constructor() {
    super();
    this.#editor = this.#createEditor();
    this.label = '';
    this.toolbarLabel = 'Text formatting';
    this.boldLabel = 'Bold';
    this.italicLabel = 'Italic';
    this.underlineLabel = 'Underline';
    this.clipboardLabel = 'Text actions';
    this.copyLabel = 'Copy';
    this.cutLabel = 'Cut';
    this.pasteLabel = 'Paste';
    this.addEventListener('click', event => {
      if (!event.defaultPrevented && event.composedPath()[0] === this) this.focus();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#listeners = new AbortController();
    this.ownerDocument.addEventListener('selectionchange', this.#rememberSelection, { signal: this.#listeners.signal });
    this.#syncForm();
  }

  override disconnectedCallback(): void {
    this.#listeners?.abort();
    this.#cancelClipboard();
    this.#savedSelection = null;
    this.#menuSelection = null;
    if (this.#clipboardMenu) this.#clipboardMenu.open = false;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous === next || !observed.includes(name)) return;
    if (name === 'value' && !this.#dirty) this.#replace([{ text: this.defaultValue }]);
    if (name === 'document-key') this.#replace(this.runs, true);
    if (name === 'disabled' || name === 'readonly') this.#resetClipboard();
    this.#syncForm();
    this.requestUpdate();
  }

  protected override updated(): void {
    this.#syncForm();
    if (this.#restoreFocus && !this.#controlDisabled) this.#editor.focus({ preventScroll: true });
    this.#restoreFocus = false;
  }

  get value() { return this.runs.map(run => run.text).join(''); }
  set value(value: string) { this.runs = [{ text: String(value) }]; }

  get runs(): readonly MetroRichTextRun[] { return readRuns(this.#editor); }
  set runs(runs: readonly MetroRichTextRun[]) {
    this.#dirty = true;
    this.#replace(runs);
  }

  get defaultValue() { return this.getAttribute('value') ?? ''; }
  set defaultValue(value: string) { this.setAttribute('value', value); }
  get name() { return this.getAttribute('name') ?? ''; }
  set name(value: string) { this.setAttribute('name', value); }
  get required() { return this.hasAttribute('required'); }
  set required(value: boolean) { this.toggleAttribute('required', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value: boolean) { this.toggleAttribute('disabled', value); }
  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(value: boolean) { this.toggleAttribute('readonly', value); }
  get documentKey() { return this.getAttribute('document-key') ?? ''; }
  set documentKey(value: string) { this.setAttribute('document-key', value); }
  get clipboard(): MetroRichClipboardAdapter | null | undefined { return this.#clipboard; }
  set clipboard(value: MetroRichClipboardAdapter | null | undefined) {
    if (value === this.#clipboard) return;
    this.#clipboard = value;
    this.#resetClipboard();
    this.requestUpdate();
  }

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

  override focus(options?: FocusOptions): void { if (!this.#controlDisabled) this.#editor.focus(options); }
  override blur(): void { this.#editor.blur(); }

  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled;
    this.#resetClipboard();
    this.#syncForm();
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.#dirty = false;
    this.#replace([{ text: this.defaultValue }], true);
    this.#syncForm();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state !== 'string') return;
    try {
      const runs: unknown = JSON.parse(state);
      if (Array.isArray(runs) && runs.every(run => run && typeof run.text === 'string')) this.runs = runs;
    } catch {
      // A state from another version has no structured document to restore.
    }
  }

  format(command: MetroTextFormat): boolean {
    return formats.includes(command) && this.#execute(command);
  }

  insertText(text: string): boolean {
    return Boolean(text) && this.#execute('insertText', String(text).replace(/\r\n?/g, '\n'));
  }

  async clipboardAction(action: MetroRichClipboardAction): Promise<boolean> {
    const context = this.#captureClipboard(action);
    const adapter = this.#clipboardAdapter;
    if (!context || !adapter || (action === 'paste' ? !adapter.readText : !adapter.writeText)) {
      return this.#finishClipboard(action, 'unavailable');
    }
    if (action !== 'paste' && collapsed(context.selection)) return this.#finishClipboard(action, 'empty');

    if (this.shadowRoot?.activeElement !== this.#editor) this.#focusSelection(context.selection);
    const text = action === 'paste' ? '' : this.#selectedText(context.selection);
    if (action !== 'paste' && !text) return this.#finishClipboard(action, 'empty');

    this.#cancelClipboard();
    const controller = new AbortController();
    this.#clipboardPending = controller;
    const { signal } = controller;
    let cancel: (() => void) | undefined;
    const cancelled = new Promise<typeof clipboardCancelled>(resolve => {
      cancel = () => resolve(clipboardCancelled);
      signal.addEventListener('abort', cancel, { once: true });
    });

    try {
      const operation = action === 'paste' ? adapter.readText?.(signal) : adapter.writeText?.(text, signal);
      const result = await Promise.race([operation, cancelled]);
      if (result === clipboardCancelled || signal.aborted || !this.#currentClipboard(context)) {
        return this.#finishClipboard(action, 'stale');
      }
      this.#clipboardPending = undefined;
      return this.#applyClipboard(action, context.selection, typeof result === 'string' ? result : '');
    } catch {
      return this.#finishClipboard(action, signal.aborted ? 'stale' : 'error');
    } finally {
      if (cancel) signal.removeEventListener('abort', cancel);
      if (this.#clipboardPending === controller) this.#clipboardPending = undefined;
    }
  }

  get #controlDisabled() { return this.disabled || this.#fieldsetDisabled; }
  get #editable() { return !this.#controlDisabled && !this.readOnly; }
  get #clipboardMenu() { return this.shadowRoot?.querySelector<MetroMenuFlyout>('metro-menu-flyout'); }

  get #clipboardAdapter(): MetroRichClipboardAdapter | null {
    if (this.#clipboard !== undefined) return this.#clipboard;
    const view = this.ownerDocument.defaultView;
    const clipboard = view?.isSecureContext ? view.navigator.clipboard : null;
    if (!clipboard) return null;
    return {
      readText: typeof clipboard.readText === 'function' ? () => clipboard.readText() : undefined,
      writeText: typeof clipboard.writeText === 'function' ? text => clipboard.writeText(text) : undefined,
    };
  }

  #resetClipboard(): void {
    this.#cancelClipboard();
    this.#menuSelection = null;
    this.#clipboardMenu?.close();
    this.#clipboardMessage = '';
  }

  #cancelClipboard(): void {
    this.#clipboardPending?.abort();
    this.#clipboardPending = undefined;
  }

  #captureClipboard(action: MetroRichClipboardAction): ClipboardContext | null {
    if (!clipboardActions.includes(action) || !this.#editor.isConnected || this.#controlDisabled
      || (action !== 'copy' && !this.#editable)) return null;
    this.#rememberSelection();
    if (!this.#savedSelection) return null;
    return { editor: this.#editor, version: this.#inputVersion, selection: this.#savedSelection };
  }

  #currentClipboard(context: ClipboardContext): boolean {
    return this.isConnected && context.editor === this.#editor && context.version === this.#inputVersion
      && this.shadowRoot?.activeElement === this.#editor && sameSelection(context.selection, this.#readSelection());
  }

  #finishClipboard(action: MetroRichClipboardAction, status: MetroRichClipboardResultDetail['status']): boolean {
    if (status !== 'stale') {
      this.#clipboardMessage = status === 'complete' ? clipboardSuccess[action] : clipboardAnnouncements[status];
      this.requestUpdate();
    }
    this.dispatchEvent(new CustomEvent<MetroRichClipboardResultDetail>('metro-clipboard-result', {
      detail: { action, status }, bubbles: true, composed: true,
    }));
    return status === 'complete';
  }

  #applyClipboard(action: MetroRichClipboardAction, selection: EditSelection, text = ''): boolean {
    if (action === 'copy') return this.#finishClipboard(action, 'complete');
    if (action === 'paste' && !text) return this.#finishClipboard(action, 'empty');
    const edited = action === 'cut' ? this.#execute('delete', undefined, selection)
      : this.#execute('insertText', text.replace(/\r\n?/g, '\n'), selection);
    return this.#finishClipboard(action, edited ? 'complete' : 'error');
  }

  #nativeClipboard(event: ClipboardEvent, action: MetroRichClipboardAction): void {
    if (event.defaultPrevented) return;
    // Limit clipboard input to plain text and keep Ctrl+V on the browser's native permission path.
    if (action === 'paste' || event.clipboardData || action === 'cut' && !this.#editable) event.preventDefault();
    if (!event.clipboardData) return;
    const context = this.#captureClipboard(action);
    if (!context) return;
    this.#cancelClipboard();
    const { selection } = context;
    try {
      if (action === 'paste') {
        this.#applyClipboard(action, selection, event.clipboardData.getData('text/plain'));
      } else if (!collapsed(selection)) {
        const text = this.#selectedText(selection);
        if (!text) return;
        event.clipboardData.setData('text/plain', text);
        this.#applyClipboard(action, selection);
      }
    } catch {
      this.#finishClipboard(action, 'error');
    }
  }

  #openClipboardMenu(point?: { x: number; y: number }, invoker: HTMLElement = this.#editor): void {
    const menu = this.#clipboardMenu;
    if (!menu || this.#controlDisabled || menu.open) return;
    if (!this.#savedSelection && this.shadowRoot?.activeElement !== this.#editor) this.focus({ preventScroll: true });
    this.#rememberSelection();
    this.#menuSelection = this.#savedSelection;
    const bounds = this.#menuSelection && this.#range(this.#menuSelection)?.getBoundingClientRect();
    const anchor = point ?? (invoker === this.#editor && bounds && (bounds.width || bounds.height)
      ? { x: bounds.left, y: bounds.bottom } : undefined);
    if (anchor) menu.showAt(invoker, anchor);
    else menu.show(invoker);
    this.requestUpdate();
  }

  #hasClipboardCommands(): boolean {
    this.#rememberSelection();
    const adapter = this.#clipboardAdapter;
    return Boolean((this.#editable && adapter?.readText)
      || (adapter?.writeText && this.#savedSelection && !collapsed(this.#savedSelection)));
  }

  #closeClipboardMenu = (): void => {
    const selection = this.#menuSelection;
    this.#menuSelection = null;
    if (selection && this.shadowRoot?.activeElement === this.#editor) this.#focusSelection(selection);
    this.requestUpdate();
  };

  #chooseClipboard = (event: MetroCommandEvent): void => {
    const action = clipboardActions.find(action => action === event.detail.id);
    if (!action) return;
    event.stopPropagation();
    void this.clipboardAction(action);
  };

  #createEditor(): HTMLDivElement {
    const editor = this.ownerDocument.createElement('div');
    editor.className = 'editor';
    editor.part.add('editor');
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.addEventListener('input', event => {
      if (editor !== this.#editor) return;
      this.#edited();
      if (event.composed) return;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    for (const action of clipboardActions) editor.addEventListener(action, event => this.#nativeClipboard(event, action));
    editor.addEventListener('contextmenu', event => {
      if (event.defaultPrevented || event instanceof PointerEvent && event.pointerType === 'touch'
        || (event.button !== 2 && !event.ctrlKey) || this.#controlDisabled || !this.#hasClipboardCommands()) return;
      event.preventDefault();
      this.#openClipboardMenu({ x: event.clientX, y: event.clientY });
    });
    editor.addEventListener('drop', event => event.preventDefault());
    editor.addEventListener('beforeinput', event => {
      if (/^insertFrom(?:Paste|Drop)/.test(event.inputType)) event.preventDefault();
    });
    editor.addEventListener('focus', this.#rememberSelection);
    editor.addEventListener('keyup', this.#rememberSelection);
    editor.addEventListener('pointerup', this.#rememberSelection);
    editor.addEventListener('keydown', event => {
      if (event.key === 'Tab') this.#rememberSelection();
      if (!event.defaultPrevented && !event.isComposing && !this.#controlDisabled
        && (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey)
        && this.#hasClipboardCommands()) {
        event.preventDefault();
        if (!event.repeat) this.#openClipboardMenu();
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.isComposing) return;
      const format = formats.find(name => name[0] === event.key.toLowerCase());
      if (format && this.#editable) {
        event.preventDefault();
        this.format(format);
      }
    });
    return editor;
  }

  #replace(input: readonly MetroRichTextRun[], force = false): void {
    const runs: MetroRichTextRun[] = [];
    for (const run of input) {
      appendRun(runs, String(run.text).replace(/\r\n?/g, '\n'), run);
    }
    if (!force && JSON.stringify(runs) === JSON.stringify(this.runs)) return;
    this.#resetClipboard();
    this.#restoreFocus ||= this.shadowRoot?.activeElement === this.#editor;
    const editor = this.#createEditor();
    for (const run of runs) {
      let node: Node = this.ownerDocument.createTextNode(run.text);
      for (const [format, tag] of [['underline', 'u'], ['italic', 'em'], ['bold', 'strong']] as const) {
        if (!run[format]) continue;
        const wrapper = this.ownerDocument.createElement(tag);
        wrapper.append(node);
        node = wrapper;
      }
      editor.append(node);
    }
    this.#editor = editor;
    this.#savedSelection = null;
    this.#pressed.clear();
    this.#syncForm();
    this.requestUpdate();
  }

  #selection(): Selection | null {
    const root = this.shadowRoot as (ShadowRoot & { getSelection?: () => Selection | null }) | null;
    return root?.getSelection?.() ?? this.ownerDocument.getSelection();
  }

  #rangeFromSelection(selection: Selection): Range | null {
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      if (this.#editor.contains(range.commonAncestorContainer)) return range;
    }
    const root = this.shadowRoot;
    const composed = root && selection.getComposedRanges?.({ shadowRoots: [root] })[0];
    if (!composed || !this.#editor.contains(composed.startContainer) || !this.#editor.contains(composed.endContainer)) {
      return null;
    }
    const range = this.ownerDocument.createRange();
    range.setStart(composed.startContainer, composed.startOffset);
    range.setEnd(composed.endContainer, composed.endOffset);
    return range;
  }

  #readSelection(): EditSelection | null {
    const selection = this.#selection();
    const range = selection && this.#rangeFromSelection(selection);
    if (!range) return null;
    const { startContainer, startOffset, endContainer, endOffset } = range;
    return { startContainer, startOffset, endContainer, endOffset, backward: selection.direction === 'backward' };
  }

  #range(selection: EditSelection): Range | null {
    if (!this.#editor.contains(selection.startContainer) || !this.#editor.contains(selection.endContainer)) return null;
    try {
      const range = this.ownerDocument.createRange();
      range.setStart(selection.startContainer, selection.startOffset);
      range.setEnd(selection.endContainer, selection.endOffset);
      return range;
    } catch {
      return null;
    }
  }

  #selectedText(selection: EditSelection): string {
    const text = sameSelection(selection, this.#readSelection()) && this.#selection()?.toString();
    if (text) return text;
    const range = this.#range(selection);
    if (!range) return '';
    const fragment = this.ownerDocument.createElement('div');
    fragment.append(range.cloneContents());
    return readRuns(fragment).map(run => run.text).join('');
  }

  #focusSelection(saved: EditSelection): void {
    if (!this.#range(saved)) return;
    this.#restoringSelection = true;
    try {
      this.focus({ preventScroll: true });
      const selection = this.#selection();
      const { startContainer, startOffset, endContainer, endOffset } = saved;
      if (saved.backward) selection?.setBaseAndExtent(endContainer, endOffset, startContainer, startOffset);
      else selection?.setBaseAndExtent(startContainer, startOffset, endContainer, endOffset);
    } finally {
      this.#restoringSelection = false;
    }
    this.#rememberSelection();
  }

  #rememberSelection = (): void => {
    if (this.#restoringSelection || this.shadowRoot?.activeElement !== this.#editor) return;
    const selection = this.#readSelection();
    if (!sameSelection(this.#savedSelection, selection)) {
      this.#savedSelection = selection;
      this.#cancelClipboard();
    }
    const pressed = new Set(formats.filter(format => this.ownerDocument.queryCommandState?.(format)));
    if (formats.every(format => pressed.has(format) === this.#pressed.has(format))) return;
    this.#pressed = pressed;
    this.requestUpdate();
  };

  #execute(command: MetroTextFormat | 'insertText' | 'delete', text?: string, target?: EditSelection): boolean {
    if (!this.#editable || !this.#editor.isConnected) return false;
    if (target && !this.#range(target)) return false;
    if (target && !sameSelection(target, this.#readSelection())) this.#focusSelection(target);
    else if (this.shadowRoot?.activeElement !== this.#editor) {
      if (this.#savedSelection) this.#focusSelection(this.#savedSelection);
      else this.focus({ preventScroll: true });
    }
    const previous = JSON.stringify(this.runs);
    const version = this.#inputVersion;
    const applied = this.ownerDocument.execCommand?.(command, false, text) ?? false;
    if (applied && version === this.#inputVersion && previous !== JSON.stringify(this.runs)) {
      this.#edited();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    this.#rememberSelection();
    return applied;
  }

  #edited(): void {
    this.#inputVersion++;
    this.#cancelClipboard();
    this.#dirty = true;
    this.#rememberSelection();
    this.#syncForm();
  }

  #syncForm(): void {
    const runs = this.runs;
    const value = runs.map(run => run.text).join('');
    if (this.#editor.contentEditable !== String(this.#editable)) this.#editor.contentEditable = String(this.#editable);
    this.#editor.tabIndex = this.#controlDisabled ? -1 : 0;
    this.#editor.setAttribute('aria-disabled', String(this.#controlDisabled));
    this.#editor.setAttribute('aria-readonly', String(this.readOnly));
    this.#editor.setAttribute('aria-required', String(this.required));
    this.#internals.setFormValue(value, JSON.stringify(runs));
    const valueMissing = this.#editable && this.required && !value;
    const customError = this.#editable && Boolean(this.#customMessage);
    if (valueMissing || customError) {
      this.#internals.setValidity(
        { valueMissing, customError }, this.#customMessage || 'Enter text.',
        this.shadowRoot?.contains(this.#editor) ? this.#editor : undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  #labelEditor(hasLabel: boolean): void {
    const ids = this.getAttribute('aria-labelledby')?.trim();
    const root = this.getRootNode();
    const external = ids && (root instanceof Document || root instanceof ShadowRoot)
      ? ids.split(/\s+/).map(id => root.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ')
      : '';
    const label = external || this.getAttribute('aria-label')
      || (!hasLabel && Array.from(this.labels, item => item.textContent?.trim()).filter(Boolean).join(' '));
    if (label) this.#editor.setAttribute('aria-label', label);
    else this.#editor.removeAttribute('aria-label');
    if (hasLabel && !label) this.#editor.setAttribute('aria-labelledby', 'label');
    else this.#editor.removeAttribute('aria-labelledby');
    const invalid = this.getAttribute('aria-invalid');
    if (invalid !== null) this.#editor.setAttribute('aria-invalid', invalid);
    else this.#editor.removeAttribute('aria-invalid');
  }

  protected override render() {
    const hasLabel = Boolean(this.label || this.querySelector(':scope > [slot="label"]'));
    const adapter = this.#clipboardAdapter;
    const selectionAvailable = this.#savedSelection !== null && !collapsed(this.#savedSelection);
    const clipboardLabel = this.clipboardLabel || 'Text actions';
    this.#labelEditor(hasLabel);
    return html`
      <div class="field" part="control">
        <div class="label" id="label" part="label" ?hidden=${!hasLabel} @click=${() => this.focus()}>
          <slot name="label" @slotchange=${() => this.requestUpdate()}>${this.label}</slot>
        </div>
        <div class="tools" part="toolbar" role="group" aria-label=${this.toolbarLabel}>
          <button type="button" class="format clipboard-trigger" part="clipboard-trigger" aria-haspopup="menu"
            aria-expanded=${String(this.#clipboardMenu?.open ?? false)} ?disabled=${this.#controlDisabled}
            @mousedown=${(event: MouseEvent) => { if (event.button === 0) event.preventDefault(); }}
            @click=${(event: MouseEvent) => this.#openClipboardMenu(undefined, event.currentTarget as HTMLButtonElement)}
          >${clipboardLabel}</button>
          ${formats.map(format => html`
            <button type="button" class="format" part="format" data-format=${format}
              aria-label=${this[`${format}Label`]} aria-pressed=${String(this.#pressed.has(format))}
              ?disabled=${!this.#editable}
              @mousedown=${(event: MouseEvent) => { if (event.button === 0) event.preventDefault(); }}
              @click=${() => this.format(format)}>${symbols[format]}</button>
          `)}
        </div>
        ${this.#editor}
        <metro-menu-flyout .label=${clipboardLabel} .commands=${(this.readOnly ? (['copy'] as const) : clipboardActions)
          .map(action => ({
            id: action, label: this[`${action}Label`],
            disabled: action === 'paste' ? !adapter?.readText : !adapter?.writeText || !selectionAvailable,
          }))}
          exportparts="surface:clipboard-menu, item:clipboard-command"
          @metro-command=${this.#chooseClipboard} @metro-close=${this.#closeClipboardMenu}></metro-menu-flyout>
        <span class="announcer" role="status">${this.#clipboardMessage}</span>
      </div>
    `;
  }
}

defineElement('metro-rich-edit-box', MetroRichEditBox);

declare global {
  interface HTMLElementTagNameMap { 'metro-rich-edit-box': MetroRichEditBox; }
  interface HTMLElementEventMap { 'metro-clipboard-result': MetroRichClipboardResultEvent; }
}
