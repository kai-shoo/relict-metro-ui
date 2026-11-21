import { MetroActivationScope } from '../../dist/metro-ui.js';

const storageKey = 'metro-example-launch:v1:visit';
const frame = document.querySelector('#frame');
const record = document.querySelector('#record');
const splash = document.querySelector('#splash');
const details = document.querySelector('#details');
const status = document.querySelector('#status');
const description = document.querySelector('#description');
const progress = document.querySelector('#progress');
const retry = document.querySelector('#retry');
const back = document.querySelector('#back');
const links = [...document.querySelectorAll('[data-record]')];
const catalogue = new Map(links.map(link => [link.dataset.record, link.textContent.trim()]));
let load = null;

const library = () => ({ identity: 'library', route: 'library' });
const entryFor = id => ({ identity: `record:${id}`, route: 'record', params: { id } });

function storedDestination() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.route === 'record' && catalogue.has(saved.id)) return entryFor(saved.id);
  } catch {
    // A missing or unreadable visit falls back to the library.
  }
  return library();
}

const activation = new MetroActivationScope({
  resolve(entry) {
    if (entry.kind === 'launch') return storedDestination();
    if (entry.kind !== 'link') return null;
    const address = new URL(entry.destination.href, location.href);
    if (address.origin !== location.origin || address.pathname !== location.pathname) return null;
    return address.searchParams.has('record') ? entryFor(address.searchParams.get('record') ?? '') : library();
  },
  current() {
    const visit = frame.visit;
    return visit?.value === 'record' ? `record:${visit.params?.id}` : visit?.value ?? null;
  },
  navigate(destination) {
    return frame.navigate(destination.route, { params: destination.params });
  },
});

function remember(visit) {
  const id = visit.params?.id;
  const address = new URL(location.href);
  if (visit.value === 'record') address.searchParams.set('record', id);
  else address.searchParams.delete('record');
  history.replaceState(history.state, '', address);
  try {
    const saved = visit.value === 'record' && catalogue.has(id) ? { route: 'record', id } : { route: 'library' };
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Navigation remains available when persistent storage is restricted.
  }
}

function showDetails(message, { loading = false, content = '', retryable = false } = {}) {
  details.setAttribute('aria-busy', String(loading));
  status.textContent = message;
  progress.hidden = !loading;
  description.textContent = content;
  description.hidden = !content;
  retry.hidden = !retryable;
}

function stopLoading() {
  const previous = load;
  load = null;
  previous?.abort();
}

async function openRecord(visit) {
  stopLoading();
  const id = visit.params?.id;
  record.label = catalogue.get(id) || 'Survey record';
  if (!catalogue.has(id)) {
    showDetails('This record is unavailable. Return to the library to choose another.');
    return;
  }

  const controller = new AbortController();
  load = controller;
  showDetails('Loading the record…', { loading: true });
  try {
    const response = await fetch(new URL('./records.json', import.meta.url), { signal: controller.signal });
    if (!response.ok) throw new Error('The local record file could not be loaded');
    const records = await response.json();
    if (load !== controller || controller.signal.aborted || frame.visit !== visit) return;
    const content = Object.hasOwn(records, id) && typeof records[id] === 'string' ? records[id] : '';
    if (content) showDetails('', { content });
    else showDetails('This record is unavailable. Return to the library to choose another.');
  } catch {
    if (load === controller && !controller.signal.aborted && frame.visit === visit) {
      showDetails('The record could not be loaded.', { retryable: true });
    }
  } finally {
    if (load === controller) load = null;
  }
}

frame.addEventListener('metro-navigate', ({ detail }) => {
  remember(detail.to);
  if (detail.to.value === 'record') void openRecord(detail.to);
  else stopLoading();
});

back.addEventListener('click', () => {
  activation.cancel();
  if (!frame.back()) frame.navigate('library', { replace: true });
});

retry.addEventListener('click', () => {
  const visit = frame.visit;
  if (visit?.value !== 'record') return;
  back.focus({ preventScroll: true });
  void openRecord(visit);
});

for (const link of links) link.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  void activation.activate({ kind: 'link', destination: { href: link.href } });
});

window.addEventListener('pagehide', () => {
  activation.cancel();
  stopLoading();
});
window.addEventListener('pageshow', event => {
  const visit = frame.visit;
  if (event.persisted && visit?.value === 'record' && details.getAttribute('aria-busy') === 'true') {
    void openRecord(visit);
  }
});

await frame.updateComplete;
await new Promise(resolve => requestAnimationFrame(resolve));
splash.hidden = true;
frame.hidden = false;
const initial = new URL(location.href);
const result = await activation.activate(initial.searchParams.has('record')
  ? { kind: 'link', destination: { href: initial.href } }
  : { kind: 'launch' });
if (result === 'current') {
  remember(frame.visit);
  await frame.page.updateComplete;
  frame.page.focus({ preventScroll: true });
}
