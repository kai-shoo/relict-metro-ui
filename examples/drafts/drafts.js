import '../../dist/metro-ui.js';
import { createDraftSender } from './sender.js';

const durableKey = 'metro-example-drafts:v1:local';
const sessionKey = 'metro-example-drafts:v1:session';
const catalogue = { north: 'North depot', west: 'West depot' };
const maxFileSize = 128 * 1024;
const sender = createDraftSender(new URL('./api/submissions/', import.meta.url));
const fields = {
  summary: document.querySelector('#summary'),
  notes: document.querySelector('#notes'),
  due: document.querySelector('#due'),
};
const form = document.querySelector('#draft');
const picker = document.querySelector('#picker');
const leave = document.querySelector('#leave');
const status = document.querySelector('#draft-status');
const error = document.querySelector('#error');
const title = document.querySelector('#title');
const attachment = document.querySelector('#attachment');
const download = document.querySelector('#attachment-download');
const emptyQueue = document.querySelector('#empty-queue');
const outbox = document.querySelector('#outbox');
const sendQueued = document.querySelector('#send-queued');
const offlineStatus = document.querySelector('#offline-status');
const recordButtons = [...document.querySelectorAll('[data-record]')];
const transferRows = new Map();
const attempts = new Map();

function readStorage(kind, key, fallback) {
  try {
    return JSON.parse(window[kind].getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function draftFrom(value) {
  const summary = typeof value?.summary === 'string' ? value.summary : '';
  const notes = typeof value?.notes === 'string' ? value.notes : '';
  const due = typeof value?.due === 'string' ? value.due : '';
  const file = value?.file;
  const matches = file && typeof file.name === 'string' && typeof file.type === 'string'
    && typeof file.data === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(file.data) && file.data.length % 4 === 0;
  const revision = Number.isSafeInteger(value?.revision) ? value.revision : 0;
  return { summary, notes, due, file: matches ? file : null, revision };
}

function sameContent(a, b) {
  return a.summary === b.summary && a.notes === b.notes && a.due === b.due
    && a.file?.name === b.file?.name && a.file?.type === b.file?.type && a.file?.data === b.file?.data;
}

const newClientId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
function readDurable() {
  const stored = readStorage('localStorage', durableKey, {});
  const clientId = stored.clientId ?? newClientId;
  return {
    clientId,
    records: stored.records ?? {},
    outbox: Object.fromEntries(Object.entries(stored.outbox ?? {}).map(([id, entry]) => [id, entry.idempotencyKey ? entry : {
      ...entry, idempotencyKey: `${clientId}.${id}`, phase: entry.phase === 'waiting' ? 'queued' : entry.phase,
    }])),
  };
}

let durable = readDurable();
const restored = readStorage('sessionStorage', sessionKey, {});
let active = Object.hasOwn(catalogue, restored.active) ? restored.active : 'north';
const drafts = Object.fromEntries(Object.keys(catalogue).map(id => [id, draftFrom(restored.drafts?.[id] ?? durable.records[id])]));
let request = restored.request?.id === active && restored.request.revision === drafts[active].revision
  ? restored.request : null;
let reading = null;
let token = Number.isSafeInteger(restored.token) ? restored.token : 0;
let destination = '';
let focus = restored.focus ?? null;
let visibleAttachment = null;
let attachmentURL = null;

function showError(message = '') {
  error.textContent = message;
  error.hidden = !message;
}

function remember() {
  const focused = document.activeElement;
  const field = focused && Object.values(fields).includes(focused) ? focused : fields[focus?.key];
  if (field) {
    focus = { key: field.id, start: field.selectionStart, end: field.selectionEnd };
  }
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ active, drafts, request, token, focus, scroll: window.scrollY }));
  } catch {
    showError('This tab could not keep a recovery copy.');
  }
}

function dirty() {
  return !sameContent(drafts[active], draftFrom(durable.records[active]));
}

function renderAttachment() {
  const file = drafts[active].file;
  if (file === visibleAttachment) return;
  if (attachmentURL) URL.revokeObjectURL(attachmentURL);
  attachmentURL = null;
  visibleAttachment = file;
  attachment.hidden = !file;
  if (!file) {
    download.removeAttribute('href');
    return;
  }
  const bytes = Uint8Array.from(atob(file.data), character => character.charCodeAt(0));
  attachmentURL = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  download.href = attachmentURL;
  download.download = file.name;
  download.textContent = file.name;
}

function renderDraftStatus() {
  status.textContent = dirty() ? 'Unsaved changes'
    : durable.records[active] ? `Saved on this device · Revision ${durable.records[active].version}` : '';
}

function renderRecord() {
  const draft = drafts[active];
  title.textContent = catalogue[active];
  for (const [name, field] of Object.entries(fields)) field.value = draft[name];
  for (const button of recordButtons) button.setAttribute('aria-pressed', String(button.dataset.record === active));
  picker.contextKey = request?.key ?? `${active}:idle`;
  renderAttachment();
  renderDraftStatus();
}

