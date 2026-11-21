import { LitElement, css, html } from 'lit';
import { defineElement } from './define.js';
import './page.js';
import type { MetroPage } from './page.js';
import { metroTheme } from './theme.js';

export type MetroNavigationDirection = 'forward' | 'replace' | 'back';

export interface MetroFrameVisit {
  readonly value: string;
  readonly params?: unknown;
  readonly state?: unknown;
}

export interface MetroNavigateOptions {
  params?: unknown;
  state?: unknown;
  replace?: boolean;
}

export interface MetroNavigateDetail {
  readonly from: MetroFrameVisit | null;
  readonly to: MetroFrameVisit;
  readonly direction: MetroNavigationDirection;
}

export type MetroNavigateEvent = CustomEvent<MetroNavigateDetail>;

interface FrameFocus {
  host: HTMLElement;
  target: HTMLElement;
  key?: string;
}

interface FrameVisit {
  view: MetroFrameVisit;
  focus?: FrameFocus;
}

export class MetroFrame extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  static override properties = { value: { type: String, reflect: true } };
  static override styles = [metroTheme, css`
    :host { display: block; min-inline-size: 0; }
  `];

  declare value: string;

  #current: FrameVisit | null = null;
  #back: FrameVisit[] = [];
  #requesting = false;
  #watch = new MutationObserver(entries => {
    if (entries.some(entry => entry.target === this || entry.target.parentNode === this)) {
      this.requestUpdate();
    }
  });

  constructor() {
    super();
    this.value = '';
  }

  get visit(): MetroFrameVisit | null { return this.#current?.view ?? null; }
  get page(): MetroPage | null { return this.#find(this.value) ?? null; }
  get canGoBack(): boolean { return this.#findBack() >= 0; }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#watch.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'hidden'],
    });
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#watch.disconnect();
    super.disconnectedCallback();
  }

  saveState(state: unknown): void {
    this.#synchronize();
    if (this.#current) this.#current.view = { ...this.#current.view, state };
  }

  navigate(value: string, options: MetroNavigateOptions = {}): boolean {
    if (this.#requesting || !this.#find(value)) return false;
    this.#synchronize();
    const next: FrameVisit = { view: { value, params: options.params, state: options.state } };
    return this.#activate(next, options.replace ? 'replace' : 'forward');
  }

  back(): boolean {
    if (this.#requesting) return false;
    this.#synchronize();
    const index = this.#findBack();
    if (index < 0) return false;
    return this.#activate(this.#back[index], 'back', index);
  }

  #findBack(): number {
    const routes = new Set(this.#pages().map(page => page.value));
    for (let index = this.#back.length - 1; index >= 0; index--) {
      if (routes.has(this.#back[index].view.value)) return index;
    }
    return -1;
  }

  #pages(): MetroPage[] {
    return Array.from(this.children).filter((child): child is MetroPage =>
      child.localName === 'metro-page' && Boolean((child as MetroPage).value) && !(child as HTMLElement).hidden,
    );
  }

  #find(value: string): MetroPage | undefined {
    return this.#pages().find(page => page.value === value);
  }

  #apply(page?: MetroPage): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;
    if (slot.assignedElements()[0] === page) return;
    if (page) slot.assign(page);
    else slot.assign();
  }

  #synchronize(): void {
    if (this.#current && this.value !== this.#current.view.value) this.#back = [];
    const page = this.#find(this.value) ?? this.#pages()[0];
    const value = page?.value ?? '';
    if (this.#current?.view.value !== value) this.#current = page ? { view: { value } } : null;
    if (this.value !== value) this.value = value;
    this.#apply(page);
  }

  #captureFocus(page: MetroPage | null): FrameFocus | undefined {
    const host = (page?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement;
    if (!(host instanceof HTMLElement) || !page?.contains(host)) return undefined;

    let target = host;
    while (target.shadowRoot?.activeElement instanceof HTMLElement) target = target.shadowRoot.activeElement;
    const key = host.closest<HTMLElement>('[data-metro-focus]')?.dataset.metroFocus;
    return { host, target, key };
  }

  #activeElement(): Element | null {
    let active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active === this.ownerDocument.body || active === this.ownerDocument.documentElement ? null : active;
  }

  #restoreFocus(visit: FrameVisit): void {
    void this.updateComplete.then(async () => {
      const page = this.page;
      if (this.#current !== visit || !page || !this.isConnected) return;
      await page.updateComplete;
      if (this.#current !== visit || !this.isConnected) return;
      if (this.page !== page) {
        this.#restoreFocus(visit);
        return;
      }
      this.#apply(page);
      const saved = visit.focus;
      if (saved?.target.isConnected && page.contains(saved.host) && saved.target.getClientRects().length) {
        saved.target.focus({ preventScroll: true });
        if (saved.target.matches(':focus')) return;
      }
      if (saved?.key) {
        const matched = Array.from(page.querySelectorAll<HTMLElement>('[data-metro-focus]'))
          .find(element => element.dataset.metroFocus === saved.key);
        matched?.focus({ preventScroll: true });
        if (matched?.matches(':focus-within')) return;
      }
      page.focus({ preventScroll: true });
    });
  }

  #activate(next: FrameVisit, direction: MetroNavigationDirection, index = -1): boolean {
    const previous = this.#current;
    const previousActive = this.#activeElement();
    const focus = this.#captureFocus(this.page);
    const from = previous?.view ?? null;
    const before = { from, to: next.view, direction } satisfies MetroNavigateDetail;
    this.#requesting = true;
    const approved = this.dispatchEvent(new CustomEvent('metro-before-navigate', {
      detail: before, bubbles: true, composed: true, cancelable: true,
    }) satisfies MetroNavigateEvent);
    this.#requesting = false;
    const page = this.#find(next.view.value);
    if (!approved || !page) return false;

    if (previous) previous.focus = focus;
    if (direction === 'forward' && previous) this.#back.push(previous);
    if (direction === 'back') this.#back.length = index;
    this.#current = next;
    this.value = next.view.value;
    this.#apply(page);
    this.dispatchEvent(new CustomEvent('metro-navigate', {
      detail: { from: previous?.view ?? null, to: next.view, direction }, bubbles: true, composed: true,
    }) satisfies MetroNavigateEvent);
    const active = this.#activeElement();
    if (!active || active === previousActive) this.#restoreFocus(next);
    return true;
  }

  protected override updated(): void { this.#synchronize(); }

  protected override render() {
    return html`<slot></slot>`;
  }
}

defineElement('metro-frame', MetroFrame);

declare global {
  interface HTMLElementTagNameMap { 'metro-frame': MetroFrame; }
  interface HTMLElementEventMap {
    'metro-before-navigate': MetroNavigateEvent;
    'metro-navigate': MetroNavigateEvent;
  }
}
