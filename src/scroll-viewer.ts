import { LitElement, css, html } from 'lit';
import { restorableAnchorOffset } from './collection-anchor.js';
import { defineElement } from './define.js';
import { metroTheme } from './theme.js';

export type MetroScrollAxis = 'horizontal' | 'vertical';
export type MetroScrollOrientation = MetroScrollAxis | 'both';

export interface MetroScrollAnchor {
  key: string;
  offset: number;
  axis: MetroScrollAxis;
  /** Right edge for horizontal RTL anchors. Older horizontal anchors use the left edge. */
  edge?: 'right';
}

function clientBox(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const left = rect.left + element.clientLeft;
  const top = rect.top + element.clientTop;
  return { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight };
}

export class MetroScrollViewer extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
    label: { type: String },
  };

  static override styles = [metroTheme, css`
    :host {
      display: block;
      min-inline-size: 0;
      min-block-size: 0;
      overflow: hidden auto;
      scrollbar-color: var(--_metro-border) transparent;
      scrollbar-width: thin;
    }

    :host([orientation="horizontal"]) { overflow: auto hidden; }
    :host([orientation="both"]) { overflow: auto; }
    :host(:focus-visible) { outline: 2px solid var(--_metro-focus); outline-offset: -2px; }
  `];

  declare orientation: MetroScrollOrientation;
  declare label: string;

  #internals = this.attachInternals();

  constructor() {
    super();
    this.orientation = 'vertical';
    this.label = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
  }

  protected override updated(): void {
    this.#internals.role = this.label ? 'region' : null;
    this.#internals.ariaLabel = this.label || null;
  }

  #items(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[data-metro-key]')).filter(
      item => item.dataset.metroKey && item.closest('metro-scroll-viewer') === this && item.getClientRects().length
        && getComputedStyle(item).visibility === 'visible',
    );
  }

  #isVisible(item: HTMLElement, rect: DOMRect, viewport: ReturnType<typeof clientBox>): boolean {
    if (rect.width <= 0 || rect.height <= 0) return false;
    let { left, right, top, bottom } = viewport;
    for (let parent = item.parentElement; parent && parent !== this; parent = parent.parentElement) {
      const { overflowX, overflowY } = getComputedStyle(parent);
      if ((overflowX === 'visible' && overflowY === 'visible') || !parent.getClientRects().length) continue;
      const box = clientBox(parent);
      if (overflowX !== 'visible') {
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
      if (overflowY !== 'visible') {
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
    }
    return Math.max(rect.left, left) < Math.min(rect.right, right)
      && Math.max(rect.top, top) < Math.min(rect.bottom, bottom);
  }

  getAnchor(axis: MetroScrollAxis = this.orientation === 'horizontal' ? 'horizontal' : 'vertical'): MetroScrollAnchor | null {
    const viewport = clientBox(this);
    const fromRight = axis === 'horizontal' && getComputedStyle(this).direction === 'rtl';
    const edge = fromRight ? 'right' : axis === 'horizontal' ? 'left' : 'top';
    let anchor: MetroScrollAnchor | null = null;
    for (const item of this.#items()) {
      const rect = item.getBoundingClientRect();
      if (!this.#isVisible(item, rect, viewport)) continue;
      const offset = fromRight ? viewport.right - rect.right : rect[edge] - viewport[edge];
      if (!anchor || offset < anchor.offset) {
        anchor = { key: item.dataset.metroKey!, axis, offset, ...(edge === 'right' ? { edge } : {}) };
      }
    }
    return anchor;
  }

  restoreAnchor(anchor: MetroScrollAnchor): boolean {
    const item = this.#items().find(entry => entry.dataset.metroKey === anchor.key);
    if (!item || !Number.isFinite(anchor.offset)) return false;
    const rect = item.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const horizontal = anchor.axis === 'horizontal';
    const fromRight = horizontal && anchor.edge === 'right';
    const edge = fromRight ? 'right' : horizontal ? 'left' : 'top';
    const extent = horizontal ? rect.width : rect.height;
    const offset = restorableAnchorOffset(anchor.offset, extent);
    const delta = rect[edge] - clientBox(this)[edge] - offset * (fromRight ? -1 : 1);
    this.scrollBy({ [horizontal ? 'left' : 'top']: delta, behavior: 'instant' });
    return true;
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

defineElement('metro-scroll-viewer', MetroScrollViewer);

declare global {
  interface HTMLElementTagNameMap { 'metro-scroll-viewer': MetroScrollViewer; }
}