function renderOutbox() {
  const entries = Object.entries(durable.outbox);
  emptyQueue.hidden = entries.length > 0;
  sendQueued.disabled = !entries.some(([, entry]) => ['queued', 'waiting'].includes(entry.phase));
  for (const [id, entry] of entries) {
    let row = transferRows.get(id);
    if (!row) {
      row = document.createElement('metro-transfer-control');
      row.transferId = id;
      transferRows.set(id, row);
      outbox.append(row);
    }
    row.label = `${catalogue[entry.id]} · Revision ${entry.version}`;
    row.phase = entry.phase;
    row.phaseLabel = entry.phase === 'complete' ? 'Sent' : entry.message ?? '';
    row.waitingReason = entry.waitingReason ?? '';
    row.pending = attempts.get(id)?.reconcileOnly ?? false;
  }
}

function persist(next) {
  try {
    localStorage.setItem(durableKey, JSON.stringify(next));
  } catch {
    showError('The device could not save this revision. Your current edits are still here.');
    return false;
  }
  durable = next;
  renderDraftStatus();
  renderOutbox();
  remember();
  return true;
}

function updateFields() {
  const draft = drafts[active];
  const next = { ...draft };
  for (const [name, field] of Object.entries(fields)) next[name] = field.value;
  if (sameContent(draft, next)) return;
  drafts[active] = { ...next, revision: draft.revision + 1 };
  if (request) resetPicker();
  showError();
  renderDraftStatus();
  remember();
}

function save(enqueue = false) {
  updateFields();
  if (!form.reportValidity()) return false;
  const latest = readDurable();
  const prior = latest.records[active];
  const draft = drafts[active];
  const version = prior && sameContent(draft, prior) ? prior.version : (prior?.version ?? 0) + 1;
  const record = { summary: draft.summary, notes: draft.notes, due: draft.due, file: draft.file, version };
  const records = { ...latest.records, [active]: record };
  const nextOutbox = { ...latest.outbox };
  if (enqueue) {
    const key = `${active}:${version}`;
    if (!nextOutbox[key] || nextOutbox[key].phase === 'cancelled') {
      nextOutbox[key] = { ...record, id: active, idempotencyKey: `${latest.clientId}.${key}`, phase: 'queued' };
    }
  }
  showError();
  return persist({ ...latest, records, outbox: nextOutbox });
}

function openRecord(id) {
  if (!Object.hasOwn(catalogue, id)) return;
  request = null;
  picker.clear();
  active = id;
  focus = { key: 'summary' };
  showError();
  renderRecord();
  fields.summary.focus();
  remember();
}

form.addEventListener('input', event => {
  if (Object.values(fields).includes(event.target)) updateFields();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  save();
});
form.addEventListener('focusin', remember);
document.querySelector('#enqueue').addEventListener('click', () => save(true));
document.querySelector('#remove-attachment').addEventListener('click', () => {
  const draft = drafts[active];
  drafts[active] = { ...draft, file: null, revision: draft.revision + 1 };
  if (request) resetPicker();
  renderAttachment();
  renderDraftStatus();
  remember();
  picker.focus();
});

for (const button of recordButtons) button.addEventListener('click', () => {
  const id = button.dataset.record;
  if (id === active) return;
  if (!dirty()) {
    openRecord(id);
    return;
  }
  destination = id;
  remember();
  leave.show(button);
});

leave.addEventListener('metro-close', ({ detail }) => {
  const next = destination;
  destination = '';
  if (detail.reason !== 'action' || !next) return;
  if (detail.value === 'discard') {
    drafts[active] = { ...draftFrom(durable.records[active]), revision: drafts[active].revision + 1 };
    openRecord(next);
  } else if (detail.value === 'save' && save()) {
    openRecord(next);
  }
});

picker.addEventListener('click', event => {
  const input = event.composedPath()[0];
  if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
  updateFields();
  const revision = drafts[active].revision;
  request = { id: active, revision, key: `${active}:${revision}:${++token}` };
  picker.contextKey = request.key;
  remember();
}, { capture: true });

function matchesRequest(detail, expected = request) {
  return expected && request === expected && expected.key === detail.contextKey
    && expected.id === active && expected.revision === drafts[active].revision;
}

function resetPicker() {
  request = null;
  picker.clear();
  picker.contextKey = `${active}:idle`;
}

function finishPicker() {
  resetPicker();
  remember();
}

picker.addEventListener('metro-file-cancel', ({ detail }) => {
  if (matchesRequest(detail)) finishPicker();
});

picker.addEventListener('metro-file-select', async ({ detail }) => {
  const expected = request;
  const file = detail.files[0];
  if (!file || !matchesRequest(detail, expected) || reading === expected) return;
  if (file.size > maxFileSize) {
    finishPicker();
    showError('Choose a file no larger than 128 KB for this demo.');
    return;
  }
  reading = expected;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesRequest(detail, expected)) return;
    let text = '';
    for (const byte of bytes) text += String.fromCharCode(byte);
    const draft = drafts[active];
    drafts[active] = { ...draft, file: { name: file.name, type: file.type, data: btoa(text) }, revision: draft.revision + 1 };
    finishPicker();
    showError();
    renderAttachment();
    renderDraftStatus();
  } catch {
    if (matchesRequest(detail, expected)) {
      finishPicker();
      showError('The file could not be read. Choose it again.');
    }
  } finally {
    if (reading === expected) reading = null;
  }
});

