import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface MetroImageLoadDetail { src: string; width: number; height: number; }
export interface MetroImageErrorDetail { src: string; }

export class MetroImage extends LitElement {
  static override properties = {
    src: { type: String },
    srcset: { type: String },
    sizes: { type: String },
    alt: { type: String },
    width: { type: Number },
    height: { type: Number },
    loading: { type: String },
    fit: { type: String, reflect: true },
    failed: { state: true },
  };

  static override styles = [metroTheme, css`
    :host { display: inline-grid; max-inline-size: 100%; vertical-align: middle; }
    img, .fallback { grid-area: 1 / 1; }
    img {
      display: block;
      max-inline-size: 100%;
      inline-size: var(--metro-image-width, var(--_image-width, auto));
      block-size: var(--metro-image-height, var(--_image-height, auto));
      object-fit: contain;
    }
    :host([fit="cover"]) img { object-fit: cover; }
    :host([fit="fill"]) img { object-fit: fill; }
    :host([fit="none"]) img { object-fit: none; }
    :host([fit="scale-down"]) img { object-fit: scale-down; }
    img[hidden] { display: none; }
    .fallback {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      place-items: center;
      box-sizing: border-box;
      max-inline-size: 100%;
      inline-size: var(--metro-image-width, var(--_image-width, auto));
      block-size: var(--metro-image-height, var(--_image-height, auto));
      color: var(--_metro-muted);
    }
    .alternative {
      max-inline-size: 100%;
      max-block-size: 100%;
      overflow: hidden;
      overflow-wrap: anywhere;
      text-align: center;
    }
  `];

  declare src: string;
  declare srcset: string;
  declare sizes: string;
  declare alt: string;
  declare width: number | null;
  declare height: number | null;
  declare loading: 'eager' | 'lazy';
  declare fit: MetroImageFit;
  protected declare failed: boolean;

  constructor() {
    super();
    this.src = '';
    this.srcset = '';
    this.sizes = '';
    this.alt = '';
    this.width = null;
    this.height = null;
    this.loading = 'eager';
    this.fit = 'contain';
    this.failed = false;
  }

  get image(): HTMLImageElement | null { return this.shadowRoot?.querySelector('img') ?? null; }

  protected override willUpdate(changes: PropertyValues<this>): void {
    if (changes.has('src') || changes.has('srcset') || changes.has('sizes')) this.failed = false;
  }

  #loaded = (event: Event) => {
    const image = event.currentTarget as HTMLImageElement;
    this.failed = false;
    this.dispatchEvent(new CustomEvent('metro-image-load', {
      detail: { src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight },
      bubbles: true, composed: true,
    }));
  };

  #error = (event: Event) => {
    const image = event.currentTarget as HTMLImageElement;
    this.failed = true;
    this.dispatchEvent(new CustomEvent('metro-image-error', {
      detail: { src: image.currentSrc || image.src },
      bubbles: true, composed: true,
    }));
  };

  protected override render() {
    const present = Boolean(this.src || this.srcset);
    const width = this.width !== null && Number.isFinite(this.width) && this.width > 0 ? this.width : undefined;
    const height = this.height !== null && Number.isFinite(this.height) && this.height > 0 ? this.height : undefined;
    const size = `--_image-width: ${width === undefined ? 'auto' : `${width}px`}; --_image-height: ${height === undefined ? 'auto' : `${height}px`}`;
    return html`
      ${present ? html`
        <img part="image" src=${ifDefined(this.src || undefined)} srcset=${ifDefined(this.srcset || undefined)}
          sizes=${ifDefined(this.sizes || undefined)} alt=${this.alt} loading=${this.loading}
          width=${ifDefined(width)} height=${ifDefined(height)} style=${size}
          ?hidden=${this.failed} @load=${this.#loaded} @error=${this.#error}>
      ` : nothing}
      ${!present || this.failed ? html`
        <div class="fallback" part="fallback" style=${size} role=${this.alt ? 'img' : nothing}
          aria-label=${this.alt || nothing}>
          <slot name="fallback">${this.alt ? html`<span class="alternative">${this.alt}</span>` : nothing}</slot>
        </div>
      ` : nothing}
    `;
  }
}

defineElement('metro-image', MetroImage);

declare global {
  interface HTMLElementTagNameMap { 'metro-image': MetroImage; }
  interface HTMLElementEventMap {
    'metro-image-load': CustomEvent<MetroImageLoadDetail>;
    'metro-image-error': CustomEvent<MetroImageErrorDetail>;
  }
}
