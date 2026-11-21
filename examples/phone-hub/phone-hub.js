import { MetroBackScope } from '../../dist/metro-ui.js';

const frame = document.querySelector('#frame');
const hub = document.querySelector('#hub');
const bar = document.querySelector('#commands');
const backButton = document.querySelector('#back');
const list = document.querySelector('#recent-list');
const scroll = document.querySelector('#recent-scroll');
const confirmation = document.querySelector('#confirm');
const about = document.querySelector('#about');
const status = document.querySelector('#status');
const records = new Map([
  ['birch', ['Берёзовый склон', 'Подъём от старой остановки по тропе вдоль берёз.']],
  ['stream', ['Лесной ручей', 'Мост через мелкий ручей у развилки.']],
  ['pines', ['Сосновая дюна', 'Песчаная тропа между соснами.']],
  ['gully', ['Каменный овраг', 'Спуск по широкой стороне оврага.']],
  ['meadow', ['Нижний луг', 'Вход на луг у столба с белой отметкой.']],
  ['bank', ['Лесная набережная', 'Пешеходная тропа по восточному берегу.']],
  ['garden', ['Северный сад', 'Круговой маршрут вокруг сада.']],
  ['mill', ['Старая мельница', 'Последний километр проходит вдоль канала.']],
  ['ridge', ['Край хребта', 'Верхняя площадка с видом на долину.']],
]);
let recent = [...records.keys()];
let contextRevision = 0;
let focusOnCommit = false;
let pendingClear;

const launch = new URL(location.href).searchParams;
if (launch.get('sections') === '2') document.querySelector('#favorites').hidden = true;

const back = new MetroBackScope({
  mode: () => bar.closeMenu() ? 'handled' : 'pass',
  navigation: () => frame.back() ? 'handled' : 'pass',
});

bar.returnFocus = hub;
confirmation.returnFocus = hub;
about.returnFocus = hub;

function recordURL(id) {
  const url = new URL(location.href);
  if (id) url.searchParams.set('record', id);
  else url.searchParams.delete('record');
  return url;
}

function renderRecent() {
  list.replaceChildren(...recent.map(id => {
    const row = document.createElement('li');
    const link = document.createElement('a');
    const description = document.createElement('small');
    const [title, summary] = records.get(id);
    link.href = recordURL(id);
    link.dataset.record = id;
    link.dataset.metroFocus = id;
    link.textContent = title;
    description.textContent = summary;
    link.append(description);
    row.append(link);
    return row;
  }));
  document.querySelector('#recent-empty').hidden = recent.length > 0;
}

function updateBack() {
  backButton.disabled = !frame.canGoBack && !bar.open && !confirmation.open && !about.open;
}

function renderCommands() {
  const inRecent = bar.context === 'recent';
  bar.mode = inRecent ? 'compact' : 'minimal';
  const global = { id: 'about', label: 'О каталоге', placement: 'secondary' };
  const clear = { id: 'clear', label: 'Очистить недавние', iconName: 'delete', disabled: !recent.length };
  bar.commands = inRecent ? [clear, global] : [global];
}

function restoreContextFocus() {
  if (!focusOnCommit || frame.value !== 'hub' || bar.context !== hub.value) return;
  focusOnCommit = false;
  hub.focusSection();
}

function updateContext(first) {
  if (frame.value !== 'hub' || !first || first === bar.context) return;
  if (bar.closeMenu()) focusOnCommit = true;
  contextRevision++;
  bar.context = first;
  renderCommands();
  restoreContextFocus();
}

function show(dialog) {
  if (dialog.open) return;
  dialog.show(bar);
  const leave = back.enterLayer(() => dialog.close(), () => dialog.open);
  dialog.addEventListener('metro-close', () => { leave(); updateBack(); }, { once: true });
  updateBack();
}

function openRecord(id, trigger) {
  if (!records.has(id)) return;
  trigger?.focus({ preventScroll: true });
  frame.saveState({ section: hub.value, recentTop: scroll.scrollTop });
  frame.navigate('record', { params: { id } });
}

hub.addEventListener('metro-sections-in-view-change', event => {
  if (event.target === hub) updateContext(event.detail.first);
});
hub.addEventListener('metro-change', event => {
  if (event.target === hub) restoreContextFocus();
});

bar.addEventListener('metro-command', async ({ detail }) => {
  if (detail.id === 'about') {
    show(about);
    return;
  }
  if (detail.id !== 'clear' || bar.context !== 'recent' || !recent.length) return;
  const request = { section: bar.context, revision: contextRevision };
  // The more button may have restored focus while the toolbar was still expanded.
  await bar.updateComplete;
  if (request.revision !== contextRevision || frame.value !== 'hub') return;
  pendingClear = request;
  show(confirmation);
});

confirmation.addEventListener('metro-close', ({ detail }) => {
  const request = pendingClear;
  pendingClear = undefined;
  if (detail.value !== 'clear' || !request) return;
  if (frame.value !== 'hub' || bar.context !== request.section || contextRevision !== request.revision) {
    status.textContent = 'Секция изменилась. Список недавних сохранён.';
    return;
  }
  recent = [];
  renderRecent();
  renderCommands();
  hub.focusSection('recent');
  status.textContent = 'Список недавних очищен.';
});

list.addEventListener('click', event => {
  const link = event.target.closest('[data-record]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  openRecord(link.dataset.record, link);
});

frame.addEventListener('metro-navigate', ({ detail: { to } }) => {
  status.textContent = '';
  bar.hidden = to.value !== 'hub';
  if (to.value === 'record') {
    bar.closeMenu();
    const [title, summary] = records.get(to.params.id);
    document.querySelector('#record').label = title;
    document.querySelector('#description').textContent = summary;
  } else {
    hub.value = to.state?.section ?? 'overview';
    void hub.updateComplete.then(() => {
      if (frame.visit !== to) return;
      updateContext(hub.firstVisible || hub.value);
      scroll.scrollTop = to.state?.recentTop ?? 0;
    });
  }
  history.replaceState(history.state, '', recordURL(to.params?.id));
  updateBack();
});

backButton.addEventListener('click', () => { void back.requestBack(); });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || backButton.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  void back.requestBack();
}, { capture: true });
new MutationObserver(updateBack).observe(bar, { attributes: true, attributeFilter: ['open'] });

renderRecent();
await frame.updateComplete;
await hub.updateComplete;
updateContext(hub.firstVisible || hub.value);
const initialRecord = launch.get('record');
if (recent.includes(initialRecord)) {
  hub.value = 'recent';
  await hub.updateComplete;
  openRecord(initialRecord);
}
