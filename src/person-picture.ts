import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { defineElement } from './define.js';
import './image.js';
import './icon.js';
import { metroTheme } from './theme.js';

function initialsOf(name: string, locale: string | undefined): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const selected = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    return selected.map(word => segmenter.segment(word)[Symbol.iterator]().next().value?.segment || '')
      .join('').toLocaleUpperCase(locale);
  } catch {
    return selected.map(word => Array.from(word)[0] ?? '').join('').toUpperCase();
  }
}

export class MetroPersonPicture extends LitElement {
  static override properties = {
    name: { type: String },
    label: { type: String },
    initials: { type: String },
    src: { type: String },
    locale: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: inline-block;
      vertical-align: middle;
      font-size: var(--metro-person-font-size, 1.375rem);
    }
    .avatar { position: relative; inline-size: max-content; }
    .surface {
      inline-size: var(--metro-person-size, 4rem);
      block-size: var(--metro-person-size, 4rem);
      border-radius: 50%;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: var(--metro-person-background, var(--_metro-chrome));
      color: var(--metro-person-foreground, var(--_metro-fg));
    }
    metro-image { --metro-image-width: var(--metro-person-size, 4rem); --metro-image-height: var(--metro-person-size, 4rem); }
    metro-image[hidden] { display: none; }
    .circle {
      display: grid;
      place-items: center;
      max-inline-size: 100%;
      font-size: min(1em, calc(var(--metro-person-size, 4rem) * .4));
      line-height: 1;
      white-space: nowrap;
    }
    ::slotted([slot="badge"]) {
      position: absolute;
      inset-inline-end: 0;
      inset-block-end: 0;
    }
    @media (forced-colors: active) { .surface { outline: 1px solid CanvasText; outline-offset: -1px; } }
  `];

  declare name: string;
  declare label: string;
  declare initials: string;
  declare src: string;
  declare locale: string;
  #photoLoaded = false;

  constructor() {
    super();
    this.name = '';
    this.label = '';
    this.initials = '';
    this.src = '';
    this.locale = '';
  }

  protected override willUpdate(changes: PropertyValues<this>): void {
    if (changes.has('src')) this.#photoLoaded = false;
  }

  #onPhotoResult(event: Event): void {
    const photo = this.shadowRoot?.querySelector('metro-image');
    if (!photo || event.target !== photo || photo.src !== this.src) return;
    this.#photoLoaded = event.type === 'metro-image-load';
    this.requestUpdate();
  }

  protected override render() {
    const name = this.label || this.name;
    const initials = this.initials || initialsOf(this.name || '', this.locale || undefined);
    const fallback = html`<span class="circle" part="initials fallback" aria-hidden="true">
      ${initials || html`<metro-icon name="person"></metro-icon>`}
    </span>`;
    return html`
      <div class="avatar">
        <div class="surface" part="surface" role=${name ? 'img' : nothing} aria-label=${name || nothing}
          aria-hidden=${name ? nothing : 'true'}>
          ${this.#photoLoaded ? nothing : fallback}
          ${this.src ? keyed(this.src, html`
            <metro-image exportparts="image" fit="cover" .src=${this.src} ?hidden=${!this.#photoLoaded}
              @metro-image-load=${this.#onPhotoResult} @metro-image-error=${this.#onPhotoResult}></metro-image>
          `) : nothing}
        </div>
        <slot name="badge"></slot>
      </div>
    `;
  }
}

defineElement('metro-person-picture', MetroPersonPicture);

declare global {
  interface HTMLElementTagNameMap { 'metro-person-picture': MetroPersonPicture; }
}
