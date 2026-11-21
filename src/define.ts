// The same page can load a standalone bundle and a module with overlapping tags.
export function defineElement(name: string, element: CustomElementConstructor): void {
  if (globalThis.customElements && !customElements.get(name)) {
    customElements.define(name, element);
  }
}
