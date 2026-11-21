import { MetroBackScope } from '../../dist/metro-ui.js';

const storageKey = 'metro-annotations:v1:northern-route';
const viewport = document.querySelector('#document');
const edit = document.querySelector('#edit');
const backButton = document.querySelector('#back');
const tools = document.querySelector('#tools');
const undoButton = document.querySelector('#undo');
const caption = document.querySelector('#caption');
const color = document.querySelector('#color');
const width = document.querySelector('#width');
const touch = document.querySelector('#touch');
const notes = document.querySelector('#notes');
const status = document.querySelector('#status');
const links = [...document.querySelectorAll('#sheets a')];
const toolButtons = [...tools.querySelectorAll('[data-tool]')];
const pages = new Map([...viewport.querySelectorAll('[data-page]')].map(node => [node.id, {
  id: node.id,
  title: node.querySelector('h2'),
  paper: node.querySelector('.sheet'),
  ink: node.querySelector('metro-ink-canvas'),
  pin: node.querySelector('.pin'),
  operations: [],
}]));
const visits = [];
const sizes = { pen: 4, eraser: 16 };
let editing = false;
let tool = 'pen';
let nextId = 1;
let selected;
let reading = { page: pages.keys().next().value, offset: 0 };

function readDocument() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved?.version === 1 ? saved : undefined;
  } catch {
    return undefined;
  }
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      version: 1, nextId, page: reading.page, selected,
      pages: Object.fromEntries([...pages].map(([id, page]) => [id, page.operations])),
    }));
  } catch {
    status.textContent = 'Пометки доступны в этом окне. Хранилище браузера недоступно.';
  }
}

function restoreDocument(saved) {
  if (!saved) return;
  const used = new Set();
  for (const page of pages.values()) {
    const entries = saved.pages?.[page.id];
    if (!Array.isArray(entries)) continue;
    const candidates = entries.filter(entry => entry && Number.isSafeInteger(entry.id) && entry.id > 0
      && (typeof entry.caption === 'string' || entry.caption === undefined));
    const strokes = candidates.map(entry => entry.stroke);
    if (!page.ink.restore(JSON.stringify({ version: 1, strokes }))) continue;
    const copy = page.ink.strokes;
    page.operations = candidates.map((entry, index) => {
      const id = used.has(entry.id) ? nextId : entry.id;
      used.add(id);
      nextId = Math.max(nextId, id + 1);
      return { id, caption: entry.caption, stroke: copy[index] };
    });
  }
  if (Number.isSafeInteger(saved.nextId)) nextId = Math.max(nextId, saved.nextId);
  if (pages.has(saved.page)) reading.page = saved.page;
  if (findAnnotation(saved.selected)) selected = saved.selected;
}

function annotations() {
  return [...pages.values()].flatMap(page => page.operations
    .filter(entry => entry.caption).map(entry => ({ ...entry, page })));
}

function findAnnotation(id) {
  return id === undefined ? undefined : annotations().find(entry => entry.id === id);
}

function renderNotes() {
  const rows = annotations().sort((a, b) => a.id - b.id).map(({ id, caption: title, page }) => {
    const row = document.createElement('li');
    const button = document.createElement('button');
    const label = document.createElement('span');
    const context = document.createElement('small');
    button.type = 'button';
    button.dataset.annotation = id;
    if (id === selected) button.setAttribute('aria-current', 'location');
    label.textContent = title;
    context.textContent = page.title.textContent;
    button.append(label, context);
    button.addEventListener('click', () => navigateTo(page, id));
    row.append(button);
    return row;
  });
  const previous = document.activeElement?.dataset.annotation;
  notes.replaceChildren(...rows);
  document.querySelector('#empty').hidden = rows.length > 0;
  if (previous && document.activeElement === document.body) {
    const buttons = [...notes.querySelectorAll('button')];
    (buttons.find(item => item.dataset.annotation === previous) ?? buttons.at(-1) ?? edit).focus({ preventScroll: true });
  }
}

function updateSelection() {
  const entry = findAnnotation(selected);
  for (const page of pages.values()) page.pin.hidden = entry?.page !== page;
  for (const button of notes.querySelectorAll('button')) {
    if (Number(button.dataset.annotation) === selected) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  }
  if (!entry) return;
  const point = entry.stroke.points[Math.floor(entry.stroke.points.length / 2)];
  entry.page.pin.style.setProperty('--mark-x', `${point.x * 100}%`);
  entry.page.pin.style.setProperty('--mark-y', `${point.y * 100}%`);
  entry.page.pin.setAttribute('aria-label', `${entry.caption} · ${entry.page.title.textContent}`);
}

function align(node, inset) {
  const top = node.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  viewport.scrollTop += top - inset;
}

