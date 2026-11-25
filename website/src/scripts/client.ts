import 'relict-metro-ui/button';
import 'relict-metro-ui/expander';
import 'relict-metro-ui/icon';
import 'relict-metro-ui/tile';
import 'relict-metro-ui/text-box';
import 'relict-metro-ui/checkbox';
import 'relict-metro-ui/toggle-switch';
import 'relict-metro-ui/slider';
import 'relict-metro-ui/pivot';
import { navigate } from 'astro:transitions/client';
import type { MetroButton } from 'relict-metro-ui/button';
import type { MetroTextBox } from 'relict-metro-ui/text-box';
import { withBase } from '../lib/paths';

type SearchResult = { url: string; title: string; text: string };
type Pagefind = {
  options(options: { baseUrl: string }): Promise<void>;
  search(query: string): Promise<{
    results: { data(): Promise<{ url: string; meta: { title: string }; excerpt: string }> }[];
  }>;
};
let pagefind: Promise<Pagefind> | undefined;
let devIndex: Promise<SearchResult[]> | undefined;
let searchGeneration = 0;
let pageController: AbortController | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSource: HTMLElement | undefined;

function setTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('relict-docs-theme', theme); } catch {}
  updateThemeLabel();
}

function updateThemeLabel() {
  const control = document.querySelector<MetroButton>('metro-button[data-action="theme"]');
  if (control) control.label = document.documentElement.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}

function openSearch(source?: HTMLElement) {
  const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
  if (!dialog || dialog.open) return;
  searchSource = source ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
  dialog.showModal();
  document.querySelector('metro-text-box#docs-search')?.shadowRoot?.querySelector('input')?.focus();
}

async function find(query: string): Promise<SearchResult[]> {
  if (import.meta.env.DEV) {
    devIndex ??= fetch(withBase('/search.json')).then((response) => response.json());
    const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return (await devIndex!).filter((item) => words.every((word) => `${item.title} ${item.text}`.toLocaleLowerCase().includes(word))).slice(0, 12);
  }
  const path = withBase('/pagefind/pagefind.js');
  pagefind ??= import(/* @vite-ignore */ path).then(async (module: Pagefind) => {
    await module.options({ baseUrl: withBase('/') });
    return module;
  }).catch((error) => {
    pagefind = undefined;
    throw error;
  });
  const response = await (await pagefind!).search(query);
  return Promise.all(response.results.slice(0, 12).map(async (result) => {
    const data = await result.data();
    // Pagefind's excerpt contains highlighting markup. Render it as plain text.
    const excerpt = new DOMParser().parseFromString(data.excerpt, 'text/html').body.textContent ?? '';
    return { url: data.url, title: data.meta.title, text: excerpt };
  }));
}

async function runSearch(query: string) {
  const current = ++searchGeneration;
  const status = document.querySelector('#search-status');
  const list = document.querySelector('#search-results');
  if (!status || !list) return;
  list.replaceChildren();
  if (!query.trim()) {
    status.textContent = 'Try a component or topic: pivot, themes, events.';
    return;
  }
  status.textContent = 'Searching…';
  try {
    const results = await find(query.trim());
    if (current !== searchGeneration) return;
    status.textContent = results.length ? `Results: ${results.length}` : 'No results. Try another search.';
    for (const result of results) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = result.url;
      if (result.url.startsWith(withBase('/examples/')) && result.url !== withBase('/examples/')) link.dataset.astroReload = '';
      const title = document.createElement('strong');
      title.textContent = result.title;
      const excerpt = document.createElement('p');
      excerpt.textContent = result.text;
      link.append(title, excerpt);
      item.append(link);
      list.append(item);
    }
  } catch {
    if (current === searchGeneration) status.textContent = 'Search could not load. Check your connection and try again.';
  }
}

