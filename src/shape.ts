import { LitElement, css, html, nothing, svg } from 'lit';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroShapeKind = 'rectangle' | 'ellipse' | 'line' | 'polygon';
export interface MetroShapePoint { x: number; y: number; }

export class MetroShape extends LitElement {
  static override properties = {
    kind: { type: String },
    label: { type: String },
    points: { attribute: false },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      inline-size: var(--metro-shape-width, 2rem);
      block-size: var(--metro-shape-height, 2rem);
      color: var(--metro-shape-color, var(--_metro-fg));
    }
    svg { display: block; inline-size: 100%; block-size: 100%; }
    :is(rect, ellipse, line, polygon) {
      fill: var(--metro-shape-fill, currentColor);
      stroke: var(--metro-shape-stroke, currentColor);
      stroke-width: var(--metro-shape-stroke-width, 1px);
      vector-effect: non-scaling-stroke;
    }
  `];

  declare kind: MetroShapeKind;
  declare label: string;
  declare points: readonly MetroShapePoint[];

  constructor() {
    super();
    this.kind = 'rectangle';
    this.label = '';
    this.points = [];
  }

  #geometry() {
    switch (this.kind) {
      case 'ellipse': return svg`<ellipse cx="50" cy="50" rx="45" ry="45"></ellipse>`;
      case 'line': return svg`<line x1="5" y1="95" x2="95" y2="5"></line>`;
      case 'polygon': {
        const points = this.points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
          .map(({ x, y }) => `${x},${y}`).join(' ');
        return svg`<polygon points=${points}></polygon>`;
      }
      default: return svg`<rect x="5" y="5" width="90" height="90"></rect>`;
    }
  }

  protected override render() {
    return html`
      <svg part="shape" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"
        role=${this.label ? 'img' : nothing} aria-label=${this.label || nothing} aria-hidden=${this.label ? nothing : 'true'}>
        ${this.#geometry()}
      </svg>
    `;
  }
}

defineElement('metro-shape', MetroShape);

declare global {
  interface HTMLElementTagNameMap { 'metro-shape': MetroShape; }
}
