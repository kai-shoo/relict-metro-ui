export function tryFocus(target: HTMLElement | null | undefined): boolean {
  if (!target?.isConnected) return false;
  target.focus({ preventScroll: true });
  return target.matches(':focus-within');
}

export function revealVertically(item: HTMLElement, scrollArea: HTMLElement): void {
  const bounds = item.getBoundingClientRect();
  const top = scrollArea.getBoundingClientRect().top + scrollArea.clientTop;
  const bottom = top + scrollArea.clientHeight;
  if (bounds.top < top || bounds.height > scrollArea.clientHeight) scrollArea.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) scrollArea.scrollTop += bounds.bottom - bottom;
}