// One delegated listener survives page swaps. composedPath also finds links
// rendered inside our Web Components' shadow roots.
document.addEventListener('click', async (event) => {
  const path = event.composedPath();
  const button = path.find((node): node is HTMLElement => node instanceof HTMLElement && (node.hasAttribute('data-action') || node.hasAttribute('data-copy')));
  if (button) {
    switch (button.dataset.action) {
      case 'search': openSearch(button); break;
      case 'close-search': document.querySelector<HTMLDialogElement>('#search-dialog')?.close(); break;
      case 'theme': setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); break;
    }
    if (button.dataset.copy !== undefined) {
      const status = button.closest('.code-block, .hero-install')?.querySelector('.copy-status');
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'Copied';
        if (status) status.textContent = 'Code copied';
      } catch {
        button.textContent = 'Select code';
        if (status) status.textContent = 'Clipboard unavailable. Select and copy the code manually.';
      }
    }
  }

  const anchor = path.find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
  if (anchor?.getRootNode() instanceof ShadowRoot && !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && (!anchor.target || anchor.target === '_self') && !anchor.hasAttribute('download')
    && anchor.origin === location.origin && !anchor.hasAttribute('data-astro-reload')) {
    event.preventDefault();
    void navigate(anchor.href);
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Escape') {
    const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
    if (dialog?.open) {
      event.preventDefault();
      dialog.close();
      return;
    }
    const menu = document.querySelector<HTMLElementTagNameMap['metro-expander']>('.component-menu:focus-within');
    // The native disclosure changes before metro-expander reflects its open attribute.
    if (menu?.shadowRoot?.querySelector('details')?.open) {
      menu.shadowRoot?.querySelector('summary')?.focus();
      menu.open = false;
    } else if (document.querySelector('#docs-nav')?.matches(':focus-within')) {
      const drawer = document.querySelector<HTMLDetailsElement>('.mobile-navigation[open]');
      if (drawer?.getClientRects().length) {
        drawer.open = false;
        drawer.querySelector('summary')?.focus();
      }
    }
  }
});

document.addEventListener('astro:before-swap', (event) => {
  event.newDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  ++searchGeneration;
  clearTimeout(searchTimer);
  pageController?.abort();
});

document.addEventListener('astro:page-load', () => {
  pageController?.abort();
  pageController = new AbortController();
  const { signal } = pageController;
  updateThemeLabel();
  const outline = document.querySelector<HTMLDetailsElement>('.page-outline');
  if (outline) {
    const sideBySide = matchMedia('(min-width: 1201px)');
    outline.open = sideBySide.matches;
    sideBySide.addEventListener('change', () => { outline.open = sideBySide.matches; }, { signal });
  }
  const mobileNavigation = document.querySelector<HTMLDetailsElement>('.mobile-navigation');
  const componentList = document.querySelector<HTMLUListElement>('.component-links');
  const currentComponent = componentList?.querySelector<HTMLElement>('[aria-current="page"]');
  if (componentList && currentComponent) {
    // Scroll only the list. Keep the document and the reader's focus in place.
    const revealCurrent = () => {
      componentList.scrollTop = currentComponent.offsetTop - componentList.clientHeight / 2;
    };
    void customElements.whenDefined('metro-expander').then(revealCurrent);
    mobileNavigation?.addEventListener('toggle', revealCurrent, { signal });
    componentList.closest('metro-expander')?.addEventListener('metro-toggle', revealCurrent, { signal });
  }
  const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
  dialog?.addEventListener('close', () => {
    ++searchGeneration;
    clearTimeout(searchTimer);
    if (searchSource?.isConnected) searchSource.shadowRoot?.querySelector<HTMLElement>('button')?.focus();
    searchSource = undefined;
  }, { signal });
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }, { signal });
  const search = document.querySelector<MetroTextBox>('metro-text-box#docs-search');
  search?.addEventListener('input', () => {
    ++searchGeneration;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void runSearch(search.value), 120);
  }, { signal });
  search?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      const first = document.querySelector<HTMLAnchorElement>('#search-results a');
      if (first) { event.preventDefault(); first.focus(); }
    }
  }, { signal });
  const filter = document.querySelector<MetroTextBox>('metro-text-box#component-filter');
  filter?.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase();
    let count = 0;
    for (const item of document.querySelectorAll<HTMLElement>('[data-component]')) {
      item.hidden = !item.dataset.component!.includes(query);
      if (!item.hidden) count++;
    }
    document.querySelector('#component-count')!.textContent = `Components: ${count}`;
    document.querySelector<HTMLElement>('#component-empty')!.hidden = count !== 0;
  }, { signal });
  let clicks = 0;
  document.querySelector('#hello-button')?.addEventListener('click', () => {
    document.querySelector('#hello-output')!.textContent = `Hello! Clicks: ${++clicks}`;
  }, { signal });
});
