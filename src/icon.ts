import { LitElement, css, html, nothing } from 'lit';
import { defineElement } from './define.js';

// Original outline drawings on a common grid, arranged by command meaning.
const close = 'M5 5l14 14M19 5 5 19';
const add = 'M12 4v16M4 12h16';
const sync = 'M20 4v6h-6M4 20v-6h6M4.6 8a8 8 0 0 1 13.1-3l2.3 3M19.4 16a8 8 0 0 1-13.1 3L4 16';
const star = 'M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.4l6.2-.9z';
const circle = 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z';
const icons = {
  add, new: add, minus: 'M4 12h16', check: 'm4 12 5 5L20 6', close, cancel: close,
  sync, refresh: 'M19 4v6h-6M19 9a8 8 0 1 0 .3 5',
  help: `${circle}M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-1 .7-1.6 1.4-1.6 2.6m0 2.7v1`,
  back: 'M20 12H4m6-6-6 6 6 6', next: 'M4 12h16m-6-6 6 6-6 6',
  search: 'M15.5 15.5 21 21M10.4 3.5a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 1 0 0-13.8z',
  delete: 'M3 6h18M9 6V3h6v3m4 0-1 15H6L5 6m5 4v7m4-7v7',
  save: 'M4 3h13l3 3v15H4zm3 0v6h9V3m-8 18v-8h8v8',
  folder: 'M3 6h7l2 2h9v12H3z',
  video: 'M3 6h12v12H3zm12 4 6-3v10l-6-3',
  camera: 'M3 7h5l2-3h4l2 3h5v13H3zm9 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z',
  mail: 'M3 5h18v14H3zm0 1 9 7 9-7',
  settings: 'M10 3h4l.6 2.8 2 .9 2.4-1.4 2 3.4-2 1.9v2.8l2 1.9-2 3.4-2.4-1.4-2 .9L14 21h-4l-.6-2.8-2-.9L5 18.7l-2-3.4 2-1.9v-2.8L3 8.7l2-3.4 2.4 1.4 2-.9zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  favorite: star,
  'add-favorite': 'M10 3l2.5 5.5 6 .8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L1.5 9.3l6-.8zm10 11v7m-3.5-3.5h7',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  share: 'M7.1 11.4l9.1-5.2M7.1 12.6l9.1 5.2M5 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5zm14-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5zm0 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
  edit: 'm4 16 12-12 4 4L8 20l-5 1zm10-10 4 4',
  more: 'M4 12h.1m7.9 0h.1m7.9 0h.1',
  play: 'M7 4l13 8-13 8z', pause: 'M8 5v14m8-14v14',
  rewind: 'm11 5-8 7 8 7zm10 0-8 7 8 7z',
  'fast-forward': 'm3 5 8 7-8 7zm10 0 8 7-8 7z',
  stop: 'M5 5h14v14H5z', circle,
  alarm: 'M5 5 2.5 7.5M19 5l2.5 2.5M8 18l-2 3m10-3 2 3M12 6a7 7 0 1 0 0 14 7 7 0 1 0 0-14zm0 3v4l3 2',
  calendar: 'M3 5h18v16H3zm0 5h18M8 3v5m8-5v5M7 14h2m3 0h2m3 0h1M7 17h2m3 0h2',
  phone: 'm5 3 4 4-2 3a16 16 0 0 0 7 7l3-2 4 4-2 2C11 22 2 13 3 5z',
  like: 'M7 10H4v10h3m0-10 5-7h2v6h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1H7z',
  microphone: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zm-3 5v2a6 6 0 0 0 12 0v-2m-6 8v3m-4 0h8',
  clock: `${circle}M12 6v6l4 2`,
  flag: 'M5 21V3m0 1h14l-3 4 3 4H5',
  pin: 'M8 3h8v2l-1 1v5l3 3v2h-5v4l-1 2-1-2v-4H6v-2l3-3V6L8 5z',
  fullscreen: 'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6',
  volume: 'M3 9h4l5-4v14l-5-4H3zm12 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11',
  'volume-mute': 'M3 9h4l5-4v14l-5-4H3zm13 1 4 4m0-4-4 4',
  person: 'M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7zM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2z',
} as const;

export type MetroIconName = keyof typeof icons;
export const metroIconNames = Object.freeze(Object.keys(icons) as MetroIconName[]);

export class MetroIcon extends LitElement {
  static override properties = {
    name: { type: String, reflect: true },
    label: { type: String },
  };

  static override styles = css`
    :host { display: inline-grid; inline-size: var(--metro-icon-size, 1.25em); block-size: var(--metro-icon-size, 1.25em); vertical-align: -.18em; }
    :host([hidden]) { display: none; }
    .glyph { display: inline-grid; place-items: center; }
    svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: var(--metro-icon-stroke, 1.85); stroke-linejoin: round; }
    [data-solid] { fill: currentColor; stroke: none; }
    [data-more] { stroke-linecap: round; stroke-width: 2.8; }
    [data-directional]:dir(rtl) { transform: scaleX(-1); }
  `;

  declare name: string;
  declare label: string;

  constructor() {
    super();
    this.name = '';
    this.label = '';
  }

  protected override render() {
    const path = Object.hasOwn(icons, this.name) ? icons[this.name as MetroIconName] : undefined;
    return html`
      <span class="glyph" part="glyph" role=${this.label ? 'img' : nothing}
        aria-label=${this.label || nothing} aria-hidden=${this.label ? nothing : 'true'}>
        ${path ? html`
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" part="icon"
            ?data-directional=${this.name === 'back' || this.name === 'next'}
            ?data-solid=${['fast-forward', 'rewind', 'play', 'stop'].includes(this.name)}
            ?data-more=${this.name === 'more'}>
            <path d=${path}></path>
          </svg>
        ` : html`<slot></slot>`}
      </span>
    `;
  }
}

defineElement('metro-icon', MetroIcon);

declare global {
  interface HTMLElementTagNameMap { 'metro-icon': MetroIcon; }
}
