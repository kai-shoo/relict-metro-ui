import type { MetroScrollAnchor } from './scroll-viewer.js';

export interface CollectionAnchorTarget extends HTMLElement {
  getAnchor?(): MetroScrollAnchor | null;
  restoreAnchor?(anchor: MetroScrollAnchor): boolean;
  jumpToGroup?(key: string): boolean;
  focusItem?(key: string, options?: FocusOptions): boolean;
  getElement?(key: string): HTMLElement | null;
}

export function anchorElement(target: CollectionAnchorTarget, key: string): HTMLElement | null {
  return target.getElement?.(key) ?? Array.from(
    target.querySelectorAll<HTMLElement>('[data-metro-key], [data-metro-group], [id]'),
  ).find(element => key === element.dataset.metroKey || key === element.dataset.metroGroup || key === element.id) ?? null;
}

export function anchorOffset(target: HTMLElement, element: HTMLElement) {
  return element.getBoundingClientRect().top - target.getBoundingClientRect().top - target.clientTop;
}

export function restorableAnchorOffset(offset: number, extent: number): number {
  return offset <= -extent ? 0 : offset;
}

export function isRenderedAnchor(item: HTMLElement): boolean {
  return item.getClientRects().length > 0 && getComputedStyle(item).visibility === 'visible';
}

export function restoreCollectionAnchor(target: CollectionAnchorTarget, key: string, offset = 0): boolean {
  const item = anchorElement(target, key);
  if (item && !isRenderedAnchor(item)) return false;
  if (target.restoreAnchor?.({ key, offset, axis: 'vertical' })) return true;
  if (!item) return false;
  target.scrollBy({
    top: anchorOffset(target, item) - restorableAnchorOffset(offset, item.getBoundingClientRect().height),
    behavior: 'instant',
  });
  return true;
}