function markPage() {
  for (const link of links) {
    if (link.hash === `#${reading.page}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function restoreView() {
  const page = pages.get(reading.page);
  const annotation = findAnnotation(selected);
  if (annotation?.page === page) align(page.pin, viewport.clientHeight * .47);
  else if (reading.offset > 0) align(page.paper, -page.paper.getBoundingClientRect().height * reading.offset);
  else align(page.title, 12);
  markPage();
}

function focusTarget(target) {
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  target.focus({ preventScroll: true });
}

function navigateTo(page, annotation) {
  if (reading.page !== page.id || selected !== annotation) visits.push({ reading: { ...reading }, selected });
  reading = { page: page.id, offset: 0 };
  selected = annotation;
  updateSelection();
  restoreView();
  focusTarget(annotation === undefined ? page.title : page.pin);
  persist();
  syncMode();
}

function rememberScroll() {
  const edge = viewport.getBoundingClientRect().top;
  const line = edge + viewport.clientHeight * .55;
  const page = [...pages.values()].find(item => item.paper.getBoundingClientRect().bottom > line);
  if (!page) return;
  const box = page.paper.getBoundingClientRect();
  const changed = reading.page !== page.id;
  reading = { page: page.id, offset: box.height ? Math.max(0, Math.min(1, (edge - box.top) / box.height)) : 0 };
  if (changed) {
    markPage();
    persist();
  }
}

function latest() {
  return [...pages.values()].reduce((last, page) => {
    const operation = page.operations.at(-1);
    return operation && (!last || last.operation.id < operation.id) ? { page, operation } : last;
  }, undefined);
}

function undo() {
  if (editing) latest()?.page.ink.undo();
}

function syncTools() {
  for (const button of toolButtons) button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
  for (const { ink } of pages.values()) {
    ink.tool = tool;
    ink.color = color.value;
    ink.strokeWidth = sizes.pen;
    ink.eraserWidth = sizes.eraser;
    ink.drawTouch = touch.checked;
  }
}

function syncMode() {
  edit.setAttribute('aria-pressed', String(editing));
  tools.hidden = !editing;
  backButton.hidden = !editing && visits.length === 0;
  undoButton.disabled = !latest();
  for (const { ink } of pages.values()) ink.disabled = !editing;
}

function setEditing(value) {
  editing = value;
  syncMode();
  if (!editing) focusTarget(edit);
}

const back = new MetroBackScope({
  mode() {
    if (!editing) return 'pass';
    setEditing(false);
    return 'handled';
  },
  navigation() {
    const previous = visits.pop();
    if (!previous) return 'pass';
    ({ reading, selected } = previous);
    updateSelection();
    restoreView();
    const page = pages.get(reading.page);
    focusTarget(findAnnotation(selected)?.page === page ? page.pin : page.title);
    persist();
    syncMode();
    return 'handled';
  },
});

for (const page of pages.values()) {
  page.ink.addEventListener('metro-ink-change', ({ detail }) => {
    if (detail.reason === 'draw' || detail.reason === 'erase') {
      const id = nextId++;
      const label = detail.reason === 'draw' ? caption.value.trim() || `Пометка ${id}` : undefined;
      page.operations.push({ id, caption: label, stroke: detail.strokes.at(-1) });
      if (label) caption.value = '';
      status.textContent = label ? `Сохранено · ${label}` : 'Штрих ластика сохранён.';
    } else if (detail.reason === 'undo') {
      if (selected === page.operations.at(-1)?.id) selected = undefined;
      page.operations.pop();
      status.textContent = 'Последний штрих отменён.';
    } else if (detail.reason === 'clear') {
      if (findAnnotation(selected)?.page === page) selected = undefined;
      page.operations = [];
    }
    persist();
    renderNotes();
    updateSelection();
    syncMode();
  });
}

edit.addEventListener('click', () => setEditing(!editing));
backButton.addEventListener('click', () => { void back.requestBack(); });
undoButton.addEventListener('click', undo);
for (const button of toolButtons) button.addEventListener('click', () => {
  tool = button.dataset.tool;
  width.value = String(sizes[tool]);
  syncTools();
});
width.addEventListener('input', () => { sizes[tool] = width.valueAsNumber; syncTools(); });
for (const input of [color, touch]) input.addEventListener('input', syncTools);
for (const link of links) link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateTo(pages.get(link.hash.slice(1)));
});
document.addEventListener('keydown', event => {
  if (event.defaultPrevented) return;
  if (event.key === 'Escape' && (editing || visits.length)) {
    event.preventDefault();
    void back.requestBack();
  }
  if (editing && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
    && event.key.toLowerCase() === 'z' && !event.target.closest('input, textarea, [contenteditable]')) {
    event.preventDefault();
    undo();
  }
});

await Promise.all([...pages.values()].map(page => page.ink.updateComplete));
restoreDocument(readDocument());
const linked = location.hash.slice(1);
if (pages.has(linked) && linked !== reading.page) {
  reading.page = linked;
  selected = undefined;
}
syncTools();
syncMode();
renderNotes();
updateSelection();
restoreView();
viewport.addEventListener('scroll', rememberScroll, { passive: true });
const size = new ResizeObserver(restoreView);
size.observe(viewport);
for (const { paper } of pages.values()) size.observe(paper);
