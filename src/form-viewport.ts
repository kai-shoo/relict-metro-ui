export interface MetroViewportRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MetroVisualViewportSource extends EventTarget {
  readonly offsetLeft: number;
  readonly offsetTop: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

export interface MetroVirtualKeyboardSource extends EventTarget {
  readonly boundingRect: MetroViewportRect;
  hide?(): boolean | void;
}

export interface MetroFormViewportOptions {
  readonly view?: Window;
  readonly visualViewport?: MetroVisualViewportSource | null;
  readonly virtualKeyboard?: MetroVirtualKeyboardSource | null;
}

export interface MetroViewportKeyboard {
  readonly visible: boolean;
  readonly bounds: MetroViewportRect | null;
}

export interface MetroFormViewportSnapshot {
  readonly layout: MetroViewportRect;
  readonly visible: MetroViewportRect;
  readonly usable: MetroViewportRect;
  readonly scale: number;
  /** null means the browser has not exposed keyboard geometry. */
  readonly keyboard: MetroViewportKeyboard | null;
}

export type MetroFormViewportEvent = CustomEvent<MetroFormViewportSnapshot>;

function rectangle(x: number, y: number, width: number, height: number): MetroViewportRect {
  return Object.freeze({ x, y, width, height });
}

function equalRect(a: MetroViewportRect | null, b: MetroViewportRect | null): boolean {
  return a === b || Boolean(a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
}

function usableHeight(visible: MetroViewportRect, keyboard: MetroViewportRect | null): number {
  if (!keyboard || keyboard.x >= visible.x + visible.width || keyboard.x + keyboard.width <= visible.x) {
    return visible.height;
  }
  const bottom = visible.y + visible.height;
  if (keyboard.y >= bottom || keyboard.y + keyboard.height < bottom) return visible.height;
  return Math.max(0, keyboard.y - visible.y);
}

/** Physical rectangles use CSS pixels relative to the layout viewport. */
export class MetroFormViewport extends EventTarget {
  readonly #view: Window;
  readonly #visual: MetroVisualViewportSource | null;
  readonly #keyboard: MetroVirtualKeyboardSource | null;
  readonly #nativeKeyboard: boolean;
  readonly #events = new AbortController();
  #snapshot: MetroFormViewportSnapshot;

  constructor(options: MetroFormViewportOptions = {}) {
    super();
    this.#view = options.view ?? window;
    this.#visual = options.visualViewport === undefined ? this.#view.visualViewport : options.visualViewport;
    const navigator = this.#view.navigator as Navigator & { virtualKeyboard?: MetroVirtualKeyboardSource };
    this.#nativeKeyboard = options.virtualKeyboard === undefined;
    this.#keyboard = this.#nativeKeyboard ? navigator.virtualKeyboard ?? null : options.virtualKeyboard ?? null;
    this.#snapshot = this.#read();

    const events = { signal: this.#events.signal };
    this.#view.addEventListener('resize', this.#update, events);
    this.#visual?.addEventListener('resize', this.#update, events);
    this.#visual?.addEventListener('scroll', this.#update, events);
    this.#keyboard?.addEventListener('geometrychange', this.#update, events);
  }

  get snapshot(): MetroFormViewportSnapshot { return this.#snapshot; }

  get canHandleBack(): boolean {
    return !this.#events.signal.aborted && typeof this.#keyboard?.hide === 'function'
      && this.#readKeyboard()?.visible === true && (!this.#nativeKeyboard || this.#nativeHideAllowed());
  }

  /**
   * Requests hiding a confirmed visible keyboard. Call from the app's Back action.
   * A geometrychange notification confirms when hiding is complete.
   */
  handleBack(): boolean {
    if (!this.canHandleBack) return false;
    try {
      return this.#keyboard?.hide?.() !== false;
    } catch {
      return false;
    }
  }

  dispose(): void { this.#events.abort(); }

  #nativeHideAllowed(): boolean {
    if (this.#view.navigator.userActivation?.hasBeenActive === false) return false;
    let focused = this.#view.document.activeElement;
    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
    return focused?.getAttribute('virtualkeyboardpolicy')?.toLowerCase() === 'manual'
      && focused.getAttribute('inputmode')?.toLowerCase() !== 'none';
  }

  #readKeyboard(): MetroViewportKeyboard | null {
    if (!this.#keyboard) return null;
    const { x, y, width, height } = this.#keyboard.boundingRect;
    const visible = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
    return Object.freeze({ visible, bounds: visible ? rectangle(x, y, width, height) : null });
  }

  #read(): MetroFormViewportSnapshot {
    const layout = rectangle(0, 0, this.#view.innerWidth, this.#view.innerHeight);
    const viewport = this.#visual;
    const visible = viewport ? rectangle(viewport.offsetLeft, viewport.offsetTop, viewport.width, viewport.height) : layout;
    const keyboard = this.#readKeyboard();
    const height = usableHeight(visible, keyboard?.bounds ?? null);
    const usable = height === visible.height ? visible : rectangle(visible.x, visible.y, visible.width, height);
    return Object.freeze({ layout, visible, usable, scale: viewport?.scale ?? 1, keyboard });
  }

  #update = () => {
    const next = this.#read();
    const previous = this.#snapshot;
    if (next.scale === previous.scale
      && equalRect(next.layout, previous.layout)
      && equalRect(next.visible, previous.visible)
      && next.keyboard?.visible === previous.keyboard?.visible
      && equalRect(next.keyboard?.bounds ?? null, previous.keyboard?.bounds ?? null)) return;

    this.#snapshot = next;
    this.dispatchEvent(new CustomEvent('change', { detail: next }) satisfies MetroFormViewportEvent);
  };
}

export interface MetroFormViewport extends EventTarget {
  addEventListener(type: 'change', listener: (event: MetroFormViewportEvent) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: 'change', listener: (event: MetroFormViewportEvent) => void, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}
