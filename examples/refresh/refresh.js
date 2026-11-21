import '../../dist/metro-ui.js';

const endpoint = new URL('./requests.json', location.href);
const states = { open: 'Open', review: 'In review', closed: 'Closed' };
const get = id => document.getElementById(id);
const refresh = get('requests');
const filters = get('filters');
const filterToggle = get('filter-toggle');
const filterState = get('filter-state');
const cancel = get('cancel-refresh');
const loading = get('loading');
const unloaded = get('unloaded');
const firstError = get('initial-error');
const refreshError = get('refresh-error');
const empty = get('empty');
const groups = get('groups');
const results = get('results-status');
const commands = get('commands');
const menu = get('row-menu');
const details = get('details');
const rowViews = new Map();
const sections = new Map();

let records = null;
let visible = [];
let selected;
let filter = readFilter();
let request;
let rendered = 0;
let menuKey;
let menuTrigger;

filterState.value = filter;
menu.commands = [{ id: 'details', label: 'View request' }];

for (const [state, label] of Object.entries(states)) {
  const section = document.createElement('section');
  section.className = 'group';
  section.hidden = true;
  const heading = document.createElement('h2');
  heading.id = `group-${state}`;
  heading.textContent = label;
  section.setAttribute('aria-labelledby', heading.id);
  const list = document.createElement('ul');
  list.setAttribute('role', 'list');
  section.append(heading, list);
  groups.append(section);
  sections.set(state, { section, list });
}

function readFilter() {
  const value = new URLSearchParams(location.search).get('state');
  return Object.hasOwn(states, value) ? value : 'all';
}

function writeFilter() {
  const url = new URL(location.href);
  if (filter === 'all') url.searchParams.delete('state');
  else url.searchParams.set('state', filter);
  history.replaceState(history.state, '', url);
}

function readRecords(data) {
  if (!Array.isArray(data)) throw new TypeError('Expected an array of requests');
  const keys = new Set();
  for (const item of data) {
    if (!item || typeof item.id !== 'string' || !item.id || keys.has(item.id) ||
      typeof item.label !== 'string' || !item.label || typeof item.description !== 'string' || !Object.hasOwn(states, item.state)) {
      throw new TypeError('Invalid request record');
    }
    keys.add(item.id);
  }
  return data;
}

function updateCommands() {
  const context = selected ?? '';
  if (commands.context === context && commands.commands.length) return;
  commands.context = context;
  commands.returnFocus = rowViews.get(selected)?.choice ?? filterToggle;
  commands.commands = [{ id: 'details', label: 'View selected request', icon: '↗', disabled: !selected }];
}

function viewRequest(id, trigger) {
  const record = visible.find(item => item.id === id);
  if (!record) return;
  details.label = record.label;
  get('details-description').textContent = record.description;
  details.returnFocus = filterToggle;
  details.show(trigger);
}

function showMenu(id, trigger) {
  if (!visible.some(item => item.id === id)) return;
  menuTrigger?.setAttribute('aria-expanded', 'false');
  menuKey = id;
  menuTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  menu.returnFocus = filterToggle;
  menu.show(trigger);
}

function rowView(record) {
  let view = rowViews.get(record.id);
  if (!view) {
    const row = document.createElement('li');
    row.className = 'record';
    row.dataset.metroKey = record.id;
    const label = document.createElement('label');
    const choice = document.createElement('input');
    choice.type = 'radio';
    choice.name = 'selected-request';
    choice.dataset.metroFocus = `${record.id}:choice`;
    const title = document.createElement('span');
    label.append(choice, title);
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Actions';
    action.dataset.metroFocus = `${record.id}:action`;
    action.setAttribute('aria-haspopup', 'menu');
    action.setAttribute('aria-expanded', 'false');
    row.append(label, action);
    choice.addEventListener('change', () => { if (choice.checked) { selected = record.id; updateCommands(); } });
    action.addEventListener('click', () => showMenu(record.id, action));
    row.addEventListener('keydown', event => {
      if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
      event.preventDefault();
      showMenu(record.id, action);
    });
    view = { row, choice, title, action };
    rowViews.set(record.id, view);
  }
  if (view.title.textContent !== record.label) {
    view.title.textContent = record.label;
    view.choice.setAttribute('aria-label', `Select ${record.label}`);
    view.action.setAttribute('aria-label', `Actions for ${record.label}`);
  }
  view.choice.checked = selected === record.id;
  return view.row;
}

function writeRows(list, rows) {
  const retained = new Set(rows);
  for (const child of [...list.children]) if (!retained.has(child)) child.remove();
  rows.forEach((row, index) => {
    const current = list.children[index];
    if (current !== row) list.insertBefore(row, current ?? null);
  });
}

function captureView() {
  const active = document.activeElement === menu ? menuTrigger : document.activeElement;
  const row = active?.closest('[data-metro-key]');
  return { anchor: refresh.getAnchor(), previous: visible, active: row ? active : null,
    focused: row?.dataset.metroKey, control: active?.localName === 'button' ? 'action' : 'choice' };
}

function neighbor(previous, nextKeys, key) {
  if (nextKeys.has(key)) return key;
  const index = previous.findIndex(record => record.id === key);
  for (let distance = 1; index >= 0 && distance < previous.length; distance++) {
    const candidates = [previous[index + distance]?.id, previous[index - distance]?.id];
    const survivor = candidates.find(candidate => nextKeys.has(candidate));
    if (survivor) return survivor;
  }
  return nextKeys.values().next().value;
}

