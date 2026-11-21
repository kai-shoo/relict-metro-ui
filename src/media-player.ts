import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './icon.js';
import { metroTheme } from './theme.js';

export type MetroMediaKind = 'video' | 'audio';
export type MetroMediaPhase = 'idle' | 'loading' | 'ready' | 'error';

export interface MetroMediaSource { src: string; type?: string; }

export interface MetroMediaTrack {
  src: string;
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  label?: string;
  language?: string;
  default?: boolean;
}

export interface MetroMediaState {
  phase: MetroMediaPhase;
  playing: boolean;
  buffering: boolean;
  seeking: boolean;
  ended: boolean;
  muted: boolean;
  position: number;
  duration: number | null;
  buffered: readonly (readonly [number, number])[];
}

export interface MetroMediaLabels {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  position: string;
  fullscreen: string;
  exitFullscreen: string;
  buffering: string;
  error: string;
}

export interface MetroMediaError {
  stage: 'source' | 'play' | 'fullscreen';
  message: string;
  code?: number;
}

const defaults: MetroMediaLabels = {
  play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute',
  position: 'Playback position', fullscreen: 'Full screen', exitFullscreen: 'Exit full screen',
  buffering: 'Buffering', error: 'Media could not be played',
};

const mediaEvents = [
  'emptied', 'loadstart', 'loadedmetadata', 'canplay', 'play', 'playing', 'pause', 'waiting',
  'stalled', 'seeking', 'seeked', 'timeupdate', 'durationchange', 'volumechange', 'progress', 'ended', 'error',
] as const;

function timeLabel(seconds: number): string {
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  return `${mins}:${String(whole % 60).padStart(2, '0')}`;
}