function updateEntry(id, expected, changes) {
  const latest = readDurable();
  const saved = latest.outbox[id];
  if (saved?.idempotencyKey !== expected.idempotencyKey || saved.phase !== expected.phase) return null;
  const entry = { ...saved, ...changes };
  return persist({ ...latest, outbox: { ...latest.outbox, [id]: entry } }) ? entry : null;
}

async function syncRevision(id, reconcileOnly = false) {
  let entry = durable.outbox[id];
  if (attempts.has(id) || !entry || entry.phase === 'complete') return;
  if (!navigator.onLine) {
    if (!reconcileOnly && entry.phase !== 'waiting') {
      updateEntry(id, entry, { phase: 'waiting', waitingReason: 'Offline', message: '' });
    }
    return;
  }

  const previousPhase = entry.phase;
  if (!reconcileOnly && entry.phase !== 'transferring') {
    entry = updateEntry(id, entry, { phase: 'transferring', waitingReason: '', message: '' });
    if (!entry) return;
  }
  const controller = new AbortController();
  const attempt = { controller, reconcileOnly };
  attempts.set(id, attempt);
  if (reconcileOnly) renderOutbox();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);

  try {
    let receipt = previousPhase === 'queued' ? null : await sender.find(entry, signal);
    if (!receipt && !reconcileOnly) {
      signal.throwIfAborted();
      receipt = await sender.send(entry, signal);
    }
    if (receipt && !controller.signal.aborted) updateEntry(id, entry, { phase: 'complete', receipt });
  } catch (error) {
    if (controller.signal.aborted || reconcileOnly) return;
    const failure = navigator.onLine
      ? { phase: 'error', message: error instanceof TypeError ? 'Connection interrupted'
        : error instanceof Error ? error.message : 'Transfer failed' }
      : { phase: 'waiting', waitingReason: 'Offline' };
    updateEntry(id, entry, failure);
  } finally {
    if (attempts.get(id) === attempt) {
      attempts.delete(id);
      if (reconcileOnly) renderOutbox();
    }
  }
}

function resume() {
  for (const [id, entry] of Object.entries(durable.outbox)) {
    if (entry.phase === 'waiting' || entry.phase === 'transferring') void syncRevision(id);
    if (entry.phase === 'error') void syncRevision(id, true);
  }
}

function showConnectivity() {
  offlineStatus.textContent = navigator.onLine ? '' : 'Offline. Drafts can still be saved on this device.';
}

sendQueued.addEventListener('click', () => {
  showConnectivity();
  for (const [id, entry] of Object.entries(durable.outbox)) {
    if (entry.phase === 'queued' || entry.phase === 'waiting') void syncRevision(id);
  }
});

outbox.addEventListener('metro-transfer-action', ({ detail }) => {
  const { id, action, phase } = detail;
  const entry = durable.outbox[id];
  if (!entry || entry.phase !== phase) return;
  if (action === 'retry') {
    void syncRevision(id);
  } else if (updateEntry(id, entry, { phase: 'cancelled', message: '', waitingReason: '' })) {
    const attempt = attempts.get(id);
    attempts.delete(id);
    attempt?.controller.abort();
  }
});

window.addEventListener('online', () => {
  showConnectivity();
  resume();
});
window.addEventListener('storage', event => {
  if (event.key !== durableKey) return;
  durable = readDurable();
  renderOutbox();
  renderDraftStatus();
});
window.addEventListener('offline', () => {
  showConnectivity();
  for (const [id, attempt] of attempts) {
    const entry = durable.outbox[id];
    if (entry?.phase === 'transferring'
      && updateEntry(id, entry, { phase: 'waiting', waitingReason: 'Offline' })) {
      attempts.delete(id);
      attempt.controller.abort();
    }
  }
});

window.addEventListener('pagehide', event => {
  remember();
  if (!event.persisted && attachmentURL) URL.revokeObjectURL(attachmentURL);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') remember();
});

renderRecord();
renderOutbox();
showConnectivity();
resume();
if (isSecureContext && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./draft-worker.js').catch(() => {
    offlineStatus.textContent = navigator.onLine ? 'Offline reopening is unavailable on this host.' : offlineStatus.textContent;
  });
}
const recovery = focus;
if (recovery && Object.hasOwn(fields, recovery.key)) {
  const field = fields[recovery.key];
  await field.updateComplete;
  window.scrollTo(0, Number.isFinite(restored.scroll) ? restored.scroll : 0);
  field.focus({ preventScroll: true });
  if (typeof recovery.start === 'number' && typeof recovery.end === 'number') {
    field.setSelectionRange?.(recovery.start, recovery.end);
  }
}
