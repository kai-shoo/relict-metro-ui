import { LitElement, css, html, nothing } from 'lit';
import { metroButtonStyles } from './button-styles.js';
import { defineElement } from './define.js';
import './file-picker.js';
import type { MetroFileSelectDetail } from './file-picker.js';
import { metroTheme } from './theme.js';

export type MetroCameraFacing = 'user' | 'environment';
export type MetroCameraSource = 'camera' | 'file';
export type MetroCameraState = 'idle' | 'unavailable' | 'starting' | 'viewfinder' | 'capturing' | 'preview' | 'error';
export interface MetroCameraOpenOptions { facingMode: MetroCameraFacing; signal: AbortSignal }
export interface MetroCameraCaptureOptions { signal: AbortSignal }
export interface MetroCameraSession {
  stream?: MediaStream;
  capture(video: HTMLVideoElement, options: MetroCameraCaptureOptions): Promise<Blob>;
  close?(): void;
}
export interface MetroCameraAdapter { open(options: MetroCameraOpenOptions): Promise<MetroCameraSession> }
export interface MetroCameraRequestDetail { requestId: number; contextKey: string }
export interface MetroCameraCaptureDetail extends MetroCameraRequestDetail { file: File; source: MetroCameraSource }

const labels = {
  start: 'Start camera',
  capture: 'Take photo',
  use: 'Use photo',
  retake: 'Retake',
  cancel: 'Cancel',
  file: 'Choose a photo',
  preview: 'Photo preview',
  viewfinder: 'Camera viewfinder',
};

const states: Readonly<Record<MetroCameraState, string>> = {
  idle: '',
  unavailable: 'Camera access is unavailable.',
  starting: 'Starting the camera…',
  viewfinder: 'Camera ready.',
  capturing: 'Capturing a photo…',
  preview: 'Review the photo before using it.',
  error: 'The camera or photo could not be opened. Try again.',
};

async function frameFrom(video: HTMLVideoElement, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  if (!video.videoWidth || !video.videoHeight || video.readyState < 2) throw new Error('No camera frame');
  const canvas = video.ownerDocument.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(video, 0, 0);
    const photo = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Cannot render the frame')), 'image/jpeg', .92);
    });
    signal.throwIfAborted();
    return photo;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

interface CameraRequest extends MetroCameraRequestDetail {
  controller: AbortController;
  adapter: MetroCameraAdapter | null | undefined;
  facingMode: MetroCameraFacing;
  session?: MetroCameraSession;
}

interface CameraPreview extends MetroCameraRequestDetail {
  url: string;
  photo: Blob;
  source: MetroCameraSource;
}

export class MetroCameraCapture extends LitElement {
  static override properties = {
    cameraAdapter: { attribute: false },
    contextKey: { attribute: false, noAccessor: true },
    facingMode: { type: String, attribute: 'facing-mode' },
    fileName: { type: String, attribute: 'file-name' },
    direct: { type: Boolean },
    fileFallback: { type: Boolean, attribute: 'file-fallback' },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    cameraLabels: { attribute: false },
    cameraMessages: { attribute: false },
  };

  static override get observedAttributes() { return [...super.observedAttributes, 'context-key']; }

  static override styles = [metroTheme, metroButtonStyles, css`
    :host { display: block; min-inline-size: 0; color: var(--_metro-fg); }
    .surface { display: grid; gap: .5rem; inline-size: 100%; }
    .media { background: var(--metro-camera-bg, #000); }
    video, img {
      display: block;
      inline-size: 100%;
      block-size: var(--metro-camera-height, min(23rem, 55dvh));
      object-fit: contain;
      background: var(--metro-camera-bg, #000);
    }
    [hidden] { display: none; }
    .status { margin: 0; color: var(--_metro-muted); overflow-wrap: anywhere; }
    .status:empty { display: none; }
    .actions { display: flex; gap: .375rem; flex-wrap: wrap; align-items: start; }
    metro-file-picker::part(control) { padding-inline: 0; }
    button, metro-file-picker::part(button) { font-size: 1.125rem; }
  `];

  declare cameraAdapter: MetroCameraAdapter | null | undefined;
  declare facingMode: MetroCameraFacing;
  declare fileName: string;
  declare direct: boolean;
  declare fileFallback: boolean;
  declare disabled: boolean;
  declare label: string;
  declare cameraLabels: Readonly<Partial<Record<keyof typeof labels, string>>>;
  declare cameraMessages: Readonly<Partial<Record<MetroCameraState, string>>>;