export class MetroMediaPlayer extends LitElement {
  static override properties = {
    src: { type: String },
    kind: { type: String, reflect: true },
    label: { type: String },
    poster: { type: String },
    autoplay: { type: Boolean },
    loop: { type: Boolean },
    muted: { type: Boolean, reflect: true },
    preload: { type: String },
    nativeControls: { type: Boolean, attribute: 'native-controls' },
    hideControls: { type: Boolean, attribute: 'hide-controls' },
    sources: { attribute: false },
    tracks: { attribute: false },
    labels: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host { display: block; color: var(--_metro-fg); }
    .player { background: var(--_metro-bg); }
    :host([kind="video"]) .player { color: white; background: black; }
    video {
      display: block;
      inline-size: 100%;
      aspect-ratio: var(--metro-video-aspect, 16 / 9);
      max-block-size: 100dvh;
      object-fit: contain;
    }
    audio[controls] { display: block; inline-size: 100%; }
    .player:fullscreen {
      display: grid;
      align-content: center;
      grid-template-rows: minmax(0, auto) auto auto;
    }
    .player:fullscreen video { block-size: 100%; min-block-size: 0; }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: .25rem .65rem;
      align-items: center;
      padding: .375rem var(--_metro-space);
      background: var(--metro-media-chrome, var(--_metro-chrome));
      color: var(--_metro-fg);
    }
    :host([kind="video"]) .controls { background: var(--metro-media-chrome, #242424); color: white; }
    button {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      padding: 0;
      border: 2px solid currentColor;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:active { background: var(--_metro-accent); color: var(--_metro-on-accent); }
    :is(button, input):focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .seek { flex: 1 1 9rem; min-inline-size: 5rem; accent-color: var(--_metro-accent); box-sizing: border-box; }
    .time { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .status { padding-inline: var(--_metro-space); }
    .status:empty { padding: 0; }
  `];

  declare src: string;
  declare kind: MetroMediaKind;
  declare label: string;
  declare poster: string;
  declare autoplay: boolean;
  declare loop: boolean;
  declare muted: boolean;
  declare preload: 'none' | 'metadata' | 'auto';
  declare nativeControls: boolean;
  declare hideControls: boolean;
  declare sources: readonly MetroMediaSource[];
  declare tracks: readonly MetroMediaTrack[];
  declare labels: Partial<MetroMediaLabels>;

  #observed?: HTMLMediaElement;
  #listeners?: AbortController;
  #buffering = false;
  #blocked = false;
  #sourcesFailed = false;
  #sourceGeneration = 0;
  #failedSources = new Set<HTMLSourceElement>();
  #connection?: AbortController;
  #focusedControl?: Element;

  constructor() {
    super();
    this.src = '';
    this.kind = 'video';
    this.label = 'Media player';
    this.poster = '';
    this.autoplay = false;
    this.loop = false;
    this.muted = false;
    this.preload = 'metadata';
    this.nativeControls = false;
    this.hideControls = false;
    this.sources = [];
    this.tracks = [];
    this.labels = {};
  }

  get media(): HTMLMediaElement | null { return this.shadowRoot?.querySelector('audio, video') ?? null; }

  get state(): MetroMediaState {
    const media = this.media;
    const hasSource = Boolean(this.src || this.sources.some(source => source.src));
    return {
      phase: media?.error || this.#blocked || this.#sourcesFailed ? 'error' : !hasSource ? 'idle' : media?.readyState ? 'ready' : 'loading',
      playing: Boolean(media && !media.paused && !media.ended),
      buffering: this.#buffering,
      seeking: media?.seeking ?? false,
      ended: media?.ended ?? false,
      muted: media?.muted ?? this.muted,
      position: media?.currentTime ?? 0,
      duration: media && Number.isFinite(media.duration) ? media.duration : null,
      buffered: media ? Array.from({ length: media.buffered.length }, (_, index) => (
        [media.buffered.start(index), media.buffered.end(index)] as const
      )) : [],
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#connection = new AbortController();
    this.ownerDocument.addEventListener('fullscreenchange', this.#fullscreenChanged, { signal: this.#connection.signal });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#connection?.abort();
    this.#listeners?.abort();
    this.#observed = undefined;
    this.media?.pause();
    super.disconnectedCallback();
  }

  async play(): Promise<void> {
    if (this.isUpdatePending || !this.media) await this.updateComplete;
    const media = this.media;
    if (!media) return;
    const { src, sources, kind } = this;
    const generation = this.#sourceGeneration;
    const connection = this.#connection;
    const isCurrent = () => this.isConnected && this.#connection === connection && this.media === media
      && this.#sourceGeneration === generation && this.src === src && this.sources === sources && this.kind === kind;
    try {
      await media.play();
      if (isCurrent()) {
        this.#blocked = false;
        this.requestUpdate();
      }
    } catch (error) {
      if (!isCurrent() || (error instanceof DOMException && error.name === 'AbortError')) throw error;
      this.#blocked = true;
      this.#error({ stage: 'play', message: error instanceof Error ? error.message : String(error) });
      this.#publish();
      throw error;
    }
  }

  pause(): void { this.media?.pause(); }

  seek(seconds: number): boolean {
    const media = this.media;
    if (!media?.readyState || !Number.isFinite(seconds)) return false;
    const requested = Math.max(0, seconds);
    if (Number.isFinite(media.duration)) media.currentTime = Math.min(requested, media.duration);
    else {
      if (!media.seekable.length) return false;
      let closest = media.seekable.start(0);
      for (let i = 0; i < media.seekable.length; i++) {
        const candidate = Math.max(media.seekable.start(i), Math.min(requested, media.seekable.end(i)));
        if (Math.abs(candidate - requested) < Math.abs(closest - requested)) closest = candidate;
      }
      media.currentTime = closest;
    }
    this.#publish();
    return true;
  }

  get #fullscreen(): boolean { return Boolean(this.shadowRoot?.fullscreenElement); }

  async toggleFullscreen(): Promise<boolean> {
    const player = this.shadowRoot?.querySelector<HTMLElement>('.player');
    if (!this.ownerDocument.fullscreenEnabled || !player) return false;
    try {
      if (this.#fullscreen) await this.ownerDocument.exitFullscreen();
      else await player.requestFullscreen();
      return true;
    } catch (error) {
      this.#error({ stage: 'fullscreen', message: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  #fullscreenChanged = () => this.requestUpdate();

  #error(detail: MetroMediaError) {
    this.dispatchEvent(new CustomEvent('metro-media-error', { detail, bubbles: true, composed: true }));
  }

  #publish() {
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('metro-media-state', { detail: this.state, bubbles: true, composed: true }));
  }

  #mediaChanged = (event: Event) => {
    const media = event.currentTarget as HTMLMediaElement;
    switch (event.type) {
      case 'waiting': this.#buffering = !media.paused; break;
      case 'stalled':
        if (!media.paused && media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) this.#buffering = true;
        break;
      case 'emptied':
      case 'loadstart':
        this.#blocked = false;
        this.#buffering = false;
        this.#sourcesFailed = false;
        this.#failedSources.clear();
        break;
      case 'playing': this.#blocked = false; this.#buffering = false; break;
      case 'canplay':
      case 'pause':
      case 'ended': this.#buffering = false; break;
      case 'error':
        this.#buffering = false;
        if (!this.#sourcesFailed) this.#error({ stage: 'source', message: media.error?.message || defaults.error, code: media.error?.code });
        break;
      case 'volumechange':
        if (media.muted !== this.muted) this.muted = media.muted;
        break;
    }
    this.#publish();
  };

  #sourceError = (event: Event) => {
    const media = event.currentTarget as HTMLMediaElement;
    const source = event.target as HTMLSourceElement | null;
    if (this.src || media !== this.media || media.error || this.#sourcesFailed
      || source?.localName !== 'source' || source.parentElement !== media) return;
    this.#failedSources.add(source);
    if (Array.from(media.querySelectorAll('source')).some(candidate => !this.#failedSources.has(candidate))) return;

    this.#sourcesFailed = true;
    this.#buffering = false;
    this.#error({ stage: 'source', message: defaults.error, code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED });
    this.#publish();
  };

  protected override willUpdate(changes: PropertyValues<this>): void {
    const active = this.shadowRoot?.activeElement;
    this.#focusedControl = active?.matches('[part="seek"], [part="fullscreen"]') ? active : undefined;
    if (changes.has('src') || changes.has('sources') || changes.has('kind')) {
      this.#sourceGeneration++;
      this.#failedSources.clear();
      this.#sourcesFailed = false;
    }
  }

  protected override updated(changes: PropertyValues<this>): void {
    const media = this.media;
    if (!media) return;
    if (this.#observed !== media) {
      this.#observed?.pause();
      this.#listeners?.abort();
      this.#listeners = new AbortController();
      this.#observed = media;
      for (const event of mediaEvents) media.addEventListener(event, this.#mediaChanged, { signal: this.#listeners.signal });
      media.addEventListener('error', this.#sourceError, { capture: true, signal: this.#listeners.signal });
    }
    if (changes.has('src') || changes.has('sources') || changes.has('kind')) {
      this.#buffering = false;
      this.#blocked = false;
      if (!this.src) media.load();
    }
    const control = this.#focusedControl;
    this.#focusedControl = undefined;
    if (control && (!control.isConnected || control.matches(':disabled'))
      && (this.shadowRoot?.activeElement === control || this.ownerDocument.activeElement === this.ownerDocument.body)) {
      this.shadowRoot?.querySelector<HTMLButtonElement>('[part="play"]')?.focus({ preventScroll: true });
    }
  }

  #children() {
    return html`
      ${this.src ? nothing : repeat(this.sources.filter(source => source.src), (_, index) => `${this.#sourceGeneration}:${index}`, source => html`
        <source src=${source.src} type=${ifDefined(source.type)}>
      `)}
      ${this.tracks.filter(track => track.src).map(track => html`
        <track src=${track.src} kind=${track.kind} label=${ifDefined(track.label)}
          srclang=${ifDefined(track.language)} ?default=${track.default}>
      `)}
    `;
  }

  protected override render() {
    const state = this.state;
    const labels = { ...defaults, ...this.labels };
    const seekable = state.duration !== null && state.duration > 0;
    const playLabel = state.playing ? labels.pause : labels.play;
    const muteLabel = state.muted ? labels.unmute : labels.mute;
    const fullLabel = this.#fullscreen ? labels.exitFullscreen : labels.fullscreen;
    const native = this.nativeControls && !this.hideControls;
    return html`
      <div class="player" part="player" role="group" aria-label=${this.label || 'Media player'}>
        ${this.kind === 'audio' ? html`
          <audio part="media" src=${ifDefined(this.src || undefined)} .muted=${this.muted}
            preload=${this.preload} ?autoplay=${this.autoplay} ?loop=${this.loop} ?controls=${native}>${this.#children()}</audio>
        ` : html`
          <video part="media" src=${ifDefined(this.src || undefined)} poster=${ifDefined(this.poster || undefined)}
            .muted=${this.muted} preload=${this.preload} ?autoplay=${this.autoplay}
            ?loop=${this.loop} ?controls=${native} playsinline>${this.#children()}</video>
        `}
        ${!this.nativeControls && !this.hideControls ? html`
          <div class="controls" part="controls">
            <button type="button" part="play" aria-label=${playLabel} @click=${() => {
              if (this.media?.paused || this.media?.ended) void this.play().catch(() => {});
              else this.pause();
            }}><metro-icon name=${state.playing ? 'pause' : 'play'}></metro-icon></button>
            <input type="range" class="seek" part="seek" min="0" max=${state.duration || 1} step="0.01"
              .value=${String(state.position)} aria-label=${labels.position} aria-valuetext=${timeLabel(state.position)}
              ?disabled=${!seekable} @input=${(event: Event) => this.seek((event.currentTarget as HTMLInputElement).valueAsNumber)}>
            <span part="time" class="time" aria-hidden="true">${timeLabel(state.position)}${seekable
              ? ` / ${timeLabel(state.duration!)}` : ''}</span>
            <button type="button" part="mute" aria-label=${muteLabel} @click=${() => { this.muted = !this.muted; }}>
              <metro-icon name=${state.muted ? 'volume-mute' : 'volume'}></metro-icon>
            </button>
            ${this.kind !== 'audio' && this.ownerDocument.fullscreenEnabled ? html`
              <button type="button" part="fullscreen" aria-label=${fullLabel} @click=${() => void this.toggleFullscreen()}>
                <metro-icon name=${this.#fullscreen ? 'close' : 'fullscreen'}></metro-icon>
              </button>
            ` : nothing}
          </div>
        ` : nothing}
        <div class="status" part="status" role="status">${state.phase === 'error' ? labels.error : state.buffering ? labels.buffering : ''}</div>
      </div>
    `;
  }
}

defineElement('metro-media-player', MetroMediaPlayer);

declare global {
  interface HTMLElementTagNameMap { 'metro-media-player': MetroMediaPlayer; }
  interface HTMLElementEventMap {
    'metro-media-state': CustomEvent<MetroMediaState>;
    'metro-media-error': CustomEvent<MetroMediaError>;
  }
}
