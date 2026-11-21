import { MetroSelectionSet } from '../../dist/metro-ui.js';

const scope = new URL('./', location.href);
const catalogURL = new URL('catalog.json', scope);
const filesPath = new URL('files/', scope).pathname;
const maxFileSize = 256 * 1024;
const groupNames = { maps: 'Field maps', notes: 'Survey notes' };
const get = id => document.getElementById(id);
const commands = get('commands');
const groupContainer = get('groups');
const result = get('transfer-result');
const availability = get('availability');
const preview = get('file-preview');
const selection = new MetroSelectionSet();
const savedURLs = new Set();
const views = new Map();
const rowViews = new Map();
const progress = new Map();

let catalog = [];
let cache;
let listing = false;
let running = false;

for (const [group, name] of Object.entries(groupNames)) {
  const fragment = get('group-template').content.cloneNode(true);
  const section = fragment.querySelector('section');
  section.setAttribute('aria-label', name);
  const checkbox = section.querySelector('.group-choice');
  checkbox.label = name;
  checkbox.dataset.groupChoice = group;
  checkbox.addEventListener('change', () => {
    const items = members(group);
    selection.replaceScope(items, items.every(id => selection.has(id)) ? [] : items);
  });
  const transfer = section.querySelector('metro-transfer-control');
  transfer.transferId = group;
  transfer.label = `${name} download`;
  transfer.progressLabel = `Downloading ${name}`;
  transfer.addEventListener('metro-transfer-action', event => {
    const failed = progress.get(group)?.filter(file => file.phase === 'error') ?? [];
    if (event.detail.action === 'retry') void download(failed.map(file => file.item));
  });
  views.set(group, { checkbox, list: section.querySelector('ul'), transfer, transferRow: section.querySelector('.group-transfer') });
  groupContainer.append(fragment);
}

function members(group) {
  return catalog.filter(item => item.group === group && !item.disabled).map(item => item.value);
}

function updateChoices() {
  for (const [group, { checkbox }] of views) {
    const items = members(group);
    const count = items.filter(id => selection.has(id)).length;
    checkbox.disabled = items.length === 0;
    checkbox.checked = count > 0 && count === items.length;
    checkbox.indeterminate = count > 0 && count < items.length;
  }
  for (const [id, { checkbox }] of rowViews) checkbox.checked = selection.has(id);
  const text = `${selection.values.length} selected`;
  if (get('selection-count').textContent !== text) get('selection-count').textContent = text;
  updateCommands();
}

function updateCommands() {
  commands.returnFocus = [...views.values()].find(view => !view.checkbox.disabled)?.checkbox ?? get('title');
  commands.commands = [
    { id: 'refresh', label: 'Refresh file list', icon: '↻', priority: 30, disabled: listing },
    { id: 'select', label: 'Select all files', icon: '+', priority: 20, disabled: !catalog.some(item => !item.disabled) },
    { id: 'clear', label: 'Clear selection', icon: '×', priority: 10, disabled: !selection.values.length },
    { id: 'download', label: 'Download selection', icon: '↓', disabled: !cache || running ||
      !selection.selectedItems.some(item => !savedURLs.has(item.href)) },
  ];
}

function rowFor(item) {
  let view = rowViews.get(item.value);
  if (!view) {
    const row = document.createElement('li');
    row.className = 'file-row';
    row.dataset.file = item.value;
    const checkbox = document.createElement('metro-checkbox');
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Read offline';
    checkbox.addEventListener('change', () => selection.toggle(item.value, checkbox.checked));
    open.addEventListener('click', () => void openSaved(item.value, open));
    row.append(checkbox, open);
    view = { row, checkbox, open };
    rowViews.set(item.value, view);
  }
  view.checkbox.label = item.label;
  view.checkbox.disabled = item.disabled;
  view.open.hidden = !savedURLs.has(item.href);
  view.open.setAttribute('aria-label', `Read ${item.label} offline`);
  return view.row;
}

async function openSaved(id, trigger) {
  const item = catalog.find(item => item.value === id);
  if (!item) return;
  try {
    const response = await cache.match(item.href);
    if (!response) throw new Error('Cache entry missing');
    get('file-content').textContent = await response.text();
    preview.label = item.label;
    preview.returnFocus = views.get(item.group).checkbox;
    preview.show(trigger);
  } catch {
    savedURLs.delete(item.href);
    rowFor(item);
    updateCommands();
    result.textContent = 'This file is no longer available on this device.';
  }
}

function showCatalog(items) {
  const focus = document.activeElement;
  const active = focus?.closest('[data-file]');
  const previous = active && catalog.find(item => item.value === active.dataset.file);
  const focusedGroup = views.get(focus?.dataset.groupChoice)?.checkbox;
  catalog = items;
  for (const [group, { list }] of views) {
    const rows = items.filter(item => item.group === group).map(rowFor);
    const keep = new Set(rows);
    for (const child of [...list.children]) if (!keep.has(child)) child.remove();
    rows.forEach((row, index) => { if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null); });
  }
  for (const id of rowViews.keys()) if (!items.some(item => item.value === id)) rowViews.delete(id);
  selection.setCatalog(items);
  updateChoices();
  preview.returnFocus = commands.returnFocus;
  if (previous && !items.some(item => item.value === previous.value && !item.disabled)) {
    const local = views.get(previous.group).checkbox;
    const target = local.disabled ? commands.returnFocus : local;
    target.focus({ preventScroll: true });
  } else if (focusedGroup?.disabled) commands.returnFocus.focus({ preventScroll: true });
}

