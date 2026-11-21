import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { defineElement } from './define.js';
import './icon.js';
import type { MetroIconName } from './icon.js';
import './tile.js';
import type { MetroTileSize } from './tile.js';
import { metroTheme } from './theme.js';

export type MetroLiveTileMode = 'flip' | 'cycle' | 'iconic';
export type MetroLiveTileSize = MetroTileSize | 'default' | 'large';

export interface MetroLiveTileFrame {
  readonly title?: string;
  readonly text?: string;
  readonly image?: string;
  readonly icon?: string;
  readonly iconName?: MetroIconName;
}

export interface MetroLiveTileFields {
  readonly front?: MetroLiveTileFrame | null;
  readonly back?: MetroLiveTileFrame | null;
  readonly frames?: readonly MetroLiveTileFrame[] | null;
  readonly count?: number | null;
  readonly status?: string | null;
}

export interface MetroLiveTileContent extends MetroLiveTileFields {
  readonly version: number;
  readonly sizes?: Partial<Readonly<Record<MetroLiveTileSize, MetroLiveTileFields | null>>> | null;
}

const sizes: MetroLiveTileSize[] = ['small', 'default', 'medium', 'wide', 'large'];

function resolveFields(base: MetroLiveTileFields, changes: MetroLiveTileFields): MetroLiveTileFields {
  return {
    front: changes.front === undefined ? base.front : changes.front,
    back: changes.back === undefined ? base.back : changes.back,
    frames: changes.frames === undefined ? base.frames : changes.frames,
    count: changes.count === undefined ? base.count : changes.count,
    status: changes.status === undefined ? base.status : changes.status,
  };
}

function copyFields(base: MetroLiveTileFields, changes: MetroLiveTileFields): MetroLiveTileFields {
  const fields = resolveFields(base, changes);
  return Object.freeze({
    ...fields,
    front: changes.front ? Object.freeze({ ...changes.front }) : fields.front,
    back: changes.back ? Object.freeze({ ...changes.back }) : fields.back,
    frames: changes.frames ? Object.freeze(changes.frames.map(frame => Object.freeze({ ...frame }))) : fields.frames,
  });
}

export class MetroLiveTile extends LitElement {
  static override properties = {
    href: { type: String },
    target: { type: String },
    rel: { type: String },
    label: { type: String },
    size: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    paused: { type: Boolean, reflect: true },
    interval: { type: Number },
    content: { attribute: false, noAccessor: true },
  };

  static override styles = [metroTheme, css`
    :host { display: inline-block; max-inline-size: 100%; vertical-align: top; }
    :host([hidden]) { display: none; }
    metro-tile { inline-size: var(--_metro-live-tile-width, var(--metro-tile-width, 10.5rem)); }
    :host([size="small"]) { --_metro-live-tile-width: var(--metro-tile-width, 5rem); }
    :host([size="wide"]), :host([size="large"]) { --_metro-live-tile-width: var(--metro-tile-width, 21.5rem); }

    .visual, .flip, .face { box-sizing: border-box; inline-size: 100%; block-size: 100%; min-block-size: 0; }
    .visual { display: grid; perspective: 36rem; }
    .flip {
      display: grid;
      transform-style: preserve-3d;
      transition: transform var(--metro-tile-flip-motion, var(--_metro-live-tile-flip-motion, 750ms)) ease-in-out;
    }
    .flip[data-back] { transform: rotateX(180deg); }
    .flip .face { backface-visibility: hidden; }
    .flip-back { transform: rotateX(180deg); }

    .face { grid-area: 1 / 1; position: relative; display: grid; align-content: center; place-items: center; overflow: hidden; }
    .face[data-image] { align-content: end; }
    .face[data-image]::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 55%, #000b); }
    .face p { z-index: 1; margin: 0; max-inline-size: 100%; overflow-wrap: anywhere; }
    img { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; object-fit: cover; }
    .icon { font-size: 2.25rem; line-height: 1; }
    .title { font-size: 1rem; font-weight: 500; }
    .text { font-size: .75rem; }
    :host([size="small"]) .text { display: none; }
    :host([size="small"]) .icon { font-size: 1.5rem; }

    .count {
      position: absolute;
      z-index: 2;
      inset-block-start: 0;
      inset-inline-end: 0;
      padding-inline: .25rem;
      background: var(--metro-tile-bg, var(--_metro-accent));
      color: var(--metro-tile-fg, var(--_metro-on-accent));
      font-size: 1.25rem;
      line-height: 1.2;
    }
    .cycle { animation: metro-tile-fade var(--_metro-motion) ease-out; }
    @keyframes metro-tile-fade { from { opacity: .4; } }

    :host(:is([paused], :focus-within)) .flip { transition: none; }
    :host(:is([paused], :focus-within)) .cycle { animation: none; }

    .status {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      .flip { transition: none; }
      .cycle { animation: none; }
    }
  `];

