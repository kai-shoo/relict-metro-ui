export function observeAncestorDirection(observer: MutationObserver, element: Element): void {
  let node = element;
  for (;;) {
    const root = node.getRootNode();
    const parent = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    if (!parent) return;
    observer.observe(parent, { attributeFilter: ['dir'] });
    node = parent;
  }
}