function parseCatalog(value) {
  if (!Array.isArray(value)) throw new TypeError('Expected a file list');
  const keys = new Set();
  return value.map(item => {
    if (!item || typeof item.value !== 'string' || !item.value || keys.has(item.value) ||
      typeof item.label !== 'string' || !item.label || !Object.hasOwn(groupNames, item.group) || typeof item.path !== 'string') {
      throw new TypeError('Invalid file entry');
    }
    const url = new URL(item.path, scope);
    if (url.origin !== scope.origin || url.username || url.password || !url.pathname.startsWith(filesPath) || url.search || url.hash) {
      throw new TypeError('Files must be in the local files directory');
    }
    keys.add(item.value);
    return { value: item.value, label: item.label, group: item.group, disabled: Boolean(item.disabled), href: url.href };
  });
}

async function updateCatalog() {
  if (listing) return;
  listing = true;
  updateCommands();
  try {
    let items;
    try {
      const response = await fetch(catalogURL, { cache: 'no-store' });
      if (!response.ok) throw new Error('The file list request failed');
      items = parseCatalog(await response.clone().json());
      if (cache) await cache.put(catalogURL, response).catch(() => {});
      availability.textContent = cache ? '' : 'This browser cannot keep files for offline use.';
    } catch {
      const cached = await cache?.match(catalogURL);
      if (!cached) throw new Error('No saved file list');
      items = parseCatalog(await cached.json());
      availability.textContent = 'Showing the last saved file list.';
    }
    if (cache) await Promise.all(items.map(async item => { if (await cache.match(item.href)) savedURLs.add(item.href); }));
    showCatalog(items);
  } catch {
    availability.textContent = 'The file list could not be loaded. Try Refresh file list.';
  } finally {
    listing = false;
    updateCommands();
  }
}

function updateProgress(group) {
  const entries = progress.get(group);
  const { transfer, transferRow } = views.get(group);
  if (!entries) return;
  transferRow.hidden = false;
  const busy = entries.some(file => file.phase === 'transferring');
  const errors = entries.filter(file => file.phase === 'error').length;
  transfer.phase = busy ? 'transferring' : errors ? 'error' : 'complete';
  transfer.transferred = entries.reduce((bytes, file) => bytes + file.transferred, 0);
  transfer.total = entries.every(file => file.size !== null) ? entries.reduce((bytes, file) => bytes + file.size, 0) : null;
  transfer.phaseLabel = errors && !busy ? `${errors} ${errors === 1 ? 'file needs' : 'files need'} a retry.` : '';
  transfer.pending = running && !busy;
}

async function saveFile(entry) {
  const { item } = entry;
  try {
    const response = await fetch(item.href, { cache: 'no-store', redirect: 'error' });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const length = Number(response.headers.get('content-length'));
    if (length > maxFileSize) throw new RangeError('File too large');
    if (length > 0 && !response.headers.get('content-encoding')) entry.size = length;
    updateProgress(item.group);

    const chunks = [];
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        entry.transferred += value.byteLength;
        if (entry.transferred > maxFileSize) { await reader.cancel(); throw new RangeError('File too large'); }
        chunks.push(value);
        updateProgress(item.group);
      }
    } else {
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > maxFileSize) throw new RangeError('File too large');
      entry.transferred = bytes.byteLength;
      chunks.push(bytes);
    }
    entry.size = entry.transferred;
    updateProgress(item.group);
    await cache.put(item.href, new Response(new Blob(chunks), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    savedURLs.add(item.href);
    entry.phase = 'complete';
    const current = catalog.find(record => record.value === item.value);
    if (current) rowFor(current);
  } catch {
    entry.phase = 'error';
  }
  updateProgress(item.group);
}

async function download(items) {
  if (running || !cache) return;
  const entries = items.filter(item => !savedURLs.has(item.href)).map(item => ({ item, phase: 'transferring', size: null, transferred: 0 }));
  if (!entries.length) return;
  running = true;
  result.textContent = '';
  const groups = new Set(entries.map(entry => entry.item.group));
  for (const group of groups) {
    progress.set(group, entries.filter(entry => entry.item.group === group));
    updateProgress(group);
  }
  updateCommands();
  await Promise.all(entries.map(saveFile));
  running = false;
  for (const group of progress.keys()) updateProgress(group);
  updateCommands();
  const successful = entries.filter(entry => entry.phase === 'complete').length;
  const failed = entries.length - successful;
  result.textContent = `Saved ${successful} ${successful === 1 ? 'file' : 'files'} for offline use.${failed ? ` ${failed} could not be saved.` : ''}`;
}

selection.addEventListener('change', updateChoices);
window.addEventListener('online', () => void updateCatalog());
commands.addEventListener('metro-command', event => {
  switch (event.detail.id) {
    case 'refresh': void updateCatalog(); break;
    case 'select': selection.replaceScope(catalog.map(item => item.value), catalog.map(item => item.value)); break;
    case 'clear': selection.clear(); break;
    case 'download': void download(selection.selectedItems); break;
  }
});

if (isSecureContext && 'caches' in globalThis) {
  try { cache = await caches.open(`metro-offline-files:${scope.pathname}:v1`); } catch { /* online listing remains available */ }
}
if (isSecureContext && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(new URL('offline-worker.js', scope), { scope: scope.href }).catch(() => {});
}
await updateCatalog();