  declare href: string | null;
  declare target: string | null;
  declare rel: string | null;
  declare label: string;
  declare size: MetroLiveTileSize;
  declare mode: MetroLiveTileMode;
  declare paused: boolean;
  declare interval: number;

  #content: MetroLiveTileContent | null = null;
  #version = -1;
  #frame = 0;
  #visible = false;
  #timer?: number;
  #motion?: MediaQueryList;
  #events?: AbortController;
  #observer?: IntersectionObserver;

  constructor() {
    super();
    this.href = null;
    this.target = null;
    this.rel = null;
    this.label = '';
    this.size = 'medium';
    this.mode = 'flip';
    this.paused = false;
    this.interval = 5000;
  }

  get version(): number { return this.#version; }
  get frameIndex(): number { return this.#frame; }
  get content(): MetroLiveTileContent | null { return this.#content; }

  set content(value: MetroLiveTileContent | null) {
    if (value != null) this.publish(value);
    else if (this.#content) {
      const previous = this.#content;
      this.#content = null;
      this.#frame = 0;
      this.#clearTimer();
      this.requestUpdate('content', previous);
    }
  }

  publish(update: MetroLiveTileContent): boolean {
    if (!Number.isSafeInteger(update.version) || update.version < 0 || update.version <= this.#version) return false;
    const previous = this.#content;
    const variants: Partial<Record<MetroLiveTileSize, MetroLiveTileFields | null>> = update.sizes === null ? {} : { ...previous?.sizes };
    for (const size of sizes) {
      const replacement = update.sizes?.[size];
      if (replacement === null) delete variants[size];
      else if (replacement) variants[size] = copyFields(variants[size] ?? {}, replacement);
    }
    this.#content = Object.freeze({ ...copyFields(previous ?? {}, update), version: update.version, sizes: Object.freeze(variants) });
    this.#version = update.version;
    const before = this.#fields(previous);
    const after = this.#fields();
    const sequenceChanged = this.mode === 'cycle' ? before.frames !== after.frames
      : this.mode === 'flip' && (before.front !== after.front || before.back !== after.back);
    if (sequenceChanged) {
      this.#frame = 0;
      this.#clearTimer();
    }
    this.requestUpdate('content', previous);
    return true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#events = new AbortController();
    const options = { signal: this.#events.signal };
    this.#motion = this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
    this.#motion?.addEventListener('change', this.#onMotion, options);
    this.ownerDocument.addEventListener('visibilitychange', this.#schedule, options);
    this.addEventListener('focusin', this.#schedule, options);
    this.addEventListener('focusout', () => queueMicrotask(this.#schedule), options);
    this.#observer = new IntersectionObserver(([entry]) => {
      this.#visible = entry.isIntersecting && entry.intersectionRatio > 0;
      this.#schedule();
    });
    this.#observer.observe(this);
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#events?.abort();
    this.#visible = false;
    this.#clearTimer();
    super.disconnectedCallback();
  }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector('metro-tile')?.shadowRoot?.querySelector('a')?.focus(options);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const sequenceChanged = changed.has('size') || changed.has('mode');
    if (sequenceChanged) this.#frame = 0;
    if (sequenceChanged || changed.has('interval')) this.#clearTimer();
  }

  protected override updated(): void { this.#schedule(); }

  #fields(content = this.#content): MetroLiveTileFields {
    return resolveFields(content ?? {}, content?.sizes?.[this.size] ?? {});
  }

  #clearTimer(): void {
    if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #onMotion = () => {
    if (this.#motion?.matches) { this.#frame = 0; this.requestUpdate(); }
    this.#schedule();
  };

  #canAnimate(): boolean {
    return this.isConnected && this.#visible && !this.hidden && !this.paused && !this.#motion?.matches
      && !this.ownerDocument.hidden && !this.matches(':focus-within');
  }

  #schedule = () => {
    if (!this.#canAnimate()) {
      this.#clearTimer();
      return;
    }
    if (this.#timer !== undefined) return;
    const fields = this.#fields();
    const length = this.mode === 'cycle' ? fields.frames?.length ?? 0 : this.mode === 'flip' && fields.back ? 2 : 0;
    if (length < 2) return;
    const interval = Number.isFinite(this.interval) ? Math.min(60000, Math.max(1000, this.interval)) : 5000;
    this.#timer = this.ownerDocument.defaultView?.setTimeout(() => {
      this.#timer = undefined;
      if (!this.#canAnimate()) return;
      this.#frame = (this.#frame + 1) % length;
      this.requestUpdate();
    }, interval);
  };

  #face(frame?: MetroLiveTileFrame | null, kind = '') {
    return html`
      <div class=${`face ${kind}`} part="frame" ?data-image=${Boolean(frame?.image)}>
        ${frame?.image ? html`<img alt="" src=${frame.image} part="image">` : nothing}
        ${frame?.iconName || frame?.icon ? html`<p class="icon" part="icon">${frame?.iconName
          ? html`<metro-icon name=${frame.iconName}></metro-icon>` : frame?.icon}</p>` : nothing}
        ${frame?.title ? html`<p class="title" part="title">${frame.title}</p>` : nothing}
        ${frame?.text ? html`<p class="text" part="text">${frame.text}</p>` : nothing}
      </div>
    `;
  }

  protected override render() {
    const fields = this.#fields();
    const first = this.mode === 'cycle' ? fields.frames?.[0] ?? fields.front : fields.front;
    // The destination name and announcements stay independent of the animated frame.
    const name = this.label || first?.title || 'Tile';
    const rawCount = fields.count ?? 0;
    const count = Number.isFinite(rawCount) ? Math.min(99, Math.max(0, Math.floor(rawCount))) : 0;
    const status = fields.status ?? (count > 0 ? `${count} ${count === 1 ? 'notification' : 'notifications'}` : '');
    const baseSize = this.size === 'large' ? 'wide' : this.size === 'default' ? 'medium' : this.size;
    const frame = this.mode === 'cycle' ? fields.frames?.[this.#frame] ?? first : first;
    return html`
      <metro-tile .href=${this.href} .target=${this.target} .rel=${this.rel} .size=${baseSize} .label=${name}
        exportparts="surface,content,label">
        <div class="visual" part="visual" aria-hidden="true">
          ${this.mode === 'flip' && fields.back ? html`
            <div class="flip" ?data-back=${this.#frame === 1}>
              ${this.#face(first, 'flip-front')}${this.#face(fields.back, 'flip-back')}
            </div>
          ` : this.mode === 'cycle' ? repeat([this.#frame], index => index, () => this.#face(frame, 'cycle')) : this.#face(frame)}
          ${count > 0 ? html`<span class="count" part="count">${count}</span>` : nothing}
        </div>
      </metro-tile>
      <span class="status" role="status" part="status">${status}</span>
    `;
  }
}

defineElement('metro-live-tile', MetroLiveTile);

declare global {
  interface HTMLElementTagNameMap { 'metro-live-tile': MetroLiveTile; }
}
