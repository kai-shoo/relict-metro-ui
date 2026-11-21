export function observeAnchorScroll(anchor: HTMLElement, update: () => void, signal: AbortSignal): void {
  const options = { capture: true, signal };
  const roots = new Set<Document | ShadowRoot>([anchor.ownerDocument]);
  // Scroll events inside a shadow tree do not reach the document.
  for (let node: Element | null = anchor; node;) {
    const root = node.getRootNode();
    if (root instanceof ShadowRoot) roots.add(root);
    node = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  for (const root of roots) root.addEventListener('scroll', update, options);
}
