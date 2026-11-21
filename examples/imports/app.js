import '../../dist/metro-ui.js';
import { acknowledgeImport, destinations, readImports, stageImport } from './storage.js';

const scope = new URL('./', location.href);
const sourceNames = { share: 'Shared from another app', launch: 'Opened from the file handler', picker: 'Chosen from this device' };
const contentError = 'Choose up to four text or Markdown files of 256 KiB each, or share a short note or URL.';
const storageError = 'Imports could not be saved on this device.';
const get = id => document.getElementById(id);
const system = get('system');
const picker = get('picker');
const message = get('message');
const pending = get('pending');
const imports = get('imports');
const preview = get('preview');
const previewHeading = get('preview-heading');
const files = get('files');
const destination = get('destination');
const accept = get('accept');
let active = null;
let generation = 0;
let arrival = 0;

for (const [value, label] of Object.entries(destinations)) destination.append(new Option(label, value));

function titleOf(item) {
  return item.title || item.files[0]?.name || 'Shared note';
}

function activate(id) {
  const url = new URL(scope);
  if (id) url.searchParams.set('incoming', id);
  history.replaceState(history.state, '', url);
  if (id !== active) {
    active = null;
    preview.hidden = true;
  }
}

function summary(item) {
  const row = document.createElement('li');
  const details = document.createElement('details');
  const label = document.createElement('summary');
  label.textContent = titleOf(item);
  details.append(label);
  for (const value of [item.text, item.url]) {
    if (!value) continue;
    const content = document.createElement('p');
    content.textContent = value;
    details.append(content);
  }
  details.addEventListener('toggle', function showFiles() {
    if (!details.open) return;
    details.removeEventListener('toggle', showFiles);
    details.append(...item.files.flatMap(filePreview));
  });
  row.append(details);
  return row;
}

function pendingRow(item) {
  const row = document.createElement('li');
  const open = document.createElement('button');
  open.type = 'button';
  open.dataset.importId = item.id;
  open.textContent = `Review ${titleOf(item)}`;
  if (item.id === active) open.setAttribute('aria-current', 'true');
  open.addEventListener('click', () => {
    message.textContent = '';
    activate(item.id);
    void render(previewHeading);
  });
  row.append(open);
  return row;
}

function receiptGroups(receipts) {
  return Object.entries(destinations).flatMap(([key, name]) => {
    const items = receipts.filter(item => item.destination === key);
    if (!items.length) return [];
    const group = document.createElement('section');
    const title = document.createElement('h3');
    title.textContent = name;
    title.id = `imported-${key}`;
    group.setAttribute('aria-labelledby', title.id);
    const list = document.createElement('ul');
    list.append(...items.map(summary));
    group.append(title, list);
    return [group];
  });
}

function showText(element, value) {
  element.textContent = value;
  element.hidden = !value;
}

function filePreview(file) {
  const heading = document.createElement('h3');
  heading.textContent = file.name;
  const text = document.createElement('pre');
  try {
    const content = new TextDecoder().decode(file.data.slice(0, 2048));
    text.textContent = content + (file.data.byteLength > 2048 ? '\n…' : '');
  } catch {
    text.textContent = 'Preview unavailable.';
  }
  return [heading, text];
}

async function render(focus) {
  const revision = ++generation;
  try {
    const received = await readImports();
    if (revision !== generation) return;
    const id = new URLSearchParams(location.search).get('incoming');
    const selected = received.pending.find(item => item.id === id);
    active = selected?.id ?? null;
    pending.replaceChildren(...received.pending.map(pendingRow));
    imports.replaceChildren(...receiptGroups(received.imports));
    get('empty-pending').hidden = received.pending.length > 0;
    get('empty-imported').hidden = received.imports.length > 0;
    preview.hidden = !selected;
    if (selected) {
      previewHeading.textContent = `Review ${titleOf(selected)}`;
      get('source').textContent = sourceNames[selected.source];
      showText(get('note'), selected.text);
      showText(get('address'), selected.url);
      files.replaceChildren(...selected.files.flatMap(filePreview));
    } else if (id) {
      message.textContent = received.imports.some(item => item.id === id) ? 'This import was already accepted.' : 'This import is unavailable.';
    }
    const target = typeof focus === 'string' ? [...pending.querySelectorAll('button')].find(node => node.dataset.importId === focus) : focus;
    if (target && !target.closest('[hidden]')) target.focus();
  } catch {
    if (revision === generation) message.textContent = storageError;
  }
}

async function fromFiles(source, operation) {
  const ordinal = ++arrival;
  try {
    const files = await operation;
    if (!files.length) return;
    const id = await stageImport({ source, files });
    if (ordinal === arrival) {
      activate(id);
      message.textContent = 'Import ready for review.';
      await render(previewHeading);
    } else await render();
  } catch (error) {
    if (ordinal === arrival) message.textContent = error instanceof TypeError ? contentError : storageError;
  }
}

get('later').addEventListener('click', () => {
  const id = active;
  activate(null);
  message.textContent = 'Import kept for later review.';
  void render(id);
});

get('acknowledge').addEventListener('submit', async event => {
  event.preventDefault();
  const id = active;
  const area = destination.value;
  if (!id || accept.disabled) return;
  accept.disabled = true;
  try {
    const applied = await acknowledgeImport(id, area);
    const stillActive = active === id;
    if (stillActive) activate(null);
    message.textContent = applied ? `Imported into ${destinations[area]}.` : 'This import was already accepted.';
    await render(stillActive ? get('imported-heading') : null);
  } catch {
    message.textContent = storageError;
  } finally {
    accept.disabled = false;
  }
});

picker.addEventListener('metro-file-select', ({ detail }) => {
  const selected = [...detail.files];
  picker.clear();
  void fromFiles('picker', selected);
});

window.launchQueue?.setConsumer?.(params => fromFiles('launch', Promise.all((params.files ?? [])
  .filter(handle => handle.kind === 'file').map(handle => handle.getFile()))));

async function register() {
  if (!isSecureContext || !('serviceWorker' in navigator)) {
    system.textContent = 'Use the file picker to import on this browser.';
    return;
  }
  try {
    await navigator.serviceWorker.register(new URL('worker.js', scope), { scope: scope.href, type: 'module' });
    await navigator.serviceWorker.ready;
    system.textContent = 'An installed app can receive shares and files on supported devices.';
  } catch {
    system.textContent = 'The share target is unavailable. Choose a file on this page.';
  }
}

const search = new URLSearchParams(location.search);
if (search.get('import-error')) message.textContent = search.get('import-error') === 'content' ? contentError : storageError;
window.addEventListener('popstate', () => void render());
void render(search.has('incoming') ? previewHeading : null);
void register();
