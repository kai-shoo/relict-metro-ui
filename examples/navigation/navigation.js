import { MetroBackScope } from '../../dist/metro-ui.js';

const sections = document.querySelector('#sections');
const frame = document.querySelector('#routes');
const trail = document.querySelector('#trail');
const openTask = document.querySelector('#open-task');
const back = new MetroBackScope({
  mode: () => sections.closeMenu() ? 'handled' : 'pass',
  navigation: () => frame.back() ? 'handled' : 'pass',
});

sections.items = [
  { id: 'projects', label: 'Проекты', href: '?section=projects' },
  { id: 'people', label: 'Команда', href: '?section=people' },
];
trail.items = [
  sections.items[0],
  { id: 'north', label: 'Северный маршрут' },
];

function synchronize(event) {
  sections.value = frame.value === 'people' ? 'people' : 'projects';
  sections.canGoBack = frame.canGoBack;
  const url = frame.value === 'task' ? openTask.href : sections.items.find(item => item.id === sections.value).href;
  history.replaceState(history.state, '', url);

  const visit = event?.detail;
  if (visit?.direction === 'back' && visit.to.value === 'projects' && visit.to.state) {
    window.scrollTo({ top: visit.to.state.scrollTop, behavior: 'instant' });
    openTask.focus({ preventScroll: true });
    openTask.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
}

function openSection(id) {
  if (frame.value === 'task') frame.back();
  if (frame.value !== id) frame.navigate(id, { replace: true });
}

sections.addEventListener('metro-navigation', event => {
  event.preventDefault();
  openSection(event.detail.id);
});
sections.addEventListener('metro-navigation-back', () => { void back.requestBack(); });
trail.addEventListener('metro-breadcrumb', event => {
  event.preventDefault();
  openSection(event.detail.id);
});
openTask.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openTask.focus({ preventScroll: true });
  frame.saveState({ scrollTop: window.scrollY });
  frame.navigate('task', { params: { id: 'north' } });
});
frame.addEventListener('metro-navigate', synchronize);

const launch = new URLSearchParams(location.search);
if (launch.get('project') === 'north') frame.navigate('task', { params: { id: 'north' } });
else if (launch.get('section') === 'people') frame.navigate('people', { replace: true });
synchronize();
