import { css, html, nothing, type PropertyValues } from 'lit';
import { defineElement } from './define.js';
import { tryFocus } from './focus-target.js';
import { TextControl } from './text-control.js';

export interface MetroSpeechCandidate { text: string; confidence?: number }

export interface MetroSpeechOptions {
  language: string;
  signal: AbortSignal;
  onProcessing(): void;
}

export type MetroSpeechAdapter = (options: MetroSpeechOptions) => Promise<readonly MetroSpeechCandidate[]>;
export type MetroSpeechStatus = 'idle' | 'listening' | 'processing' | 'results' | 'error' | 'cancelled' | 'inserted' | 'unavailable';
export interface MetroSpeechRecognizedDetail extends MetroSpeechCandidate { requestId: number }

type RecognitionResult = { isFinal: boolean; length: number; [index: number]: { transcript: string; confidence: number } };
interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionConstructor = new () => BrowserRecognition;

function browserRecognition(view: (Window & typeof globalThis) | null): RecognitionConstructor | undefined {
  if (!view?.isSecureContext) return undefined;
  const speech = view as typeof view & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

function browserAdapter(Recognition: RecognitionConstructor): MetroSpeechAdapter {
  return ({ language, signal, onProcessing }) => new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    function cleanup() {
      signal.removeEventListener('abort', abort);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechend = null;
    }

    function abort() {
      cleanup();
      try { recognition.abort(); } catch {
        // The browser may have stopped recording before the cancel request.
      }
      reject(signal.reason);
    }

    recognition.onspeechend = onProcessing;
    recognition.onresult = event => {
      const result = event.results[event.resultIndex];
      if (!result?.isFinal) return;
      cleanup();
      resolve(Array.from(result, item => ({ text: item.transcript, confidence: item.confidence })));
    };
    recognition.onerror = event => {
      cleanup();
      reject(new Error(event.error));
    };
    recognition.onend = () => {
      cleanup();
      resolve([]);
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      recognition.start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

const messages: Record<MetroSpeechStatus, string> = {
  idle: '',
  listening: 'Listening…',
  processing: 'Processing speech…',
  results: 'Choose the text to insert.',
  error: 'No speech result. Try again or type your text.',
  cancelled: 'Speech recognition stopped.',
  inserted: 'Text inserted.',
  unavailable: 'Speech recognition is unavailable. You can type your text.',
};

interface RecognitionSession {
  id: number;
  text: string;
  start: number;
  end: number;
  controller: AbortController;
  source: MetroSpeechAdapter | null | undefined;
}

export class MetroSpeechTextBox extends TextControl {
  static override properties = {
    speechAdapter: { attribute: false },
    language: { type: String },
    startLabel: { type: String, attribute: 'start-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    useLabel: { type: String, attribute: 'use-label' },
    resultsLabel: { type: String, attribute: 'results-label' },
    speechMessages: { attribute: false },
  };

  static override styles = [...TextControl.styles, css`
    .speech-button, .action {
      box-sizing: border-box;
      max-inline-size: 100%;
      min-block-size: 2.75rem;
      padding: .25rem min(.5rem, 2vi);
      border: 3px solid currentColor;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: 600 1.0625rem / 1.2 var(--_metro-font);
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    .speech-button { border: 0; border-inline-start: 2px solid currentColor; }
    button:disabled { opacity: .65; cursor: default; }
    button:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }
    button:active:enabled { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    .field, .speech { padding-inline: min(var(--_metro-space), 5vi); }
    .status { margin: .25rem 0; color: var(--_metro-muted); font-size: .9375rem; overflow-wrap: anywhere; }
    .status:empty { margin: 0; }
    .results { min-inline-size: 0; margin: .5rem 0; padding: .25rem .5rem; border: 2px solid var(--_metro-border); overflow-wrap: anywhere; }
    .result { display: flex; align-items: center; gap: .5rem; min-block-size: 2.75rem; overflow-wrap: anywhere; }
    .result input { flex: none; accent-color: var(--_metro-accent); }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `];

  declare speechAdapter: MetroSpeechAdapter | null | undefined;
  declare language: string;
  declare startLabel: string;
  declare cancelLabel: string;
  declare useLabel: string;
  declare resultsLabel: string;
  declare speechMessages: Readonly<Partial<Record<MetroSpeechStatus, string>>>;

  #phase: MetroSpeechStatus = 'idle';
  #sequence = 0;
  #session: RecognitionSession | undefined;
  #candidates: readonly MetroSpeechCandidate[] = [];
  #selected = 0;

  constructor() {
    super();
    this.language = '';
    this.startLabel = 'Speak';
    this.cancelLabel = 'Cancel';
    this.useLabel = 'Use text';
    this.resultsLabel = 'Speech results';
    this.speechMessages = {};
    this.addEventListener('input', event => {
      if (this.#session && event.composedPath()[0] === this.editor) this.#retire('idle');
    });
    this.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !this.#session) return;
      event.preventDefault();
      event.stopPropagation();
      this.cancelRecognition();
    });
  }

  override get value() { return super.value; }
  override set value(value: string) {
    if (this.#session && value !== super.value) this.#retire('idle');
    super.value = value;
  }

  get speechAvailable(): boolean {
    return typeof this.speechAdapter === 'function' ||
      (this.speechAdapter === undefined && Boolean(browserRecognition(this.ownerDocument.defaultView)));
  }

  get speechStatus(): MetroSpeechStatus { return this.speechAvailable ? this.#phase : 'unavailable'; }

  get #speechButton() { return this.shadowRoot?.querySelector<HTMLButtonElement>('.speech-button'); }

  override disconnectedCallback(): void {
    this.#retire('idle');
    super.disconnectedCallback();
  }

  override formDisabledCallback(disabled: boolean): void {
    if (disabled) this.#retire('idle');
    super.formDisabledCallback(disabled);
  }

  override formResetCallback(): void {
    this.#retire('idle');
    super.formResetCallback();
  }

  protected override update(changed: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    const resultFocused = active?.closest('.speech');
    super.update(changed);
    if (!resultFocused || active?.isConnected) return;

    const current = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (current && current !== this && current !== this.ownerDocument.body) return;
    if (!tryFocus(this.#speechButton)) tryFocus(this.editor);
  }

  protected override updated(): void {
    super.updated();
    if (this.#session && !this.#isCurrent(this.#session)) this.#retire('idle');
  }

  startRecognition(): boolean {
    const editor = this.editor;
    if (!editor || !this.isConnected || this.controlDisabled || this.readOnly || this.#busy) return false;
    const Recognition = browserRecognition(this.ownerDocument.defaultView);
    const adapter = this.speechAdapter === undefined && Recognition ? browserAdapter(Recognition) : this.speechAdapter;
    if (!adapter) return false;

    this.#retire('idle');
    const session: RecognitionSession = {
      id: ++this.#sequence,
      text: editor.value,
      start: editor.selectionStart ?? editor.value.length,
      end: editor.selectionEnd ?? editor.value.length,
      controller: new AbortController(),
      source: this.speechAdapter,
    };
    this.#session = session;
    this.#phase = 'listening';
    this.requestUpdate();
    const language = this.language || this.lang || this.ownerDocument.documentElement.lang
      || this.ownerDocument.defaultView?.navigator.language || '';
    try {
      void adapter({
        language,
        signal: session.controller.signal,
        onProcessing: () => {
          if (!this.#isCurrent(session) || this.#phase !== 'listening') return;
          this.#phase = 'processing';
          this.requestUpdate();
        },
      }).then(results => this.#receive(session, results), () => this.#failed(session));
    } catch {
      this.#failed(session);
    }
    return true;
  }

  cancelRecognition(): void {
    if (!this.#session) return;
    this.#retire('cancelled');
    const button = this.#speechButton;
    if (button) {
      button.disabled = this.controlDisabled || this.readOnly || !this.speechAvailable;
      button.focus({ preventScroll: true });
    }
  }

  #isCurrent(session: RecognitionSession): boolean {
    return this.#session === session && !session.controller.signal.aborted && this.isConnected
      && !this.controlDisabled && !this.readOnly && this.value === session.text && this.speechAdapter === session.source;
  }

  get #busy() { return this.#phase === 'listening' || this.#phase === 'processing'; }

  #retire(phase: MetroSpeechStatus): void {
    const session = this.#session;
    const interrupted = this.#busy;
    this.#session = undefined;
    this.#phase = phase;
    this.#candidates = [];
    this.#selected = 0;
    if (interrupted) session?.controller.abort();
    this.requestUpdate();
  }

  #failed(session: RecognitionSession): void {
    if (this.#isCurrent(session)) this.#retire('error');
  }

  #receive(session: RecognitionSession, results: readonly MetroSpeechCandidate[]): void {
    if (!this.#isCurrent(session)) return;
    const candidates = new Map<string, MetroSpeechCandidate>();
    for (const result of results) {
      if (typeof result?.text !== 'string') continue;
      const text = result.text.trim().replace(/\r\n?|\n/g, ' ');
      if (!text || candidates.has(text)) continue;
      const confidence = result.confidence;
      candidates.set(text, {
        text,
        ...(typeof confidence === 'number' && Number.isFinite(confidence) && { confidence: Math.min(1, Math.max(0, confidence)) }),
      });
    }
    if (!candidates.size) {
      this.#retire('error');
      return;
    }
    this.#candidates = [...candidates.values()];
    this.#phase = 'results';
    this.requestUpdate();
  }

  #insert(): void {
    const session = this.#session;
    const candidate = this.#candidates[this.#selected];
    const editor = this.editor;
    if (!session || !candidate || !editor || !this.#isCurrent(session)) return;
    const recognized = this.dispatchEvent(new CustomEvent<MetroSpeechRecognizedDetail>('metro-speech-recognized', {
      detail: { ...candidate, requestId: session.id }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!recognized || !this.#isCurrent(session)) return;
    const limit = editor.maxLength;
    const available = limit === -1 ? candidate.text.length : Math.max(0, limit - (session.text.length - session.end + session.start));
    const text = candidate.text.slice(0, available).replace(/[\uD800-\uDBFF]$/, '');
    if (!text) return;
    const before = new InputEvent('beforeinput', {
      data: text, inputType: 'insertText', bubbles: true, composed: true, cancelable: true,
    });
    if (!editor.dispatchEvent(before) || !this.#isCurrent(session)) return;
    editor.setRangeText(text, session.start, session.end, 'end');
    this.#retire('inserted');
    this.focus({ preventScroll: true });
    if (editor.value !== session.text) {
      editor.dispatchEvent(new InputEvent('input', { data: text, inputType: 'insertText', bubbles: true, composed: true }));
    }
  }

  protected override trailingControl() {
    return html`
      <button class="speech-button" part="start" type="button"
        ?disabled=${this.controlDisabled || this.readOnly || !this.speechAvailable}
        aria-disabled=${String(this.#busy)} @click=${this.startRecognition}>${this.startLabel}</button>
    `;
  }

  protected override render() {
    const status = this.speechStatus;
    return html`
      ${super.render()}
      <div class="speech" @change=${(event: Event) => event.stopPropagation()} @input=${(event: Event) => event.stopPropagation()}>
        <p class="status" part="status" role="status">${this.speechMessages[status] ?? messages[status]}</p>
        ${status === 'results' ? html`
          <fieldset class="results" part="results">
            <legend>${this.resultsLabel}</legend>
            ${this.#candidates.map((candidate, index) => html`
              <label class="result" part="result">
                <input type="radio" name="speech-result" .checked=${index === this.#selected} @change=${() => {
                  this.#selected = index;
                  this.requestUpdate();
                }}>${candidate.text}
              </label>
            `)}
          </fieldset>
        ` : nothing}
        ${this.#session ? html`
          <div class="actions" part="actions">
            <button type="button" class="action" part="cancel" @click=${this.cancelRecognition}>${this.cancelLabel}</button>
            ${status === 'results' ? html`
              <button type="button" class="action" part="use" @click=${this.#insert}>${this.useLabel}</button>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

defineElement('metro-speech-text-box', MetroSpeechTextBox);

declare global {
  interface HTMLElementTagNameMap { 'metro-speech-text-box': MetroSpeechTextBox }
  interface HTMLElementEventMap { 'metro-speech-recognized': CustomEvent<MetroSpeechRecognizedDetail> }
}
