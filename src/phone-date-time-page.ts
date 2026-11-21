const active = new WeakSet<Window>();
const returning = new WeakMap<Window, Promise<void>>();
const pageKey = '__metroDateTimePage';
let nextPage = 0;

/** Give the picker its own same-document Back entry without changing the URL. */
export function enterDateTimePage(view: Window, onBack: () => void): (() => void) | undefined {
  if (active.has(view)) return;
  active.add(view);
  const listeners = new AbortController();
  const { signal } = listeners;
  const { history } = view;
  const token = `${Date.now()}-${++nextPage}`;
  let hasEntry = false;

  const leave = (goBack: boolean) => {
    if (signal.aborted) return;
    listeners.abort();
    active.delete(view);
    if (!goBack || !hasEntry || history.state?.[pageKey] !== token) return;

    // A picker can reopen before the asynchronous history traversal finishes.
    const returned = new Promise<void>(resolve => {
      const done = () => {
        view.removeEventListener('popstate', done);
        view.removeEventListener('pagehide', done);
        returning.delete(view);
        resolve();
      };
      view.addEventListener('popstate', done);
      view.addEventListener('pagehide', done);
    });
    returning.set(view, returned);
    history.back();
  };

  const dismiss = () => {
    leave(false);
    onBack();
  };

  const enter = () => {
    if (signal.aborted) return;
    try {
      history.pushState({ ...history.state, [pageKey]: token }, '');
      hasEntry = true;
    } catch {
      // A restricted document can still use the page and its Cancel action.
    }
    view.addEventListener('popstate', event => {
      if (event.state?.[pageKey] !== token) dismiss();
    }, { signal });
    view.addEventListener('pagehide', dismiss, { signal });
  };

  const previous = returning.get(view);
  if (previous) void previous.then(enter);
  else enter();
  return () => leave(true);
}

/** Keep the originating page out of focus and the accessibility tree. */
export function isolateDateTimePage(page: HTMLElement): () => void {
  const inert: HTMLElement[] = [];
  let node: Element = page;
  for (;;) {
    const parent: Node | null = node.assignedSlot ?? node.parentNode;
    if (!(parent instanceof Element || parent instanceof ShadowRoot)) break;
    const assigned = parent instanceof HTMLSlotElement ? parent.assignedElements() : [];
    for (const sibling of assigned.length ? assigned : parent.children) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
      sibling.inert = true;
      inert.push(sibling);
    }
    node = parent instanceof ShadowRoot ? parent.host : parent;
    if (node === page.ownerDocument.body) break;
  }
  return () => { for (const element of inert) element.inert = false; };
}
