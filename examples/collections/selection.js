import { MetroSelectionSet } from '../../dist/metro-ui.js';

const rows = [...document.querySelectorAll('metro-cross-slide')];
const recordings = rows.map(row => ({ value: row.value, label: row.label }));
let catalog = recordings;
const selection = new MetroSelectionSet(catalog);
const queue = [];
const openSelection = document.querySelector('#open-selection');
const selectionDialog = document.querySelector('#selection');
const selectedRecordings = document.querySelector('#selected-recordings');
const queuePositions = document.querySelector('#queue-positions');
const enqueue = document.querySelector('#enqueue');
const queueUpdate = document.querySelector('#queue-update');
let adding;
let closingSelection = false;

function listItem(text) {
  const item = document.createElement('li');
  item.textContent = text;
  return item;
}

function renderSelection() {
  const items = selection.selectedItems;
  const focusStatus = items.length === 0 && document.activeElement === enqueue;
  openSelection.textContent = `Selection (${items.length})`;
  for (const row of rows) row.selected = selection.has(row.value);
  selectedRecordings.replaceChildren(...items.map(item => listItem(item.label)));
  enqueue.disabled = items.length === 0;
  enqueue.setAttribute('aria-disabled', String(Boolean(adding)));
  if (focusStatus) {
    queueUpdate.focus({ preventScroll: true });
    queueUpdate.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
}

selection.addEventListener('change', renderSelection);
document.addEventListener('metro-cross-slide-change', event => {
  selection.toggle(event.detail.value, event.detail.selected);
});
function syncSelectionDialog() {
  closingSelection = false;
  if (history.state?.recordingSelection) selectionDialog.show(openSelection);
  else selectionDialog.open = false;
}

openSelection.addEventListener('click', () => {
  if (!history.state?.recordingSelection) history.pushState({ ...history.state, recordingSelection: true }, '');
  syncSelectionDialog();
});
selectionDialog.addEventListener('metro-before-close', event => {
  if (!history.state?.recordingSelection) return;
  event.preventDefault();
  if (closingSelection) return;
  closingSelection = true;
  history.back();
});
selectionDialog.addEventListener('metro-close', () => {
  if (adding) {
    adding.abort();
    adding = undefined;
    queueUpdate.textContent = '';
  }
  renderSelection();
});

function renderQueue() {
  queuePositions.replaceChildren(...queue.map(position => {
    const item = listItem(position.recording.label);
    item.dataset.metroKey = position.id;
    return item;
  }));
}

enqueue.addEventListener('click', async () => {
  const requested = selection.selectedItems;
  if (adding || !requested.length) return;
  const controller = new AbortController();
  adding = controller;
  const { signal } = controller;
  queueUpdate.textContent = 'Checking availability…';
  renderSelection();
  try {
    const response = await fetch('./available-recordings.json', { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog could not be loaded');
    const keys = await response.json();
    if (signal.aborted) return;
    const available = new Set(keys);
    catalog = recordings.filter(recording => available.has(recording.value));
    selection.setCatalog(catalog);
    for (const row of rows) row.hidden = !available.has(row.value);
    showRecording();

    const skipped = [];
    for (const recording of requested) {
      if (available.has(recording.value)) queue.push({ id: `position-${queue.length + 1}`, recording });
      else skipped.push(recording.label);
    }
    renderQueue();
    const result = `Queue contains ${queue.length} recordings.`;
    queueUpdate.textContent = skipped.length ? `${result} Unavailable: ${skipped.join(', ')}.` : result;
  } catch {
    if (!signal.aborted) queueUpdate.textContent = 'Availability could not be checked. Try again.';
  } finally {
    if (adding === controller) {
      adding = undefined;
      renderSelection();
    }
  }
});

function showRecording() {
  const recording = catalog.find(entry => entry.value === location.hash.slice(1));
  document.querySelector('#recording').textContent = recording ? `Opened ${recording.label}.` : '';
}

window.addEventListener('hashchange', showRecording);
window.addEventListener('popstate', syncSelectionDialog);
showRecording();
renderSelection();
syncSelectionDialog();
