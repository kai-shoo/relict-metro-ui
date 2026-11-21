export type MetroBackDisposition = 'handled' | 'blocked' | 'pass';

export type MetroBackHandler = () => MetroBackDisposition | PromiseLike<MetroBackDisposition>;

export interface MetroBackHandlers {
  keyboard?: MetroBackHandler;
  mode?: MetroBackHandler;
  navigation?: MetroBackHandler;
  host?: MetroBackHandler;
}

const stages = ['keyboard', 'mode', 'navigation', 'host'] as const;

export type MetroBackResult =
  | { readonly stage: 'layer' | typeof stages[number]; readonly status: 'handled' | 'blocked' }
  | { readonly stage: null; readonly status: 'unhandled' };

interface BackLayer {
  dismiss: () => boolean | void | PromiseLike<boolean | void>;
  active: () => boolean;
}

/** One Back dispatcher per application window or independently navigable surface. */
export class MetroBackScope {
  #layers = new Set<BackLayer>();
  #pending: Promise<MetroBackResult> | undefined;

  constructor(private readonly handlers: MetroBackHandlers = {}) {}

  enterLayer(dismiss: BackLayer['dismiss'], active: BackLayer['active'] = () => true): () => void {
    const layer = { dismiss, active };
    this.#layers.add(layer);
    return () => { this.#layers.delete(layer); };
  }

  requestBack(): Promise<MetroBackResult> {
    return this.#pending ??= Promise.resolve()
      .then(() => this.#dispatch())
      .finally(() => { this.#pending = undefined; });
  }

  async #dispatch(): Promise<MetroBackResult> {
    const layer = Array.from(this.#layers).reverse().find(entry => entry.active());
    if (layer) {
      const closed = await layer.dismiss();
      if (closed !== false) this.#layers.delete(layer);
      return { stage: 'layer', status: closed === false ? 'blocked' : 'handled' };
    }
    for (const stage of stages) {
      const handler = this.handlers[stage];
      if (!handler) continue;
      const status = await handler();
      if (status !== 'pass') return { stage, status };
      if (Array.from(this.#layers).some(entry => entry.active())) {
        return { stage: 'layer', status: 'blocked' };
      }
    }
    return { stage: null, status: 'unhandled' };
  }
}

export interface MetroKeyGesture {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly shift?: boolean;
  readonly meta?: boolean;
}

export interface MetroShortcut {
  readonly id: string;
  readonly keys?: readonly MetroKeyGesture[];
  readonly accessKey?: string;
  readonly disabled?: boolean;
  readonly allowInEditable?: boolean;
  run(event: KeyboardEvent): void;
}

export interface MetroKeyTip {
  readonly id: string;
  readonly key: string;
}

export interface MetroKeyboardOptions {
  readonly commands: () => readonly MetroShortcut[];
  readonly exclusive?: boolean;
  readonly active?: () => boolean;
  readonly renderTips?: (tips: readonly MetroKeyTip[]) => void;
}

const claimed = new WeakSet<KeyboardEvent>();

function isEditing(event: KeyboardEvent): boolean {
  return event.composedPath().some(node => node instanceof HTMLElement && (
    node.isContentEditable ||
    node.matches('input, textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"]')
  ));
}

function matchesGesture(event: KeyboardEvent, gesture: MetroKeyGesture): boolean {
  return event.key.toLowerCase() === gesture.key.toLowerCase() &&
    event.ctrlKey === Boolean(gesture.ctrl) && event.altKey === Boolean(gesture.alt) &&
    event.shiftKey === Boolean(gesture.shift) && event.metaKey === Boolean(gesture.meta);
}

function within(root: HTMLElement, target: EventTarget | null): boolean {
  let node = target instanceof Node ? target : null;
  while (node) {
    if (node === root) return true;
    node = node instanceof ShadowRoot ? node.host : node.parentNode;
  }
  return false;
}

/** Routes shortcuts through the active DOM subtree and supplies labels for access keys. */
export class MetroKeyboardScope {
  #listeners = new AbortController();
  #altArmed = false;
  #tips = false;

  constructor(private readonly root: HTMLElement, private readonly options: MetroKeyboardOptions) {
    const { signal } = this.#listeners;
    root.addEventListener('keydown', this.#keydown, { signal });
    root.addEventListener('keyup', this.#keyup, { signal });
    root.addEventListener('focusout', this.#focusout, { signal });
    root.ownerDocument.defaultView?.addEventListener('blur', this.#reset, { signal });
  }

  hideTips(): void {
    if (!this.#tips) return;
    this.#tips = false;
    this.options.renderTips?.([]);
  }

  dispose(): void {
    this.#listeners.abort();
    this.#reset();
  }

  #reset = (): void => {
    this.#altArmed = false;
    this.hideTips();
  };

  #focusout = (event: FocusEvent): void => {
    if (!within(this.root, event.relatedTarget)) this.#reset();
  };

  #owns(event: KeyboardEvent): boolean {
    if (claimed.has(event) || event.defaultPrevented || this.options.active?.() === false) {
      this.#reset();
      return false;
    }
    if (this.options.exclusive) claimed.add(event);
    return true;
  }

  #keydown = (event: KeyboardEvent): void => {
    if (!this.#owns(event)) return;
    const plainAlt = event.key === 'Alt' && !event.ctrlKey && !event.shiftKey && !event.metaKey &&
      event.code !== 'AltRight';
    if (!event.repeat) {
      this.#altArmed = plainAlt && !event.isComposing && Boolean(this.options.renderTips);
    }
    if (event.repeat || event.isComposing || event.key === 'Process') {
      if (!plainAlt) this.#altArmed = false;
      return;
    }
    if (plainAlt) return;
    if (this.#tips && event.key === 'Escape') {
      event.preventDefault();
      this.hideTips();
      return;
    }
    const editable = isEditing(event);
    const commands = this.options.commands().filter(command => !command.disabled);
    const key = event.key.toLowerCase();
    const tip = this.#tips && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
      ? commands.find(command => command.accessKey?.toLowerCase() === key)
      : undefined;
    const shortcut = tip ?? commands.find(command =>
      (!editable || command.allowInEditable) && command.keys?.some(gesture => matchesGesture(event, gesture)),
    );
    if (!shortcut) return;
    event.preventDefault();
    this.hideTips();
    shortcut.run(event);
  };

  #keyup = (event: KeyboardEvent): void => {
    if (!this.#owns(event) || event.key !== 'Alt' || !this.#altArmed) return;
    this.#altArmed = false;
    event.preventDefault();
    if (this.#tips) {
      this.hideTips();
      return;
    }
    const tips = this.options.commands().flatMap(command =>
      command.accessKey && !command.disabled ? [{ id: command.id, key: command.accessKey }] : [],
    );
    if (tips.length) {
      this.#tips = true;
      this.options.renderTips?.(tips);
    }
  };
}
