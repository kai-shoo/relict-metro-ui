import { MetroBackScope } from '../../dist/metro-ui.js';

const frame = document.querySelector('#desktop-frame');
const hub = document.querySelector('#desktop-hub');
const zoom = document.querySelector('#archive-zoom');
const archive = document.querySelector('#archive-detail');
const backButton = document.querySelector('#desktop-back');
const help = document.querySelector('#help');
const helpBody = document.querySelector('#help-body');
const helpStatus = document.querySelector('#help-status');
const topics = document.querySelector('#help-topics');
const retry = document.querySelector('#retry-help');
const sections = new Map([...hub.querySelectorAll('metro-hub-section')].map(section => [section.value, section]));
const routes = new Map([
  ['ridge', ['Край хребта', 'Подъём к обзорной площадке по тропе от северной стороны реки.']],
  ['bank', ['Лесная набережная', 'Прогулка по восточному берегу вдоль старого русла.']],
  ['garden', ['Северный сад', 'Круговой маршрут мимо каменной ограды и фруктовых деревьев.']],
  ['stream', ['Лесной ручей', 'Короткий маршрут к деревянному мосту у развилки.']],
]);
let helpState = 'idle';
let helpRequest;

const back = new MetroBackScope({
  mode: async () => frame.value === 'archive' && await zoom.showDetail() ? 'handled' : 'pass',
  navigation: () => frame.back() ? 'handled' : 'pass',
});

function sectionAvailable(key) {
  const section = sections.get(key);
  return Boolean(section && hub.contains(section) && !section.hidden && section.value === key);
}

zoom.groups = [...sections].map(([value, section]) => ({ value, label: section.label }));
archive.getAnchor = () => ({ key: hub.value, offset: 0 });
archive.restoreAnchor = ({ key }) => {
  if (!sectionAvailable(key)) return false;
  hub.value = key;
  return true;
};
archive.jumpToGroup = key => {
  if (!sectionAvailable(key)) return false;
  hub.focusSection(key);
  return true;
};

function updateBack() {
  backButton.hidden = !frame.canGoBack && zoom.view !== 'overview';
}

function routeURL(visit) {
  const url = new URL(location.href);
  url.searchParams.delete('record');
  url.searchParams.delete('view');
  if (visit.value === 'route') url.searchParams.set('record', visit.params.id);
  if (visit.value === 'collections') url.searchParams.set('view', 'collections');
  return url;
}

function openVisit(value, options, section, source) {
  source?.focus({ preventScroll: true });
  if (frame.value === 'archive') frame.saveState({ section: section || hub.value });
  frame.navigate(value, options);
}

function follow(event, link) {
  if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const id = link.dataset.route;
  if (!routes.has(id)) return;
  event.preventDefault();
  openVisit('route', { params: { id } }, link.closest('metro-hub-section')?.value, link);
}

function presentHelp(state, announcement) {
  helpState = state;
  helpBody.setAttribute('aria-busy', String(state === 'loading'));
  helpStatus.textContent = announcement;
  retry.hidden = state !== 'error';
  topics.hidden = state !== 'ready';
}

async function loadHelp() {
  if (helpState === 'loading' || !sectionAvailable('help')) return;
  const owner = help;
  const request = new AbortController();
  helpRequest = request;
  const current = () => helpRequest === request && !request.signal.aborted && sectionAvailable('help') && sections.get('help') === owner;
  presentHelp('loading', 'Загружаем справку…');
  try {
    const response = await fetch(new URL('./desktop-help.json', import.meta.url), { signal: request.signal });
    if (!response.ok) throw new Error('Help is unavailable');
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(item => typeof item?.title === 'string' && typeof item.text === 'string')) {
      throw new Error('Invalid help document');
    }
    if (!current()) return;
    topics.replaceChildren(...data.flatMap(item => {
      const title = document.createElement('dt');
      const text = document.createElement('dd');
      title.textContent = item.title;
      text.textContent = item.text;
      return [title, text];
    }));
    presentHelp('ready', 'Справка загружена.');
  } catch {
    if (current()) presentHelp('error', 'Справка недоступна. Попробуйте ещё раз.');
  } finally {
    if (helpRequest === request) {
      helpRequest = undefined;
      if (helpState === 'loading') helpState = 'idle';
    }
  }
}

function loadVisibleHelp(values) {
  if (frame.value === 'archive' && zoom.view === 'detail' && helpState === 'idle' && values.includes('help')) void loadHelp();
}

retry.addEventListener('click', () => { void loadHelp(); });
hub.addEventListener('metro-sections-in-view-change', event => {
  if (event.target === hub) loadVisibleHelp(event.detail.values);
});
hub.addEventListener('metro-change', event => {
  if (event.target === hub) zoom.value = event.detail.value;
});
zoom.addEventListener('metro-zoom-change', updateBack);
hub.addEventListener('metro-section-open', event => {
  if (event.detail.value !== 'collections') return;
  event.preventDefault();
  openVisit('collections', {}, event.detail.value, event.detail.invoker);
});
frame.addEventListener('click', event => follow(event, event.target.closest('a[data-route]')));

frame.addEventListener('metro-navigate', ({ detail: { to } }) => {
  if (to.value === 'route') {
    const [title, summary] = routes.get(to.params.id);
    document.querySelector('#route-page').label = title;
    document.querySelector('#route-text').textContent = summary;
  } else if (to.value === 'archive') {
    const section = to.state?.section;
    hub.value = sectionAvailable(section) ? section : 'featured';
    zoom.value = hub.value;
  }
  history.replaceState(history.state, '', routeURL(to));
  updateBack();
});

backButton.addEventListener('click', async () => { await back.requestBack(); updateBack(); });
window.addEventListener('pagehide', event => { if (!event.persisted) helpRequest?.abort(); });

await frame.updateComplete;
await hub.updateComplete;
loadVisibleHelp(hub.sectionsInView);
const params = new URLSearchParams(location.search);
const record = params.get('record');
if (routes.has(record)) openVisit('route', { params: { id: record } }, 'featured');
else if (params.get('view') === 'collections') openVisit('collections', {}, 'collections');