function render(data, reason) {
  const snapshot = captureView();
  const wasLoaded = records !== null;
  records = data;
  visible = Object.keys(states).flatMap(state => filter === 'all' || filter === state
    ? (records ?? []).filter(item => item.state === state) : []);
  const nextKeys = new Set(visible.map(item => item.id));
  if (!nextKeys.has(selected)) selected = undefined;
  if (menu.open && !nextKeys.has(menuKey)) menu.close();
  for (const [state, { section, list }] of sections) {
    const rows = visible.filter(item => item.state === state).map(rowView);
    section.hidden = rows.length === 0;
    writeRows(list, rows);
  }
  for (const [id, view] of rowViews) {
    if (!nextKeys.has(id)) { view.row.remove(); rowViews.delete(id); }
  }
  empty.hidden = records === null || visible.length > 0;
  empty.textContent = filter === 'all' ? 'There are no available requests.' : `No requests match the ${states[filter]} filter.`;
  updateCommands();

  const changed = snapshot.previous.length !== visible.length || visible.some((record, index) => {
    const old = snapshot.previous[index];
    return old?.id !== record.id || old.label !== record.label || old.state !== record.state;
  });
  if (records !== null && (!wasLoaded || changed || reason === 'filter')) {
    const count = `${visible.length} ${visible.length === 1 ? 'request' : 'requests'} shown.`;
    const missing = snapshot.previous.find(item => item.id === snapshot.focused && !nextKeys.has(item.id));
    results.textContent = missing ? `${count} ${missing.label} is no longer in this view.` : count;
  }
  return { ...snapshot, nextKeys, reason, revision: ++rendered };
}

async function restoreView(view) {
  await refresh.updateComplete;
  if (view.revision !== rendered) return;
  if (view.reason === 'filter') {
    refresh.scrollViewport.scrollTop = 0;
    (rowViews.get(view.nextKeys.values().next().value)?.choice ?? filterToggle).focus({ preventScroll: true });
    return;
  }
  if (view.anchor) {
    const key = neighbor(view.previous, view.nextKeys, view.anchor.key);
    if (key) refresh.restoreAnchor({ ...view.anchor, key });
  }
  const listFallback = refresh.scrollViewport?.matches(':focus');
  if (view.focused && (document.activeElement === document.body || document.activeElement === view.active || listFallback)) {
    const key = neighbor(view.previous, view.nextKeys, view.focused);
    const target = rowViews.get(key)?.[view.control] ?? filterToggle;
    if (document.activeElement !== target) target.focus({ preventScroll: true });
  }
}

function setBusy(busy) {
  refresh.refreshing = busy;
  if (!busy && document.activeElement === cancel) filterToggle.focus({ preventScroll: true });
  cancel.hidden = !busy;
  loading.hidden = !busy || records !== null;
  unloaded.hidden = busy || records !== null || !firstError.hidden;
  if (records !== null && !visible.length) empty.hidden = !firstError.hidden;
}

async function load(source) {
  if (request) return;
  const job = { abort: new AbortController(), focus: captureView() };
  request = job;
  firstError.hidden = refreshError.hidden = true;
  refresh.refreshingLabel = source === 'programmatic' && records !== null ? '' : 'Refreshing requests';
  setBusy(true);
  try {
    const response = await fetch(endpoint, { signal: job.abort.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = readRecords(await response.json());
    if (request !== job) return;
    const view = render(data, 'refresh');
    setBusy(false);
    await restoreView(view);
  } catch {
    if (request !== job || job.abort.signal.aborted) return;
    if (records?.length) refreshError.hidden = false;
    else { empty.hidden = true; firstError.hidden = false; }
  } finally {
    if (request === job) { request = undefined; setBusy(false); }
  }
}

filterToggle.addEventListener('click', () => {
  filters.hidden = !filters.hidden;
  filterToggle.setAttribute('aria-expanded', String(!filters.hidden));
  if (!filters.hidden) filterState.focus();
});
filters.addEventListener('submit', event => {
  event.preventDefault();
  filter = filterState.value;
  writeFilter();
  filters.hidden = true;
  filterToggle.setAttribute('aria-expanded', 'false');
  void restoreView(render(records, 'filter'));
});
cancel.addEventListener('click', () => {
  const job = request;
  if (!job) return;
  request = undefined;
  job.abort.abort();
  setBusy(false);
  (rowViews.get(job.focus.focused)?.[job.focus.control] ?? filterToggle).focus({ preventScroll: true });
});
for (const button of [get('initial-retry'), get('refresh-retry')]) {
  button.addEventListener('click', () => { filterToggle.focus({ preventScroll: true }); void load('button'); });
}
menu.addEventListener('metro-close', () => menuTrigger?.setAttribute('aria-expanded', 'false'));
menu.addEventListener('metro-command', event => {
  if (event.detail.id === 'details') viewRequest(menuKey, menuTrigger);
});
commands.addEventListener('metro-command', event => {
  if (event.detail.id === 'details') viewRequest(selected, rowViews.get(selected)?.choice);
});
refresh.addEventListener('metro-refresh', event => void load(event.detail.source));
window.addEventListener('online', () => refresh.requestRefresh());
window.addEventListener('popstate', () => {
  filter = readFilter();
  filterState.value = filter;
  void restoreView(render(records, 'filter'));
});
updateCommands();
await refresh.updateComplete;
refresh.requestRefresh();