  #phase: MetroCameraState = 'idle';
  #request: CameraRequest | undefined;
  #preview: CameraPreview | undefined;
  #ready = false;
  #previewReady = false;
  #sequence = 0;
  #focusGeneration = 0;
  #listeners: AbortController | undefined;

  constructor() {
    super();
    this.facingMode = 'environment';
    this.fileName = '';
    this.direct = false;
    this.fileFallback = false;
    this.disabled = false;
    this.label = 'Camera';
    this.cameraLabels = {};
    this.cameraMessages = {};
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#listeners = new AbortController();
    this.ownerDocument.defaultView?.addEventListener('pagehide', this.#pageHide, { signal: this.#listeners.signal });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#listeners?.abort();
    this.#dispose('idle');
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    super.attributeChangedCallback(name, previous, next);
    if (name === 'context-key' && previous !== next) this.#dispose('idle');
  }

  protected override updated(): void {
    if ((this.#request && !this.#isCurrent(this.#request)) || (this.disabled && this.#preview)
      || (this.#preview?.source === 'file' && !this.fileFallback)) this.#dispose('idle');
  }

  get contextKey() { return this.getAttribute('context-key') ?? ''; }
  set contextKey(value: string) { this.setAttribute('context-key', value); }
  get cameraAvailable() { return this.cameraAdapter === undefined ? Boolean(this.#mediaDevices) : Boolean(this.cameraAdapter); }
  get cameraState() { return this.#phase === 'idle' && !this.cameraAvailable ? 'unavailable' : this.#phase; }

  start(event: Event): boolean {
    if (!event.isTrusted || this.disabled || !this.isConnected || !this.cameraAvailable || !this.#canStart) return false;
    const source = this.cameraAdapter;
    const view = this.ownerDocument.defaultView;
    if (source === undefined && view?.navigator.userActivation?.isActive === false) return false;
    const devices = this.#mediaDevices;
    if (!source && !devices) return false;
    this.#dispose('starting');
    const request: CameraRequest = {
      requestId: ++this.#sequence,
      contextKey: this.contextKey,
      controller: new AbortController(),
      adapter: source,
      facingMode: this.#facing,
    };
    this.#request = request;
    this.#focusAfterUpdate('cancel');
    try {
      const result = source
        ? source.open({ facingMode: request.facingMode, signal: request.controller.signal })
        : devices!.getUserMedia({ audio: false, video: { facingMode: { ideal: request.facingMode } } })
          .then<MetroCameraSession>(stream => ({ stream, capture: (video, { signal }) => frameFrom(video, signal) }));
      void result.then(session => this.#opened(request, session), () => this.#error(request));
    } catch {
      this.#error(request);
    }
    return true;
  }

  cancel(): void {
    const work = this.#preview ?? this.#request;
    if (!work) return;
    const detail = { requestId: work.requestId, contextKey: work.contextKey };
    this.#dispose('idle');
    this.#focusAfterUpdate('start', true);
    this.dispatchEvent(new CustomEvent<MetroCameraRequestDetail>('metro-camera-cancel', { detail, bubbles: true, composed: true }));
  }

  get #mediaDevices() {
    const view = this.ownerDocument.defaultView;
    const devices = view?.navigator.mediaDevices;
    return view?.isSecureContext && typeof devices?.getUserMedia === 'function' ? devices : undefined;
  }

  get #video() { return this.shadowRoot?.querySelector('video') ?? null; }
  get #facing(): MetroCameraFacing { return this.facingMode === 'user' ? 'user' : 'environment'; }
  get #canStart() { return this.#phase === 'idle' || this.#phase === 'error'; }
  get #hasFallback() { return this.fileFallback && this.#canStart && !this.disabled; }
  #text(key: keyof typeof labels) { return this.cameraLabels[key] ?? labels[key]; }

  #isCurrent(request: CameraRequest): boolean {
    return this.#request === request && !request.controller.signal.aborted && this.isConnected && !this.disabled
      && this.cameraAdapter === request.adapter && this.#facing === request.facingMode && this.contextKey === request.contextKey;
  }

  #pageHide = (): void => this.#dispose('idle');

  #focusAfterUpdate(action: keyof typeof labels, unlessFocusMoved = false): void {
    const generation = ++this.#focusGeneration;
    const canFocus = () => {
      if (generation !== this.#focusGeneration || !this.isConnected) return false;
      if (!unlessFocusMoved) return true;
      const root = this.getRootNode();
      const active = root instanceof ShadowRoot ? root.activeElement : this.ownerDocument.activeElement;
      return !active || active === this || active === this.ownerDocument.body;
    };
    void this.updateComplete.then(() => {
      if (!canFocus()) return;
      const button = this.shadowRoot?.querySelector<HTMLButtonElement>(`button[part="${action}"]:enabled`);
      if (button) button.focus({ preventScroll: true });
      else if (action === 'start') {
        const picker = this.shadowRoot?.querySelector('metro-file-picker');
        void picker?.updateComplete.then(() => {
          if (picker.isConnected && canFocus()) picker.focus({ preventScroll: true });
        });
      }
    });
  }

  #release(session: MetroCameraSession): void {
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    try { session.close?.(); } catch {
      // A provider's cleanup cannot prevent reset or native track release.
    }
  }

  #dropPreview(): void {
    if (this.#preview) this.ownerDocument.defaultView?.URL.revokeObjectURL(this.#preview.url);
    this.#preview = undefined;
    this.#previewReady = false;
  }

  #dispose(next: MetroCameraState): void {
    const request = this.#request;
    this.#request = undefined;
    this.#dropPreview();
    this.#phase = next;
    this.#ready = false;
    this.#focusGeneration++;
    request?.controller.abort();
    const video = this.#video;
    if (video?.srcObject) {
      video.pause();
      video.srcObject = null;
    }
    if (request?.session) this.#release(request.session);
    this.requestUpdate();
  }

  async #opened(request: CameraRequest, session: MetroCameraSession): Promise<void> {
    if (!this.#isCurrent(request)) {
      this.#release(session);
      return;
    }
    request.session = session;
    this.#phase = session.stream ? 'starting' : 'viewfinder';
    this.#ready = !session.stream;
    this.requestUpdate();
    await this.updateComplete;
    if (!this.#isCurrent(request)) return;
    const video = this.#video;
    if (session.stream && video) {
      const tracks = session.stream.getVideoTracks();
      if (!tracks.some(track => track.readyState === 'live')) {
        this.#error(request);
        return;
      }
      for (const track of tracks) {
        track.addEventListener('ended', () => this.#error(request), { signal: request.controller.signal });
      }
      video.srcObject = session.stream;
      this.#play(request);
    } else {
      this.#focusAfterUpdate('capture', true);
    }
  }

  #play(request: CameraRequest): void {
    const video = this.#video;
    if (!video?.srcObject || !this.#isCurrent(request)) return;
    void video.play().catch(error => {
      if (error?.name !== 'AbortError') this.#error(request);
    });
  }

  #onVideoReady(): void {
    const video = this.#video;
    const request = this.#request;
    if (!request || !this.#isCurrent(request) || !video || !video.videoWidth || video.readyState < 2 || this.#ready) return;
    this.#ready = true;
    if (this.#phase === 'starting') this.#phase = 'viewfinder';
    this.requestUpdate();
    if (this.#phase === 'viewfinder') this.#focusAfterUpdate('capture', true);
  }

  #error(request: CameraRequest): void {
    if (!this.#isCurrent(request)) return;
    this.#dispose('error');
    this.#focusAfterUpdate('start', true);
  }

  #takePhoto(): void {
    const request = this.#request;
    const video = this.#video;
    if (!request?.session || !this.#isCurrent(request) || !video || this.#phase !== 'viewfinder' || !this.#ready) return;
    this.#phase = 'capturing';
    this.requestUpdate();
    this.#focusAfterUpdate('cancel');
    try {
      void request.session.capture(video, { signal: request.controller.signal }).then(photo => {
        if (this.#isCurrent(request) && this.#phase === 'capturing') this.#stage(photo, 'camera', request);
      }, () => this.#error(request));
    } catch {
      this.#error(request);
    }
  }

  #fromFile(event: CustomEvent<MetroFileSelectDetail>): void {
    event.stopPropagation();
    const file = event.detail.files[0];
    if (!file || !this.#hasFallback || event.detail.contextKey !== this.contextKey) return;
    this.#stage(file, 'file', { requestId: ++this.#sequence, contextKey: this.contextKey });
  }

  #stage(photo: Blob, source: MetroCameraSource, detail: MetroCameraRequestDetail): void {
    const URL = this.ownerDocument.defaultView?.URL;
    if (!URL || !photo.size || !photo.type.startsWith('image/')) {
      this.#dispose('error');
      this.#focusAfterUpdate('start', true);
      return;
    }
    this.#dropPreview();
    this.#preview = { requestId: detail.requestId, contextKey: detail.contextKey, url: URL.createObjectURL(photo), photo, source };
    if (this.direct && source === 'camera') {
      this.#previewReady = true;
      this.#accept();
      return;
    }
    this.#phase = 'preview';
    this.requestUpdate();
    this.#focusAfterUpdate('retake', true);
  }

  #onPreviewLoad(event: Event): void {
    if ((event.currentTarget as HTMLImageElement).getAttribute('src') !== this.#preview?.url) return;
    this.#previewReady = true;
    this.requestUpdate();
  }

  #onPreviewError(event: Event): void {
    if ((event.currentTarget as HTMLImageElement).getAttribute('src') !== this.#preview?.url) return;
    this.#dispose('error');
    this.#focusAfterUpdate('start', true);
  }

  #retake(): void {
    if (!this.#preview || this.disabled) return;
    this.#dropPreview();
    const request = this.#request;
    this.#phase = request ? 'viewfinder' : 'idle';
    this.requestUpdate();
    this.#focusAfterUpdate(request ? 'capture' : 'start', true);
    if (request) void this.updateComplete.then(() => this.#play(request));
  }

  #accept(): void {
    const preview = this.#preview;
    if (!preview || !this.#previewReady || this.disabled || preview.contextKey !== this.contextKey
      || (this.#request && !this.#isCurrent(this.#request))) return;
    const { requestId, contextKey, source, photo } = preview;
    const ext = photo.type === 'image/jpeg' ? 'jpg' : photo.type.match(/^image\/([a-z0-9]+)$/i)?.[1] || 'img';
    const file = photo instanceof File && !this.fileName
      ? photo : new File([photo], this.fileName || `photo.${ext}`, { type: photo.type });
    this.#retake();
    this.dispatchEvent(new CustomEvent<MetroCameraCaptureDetail>('metro-camera-capture', {
      detail: { file, source, requestId, contextKey }, bubbles: true, composed: true,
    }));
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || (!this.#request && !this.#preview)) return;
    event.preventDefault();
    event.stopPropagation();
    this.cancel();
  }

  protected override render() {
    const state = this.cameraState;
    const viewfinder = state === 'viewfinder' || state === 'capturing'
      || (state === 'starting' && Boolean(this.#request?.session?.stream));
    return html`
      <section class="surface" part="surface" aria-label=${this.label} @keydown=${this.#onKeydown}>
        <div class="media" part="media" ?hidden=${!viewfinder && !this.#preview}>
          <video part="viewfinder" aria-label=${this.#text('viewfinder')} ?hidden=${!viewfinder}
            muted playsinline autoplay @loadeddata=${this.#onVideoReady} @canplay=${this.#onVideoReady} @playing=${this.#onVideoReady}></video>
          ${this.#preview ? html`
            <img part="preview" alt=${this.#text('preview')} src=${this.#preview.url}
              @load=${this.#onPreviewLoad} @error=${this.#onPreviewError}>
          ` : nothing}
        </div>
        <p class="status" part="status" role="status">${this.cameraMessages[state] ?? states[state]}</p>
        <div class="actions" part="actions">
          ${this.#canStart && this.cameraAvailable ? html`
            <button type="button" part="start" ?disabled=${this.disabled} @click=${this.start}>${this.#text('start')}</button>
          ` : nothing}
          ${this.#hasFallback ? html`
            <metro-file-picker part="file" .contextKey=${this.contextKey} .capture=${this.#facing} accept="image/*"
              .chooseLabel=${this.#text('file')} empty-label=""
              @input=${(event: Event) => event.stopPropagation()} @change=${(event: Event) => event.stopPropagation()}
              @metro-file-cancel=${(event: Event) => event.stopPropagation()} @metro-file-select=${this.#fromFile}>
            </metro-file-picker>
          ` : nothing}
          ${viewfinder ? html`
            <button type="button" part="capture" ?disabled=${!this.#ready || this.disabled || !this.#isViewfinder}
              @click=${this.#takePhoto}>${this.#text('capture')}</button>
          ` : nothing}
          ${this.#preview ? html`
            <button type="button" part="use" ?disabled=${!this.#previewReady || this.disabled} @click=${this.#accept}>${this.#text('use')}</button>
            <button type="button" part="retake" ?disabled=${this.disabled} @click=${this.#retake}>${this.#text('retake')}</button>
          ` : nothing}
          ${this.#request || this.#preview ? html`
            <button type="button" part="cancel" @click=${this.cancel}>${this.#text('cancel')}</button>
          ` : nothing}
        </div>
      </section>
    `;
  }

  get #isViewfinder() { return this.#phase === 'viewfinder'; }
}

defineElement('metro-camera-capture', MetroCameraCapture);

declare global {
  interface HTMLElementTagNameMap { 'metro-camera-capture': MetroCameraCapture }
  interface HTMLElementEventMap {
    'metro-camera-capture': CustomEvent<MetroCameraCaptureDetail>;
    'metro-camera-cancel': CustomEvent<MetroCameraRequestDetail>;
  }
}
