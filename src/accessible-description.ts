/** Carries a field's authored description to its focusable shadow control. */
export class AccessibleDescription {
  readonly #host: HTMLElement;
  #target: HTMLElement | null = null;
  #own: HTMLElement | null = null;
  #root: Document | ShadowRoot | null = null;
  #observer?: MutationObserver;
  #fallback?: HTMLElement;
  #observingText = false;

  constructor(host: HTMLElement) { this.#host = host; }

  update(target: HTMLElement | null, own: HTMLElement | null = null): void {
    this.#target = target;
    this.#own = own;
    this.#sync();
  }

  disconnect(): void {
    this.#observer?.disconnect();
    this.#root = null;
  }

  #sync = (): void => {
    const target = this.#target;
    if (!target || !this.#host.isConnected) {
      this.disconnect();
      return;
    }
    const ids = this.#host.getAttribute('aria-describedby')?.trim();
    const scope = this.#host.getRootNode();
    const root = ids && (scope instanceof Document || scope instanceof ShadowRoot) ? scope : null;
    const reflect = target.ariaDescribedByElements !== undefined;
    this.#observe(root, !reflect);

    const external = root && ids ? [...new Set(ids.split(/\s+/))]
      .map(id => root.getElementById(id)).filter((element): element is HTMLElement => element !== null) : [];
    const own = this.#own ? [this.#own] : [];
    if (reflect && external.length) {
      const refs = [...own, ...external];
      const previous = target.ariaDescribedByElements;
      if (!previous || refs.length !== previous.length || refs.some((node, index) => node !== previous[index])) {
        target.ariaDescribedByElements = refs;
      }
      this.#fallback?.remove();
      return;
    }

    const description = external.map(element => element.getAttribute('aria-label')?.trim() || element.textContent?.trim())
      .filter(Boolean).join(' ');
    const references = own.map(element => element.id);
    if (description) {
      const fallback = this.#fallback ??= target.ownerDocument.createElement('span');
      fallback.id = 'metro-external-description';
      fallback.hidden = true;
      if (!fallback.isConnected) target.after(fallback);
      if (fallback.textContent !== description) fallback.textContent = description;
      references.push(fallback.id);
    } else {
      this.#fallback?.remove();
    }
    const value = references.join(' ') || null;
    if (value === target.getAttribute('aria-describedby')) return;
    if (value === null) target.removeAttribute('aria-describedby');
    else target.setAttribute('aria-describedby', value);
  };

  #observe(root: Document | ShadowRoot | null, text: boolean): void {
    if (root === this.#root && (!root || text === this.#observingText)) return;
    this.disconnect();
    if (!root) return;
    this.#root = root;
    this.#observingText = text;
    const observer = this.#observer ??= new MutationObserver(this.#sync);
    observer.observe(root, {
      subtree: true, childList: true, characterData: text,
      attributeFilter: text ? ['id', 'aria-label'] : ['id'],
    });
  }
}
