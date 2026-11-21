import { MetroActivationScope, MetroBackScope } from '../../dist/metro-ui.js';
import { demoAuth } from './auth.js';
import { recordings, sampleAudio } from './recordings.js';

const frame = document.querySelector('#frame');
const backButton = document.querySelector('#back');
const search = document.querySelector('#search');
const authForm = document.querySelector('#signin-form');
const authStatus = document.querySelector('#signin-status');
const authTarget = document.querySelector('#signin-destination');
const authSubmit = document.querySelector('#submit-code');
const access = document.querySelector('#manage-access');
const player = document.querySelector('#player');
const menu = document.querySelector('#record-menu');
const menuTrigger = document.querySelector('#open-record-menu');
const message = document.querySelector('#status');
const playerStatus = document.querySelector('#player-status');
const template = document.querySelector('#track-row');
const feeds = new Map([...document.querySelectorAll('[data-feed]')].map(feed => [feed.dataset.feed, feed]));
const catalogue = [...recordings.keys()];
const favorites = new Set();
const audioSources = new Map();
const auth = demoAuth;
let recent = ['coast', 'bridge', 'reed', 'orchard', 'island', 'estuary', 'dock', 'dunes', 'lake'];
let signedIn = false;
let pending;
let authentication;
let loaded;
let releaseMenu;
let backStartedWithMenu = false;
let restoreRevision = 0;

player.labels = {
  play: 'Воспроизвести', pause: 'Пауза', mute: 'Выключить звук', unmute: 'Включить звук',
  position: 'Позиция воспроизведения', buffering: 'Загрузка записи', error: 'Запись недоступна',
};

function destinationURL({ view, track } = {}) {
  const url = new URL(location.href);
  for (const key of ['view', 'track', 'entry']) url.searchParams.delete(key);
  if (view && view !== 'home') url.searchParams.set('view', view);
  if (track) url.searchParams.set('track', track);
  return url;
}

function browserEntry(href) {
  const url = new URL(href, location.href);
  const kind = url.searchParams.get('entry') === 'tile' ? 'tile' : 'link';
  return url.searchParams.has('view') || url.searchParams.has('track')
    ? { kind, destination: { href: url.href } } : { kind: 'launch' };
}

function trackIds(feed) {
  return [...feed.querySelectorAll('[data-track]')].map(link => link.dataset.track);
}

function saveSource() {
  const feed = feeds.get(frame.value);
  if (feed) frame.saveState({ ids: trackIds(feed), top: feed.scrollTop, filter: search.value });
}

function visibleTracks(view) {
  if (view === 'recent') return recent;
  if (view !== 'search') return catalogue;
  const query = search.value.trim().toLocaleLowerCase('ru');
  if (!query) return catalogue;
  return catalogue.filter(id => {
    const { title, artist } = recordings.get(id);
    return ` ${title} ${artist}`.toLocaleLowerCase('ru').includes(` ${query}`);
  });
}

function buildFeed(view, keys = visibleTracks(view)) {
  const feed = feeds.get(view);
  const entries = keys.filter(id => recordings.has(id));
  const rows = entries.map(id => {
    const track = recordings.get(id);
    const row = template.content.cloneNode(true);
    const link = row.querySelector('a');
    link.href = destinationURL({ track: id });
    link.dataset.track = id;
    link.dataset.metroFocus = id;
    link.style.setProperty('--art-hue', track.hue);
    row.querySelector('.track-name').textContent = track.title;
    row.querySelector('.track-artist').textContent = track.artist;
    return row;
  });
  feed.querySelector('ul').replaceChildren(...rows);
  if (view === 'search') document.querySelector('#no-results').hidden = rows.length > 0;
}

function restoreSource(visit) {
  const revision = ++restoreRevision;
  const state = visit.state;
  const feed = feeds.get(visit.value);
  if (visit.value === 'search' && state) search.value = state.filter;
  buildFeed(visit.value, state?.ids);
  requestAnimationFrame(() => {
    if (revision === restoreRevision && frame.visit === visit) feed.scrollTop = state?.top ?? 0;
  });
}

const activation = new MetroActivationScope({
  resolve(entry) {
    if (entry.kind === 'launch') return { route: 'home', identity: 'home' };
    if (!('destination' in entry)) return null;
    const url = new URL(entry.destination.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return null;
    const id = entry.destination.parameters?.track ?? url.searchParams.get('track');
    if (id !== null && id !== undefined) {
      if (!recordings.has(id)) return null;
      const feed = feeds.get(frame.value);
      const keys = feed ? trackIds(feed) : catalogue;
      return { route: 'player', identity: `track:${id}`, params: { id, queue: keys.includes(id) ? keys : catalogue } };
    }
    const view = url.searchParams.get('view') ?? 'home';
    return view === 'home' || feeds.has(view) ? { route: view, identity: view } : null;
  },
  current() {
    const visit = frame.visit;
    return visit?.value === 'player' ? `track:${visit.params.id}` : visit?.value ?? null;
  },
  navigate(destination) {
    saveSource();
    if (destination.route === 'player' && recordings.get(destination.params.id).private && !signedIn) {
      return requestAccess(destination.params);
    }
    return frame.navigate(destination.route, { params: destination.params });
  },
});

async function openEntry(entry) {
  const result = await activation.activate(entry);
  if (result === 'superseded') return;
  message.textContent = result === 'unavailable' ? 'Запись или раздел недоступны.' : '';
}

function requestAccess(destination) {
  pending = destination;
  authForm.reset();
  authStatus.textContent = '';
  authTarget.textContent = destination ? `После входа откроется «${recordings.get(destination.id).title}».` : '';
  return frame.value === 'signin' || frame.navigate('signin');
}

function accessBusy(busy) {
  authSubmit.disabled = busy;
  authForm.setAttribute('aria-busy', String(busy));
}

function abandonAccess() {
  activation.cancel();
  authentication?.abort();
  authentication = undefined;
  pending = undefined;
  authForm.reset();
  accessBusy(false);
}

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (authentication || frame.value !== 'signin') return;
  const code = String(new FormData(authForm).get('code') ?? '');
  const request = new AbortController();
  authentication = request;
  accessBusy(true);
  authStatus.textContent = 'Проверяем код…';
  try {
    const accepted = await auth.authenticate({ code }, { signal: request.signal });
    if (authentication !== request || request.signal.aborted || frame.value !== 'signin') return;
    if (!accepted) {
      authStatus.textContent = 'Код не подошёл. Попробуйте ещё раз.';
      document.querySelector('#code').focus();
      return;
    }

    const destination = pending;
    pending = undefined;
    signedIn = true;
    access.hidden = true;
    if (destination && recordings.has(destination.id)) frame.navigate('player', { params: destination, replace: true });
    else frame.back();
  } catch {
    if (authentication === request && !request.signal.aborted) authStatus.textContent = 'Вход недоступен. Повторите попытку.';
  } finally {
    if (authentication === request) {
      authentication = undefined;
      accessBusy(false);
    }
  }
});

const back = new MetroBackScope({
  mode() {
    if (frame.value !== 'signin') return 'pass';
    abandonAccess();
    return frame.back() ? 'handled' : 'blocked';
  },
  navigation() {
    activation.cancel();
    return frame.back() ? 'handled' : 'pass';
  },
});

function showPlayer(visit) {
  const { id } = visit.params;
  const track = recordings.get(id);
  frame.page.label = track.title;
  document.querySelector('#record-credit').textContent = track.artist;
  frame.page.style.setProperty('--art-hue', track.hue);
  player.label = track.title;
  menu.label = `Команды · ${track.title}`;
  playerStatus.textContent = '';
  recent = [id, ...recent.filter(key => key !== id)];
  if (loaded === id) return;
  loaded = id;
  if (!audioSources.has(id)) audioSources.set(id, URL.createObjectURL(sampleAudio(track.pitch)));
  player.src = audioSources.get(id);
}

menuTrigger.addEventListener('click', () => {
  if (menu.open) {
    menu.close();
    return;
  }
  const { id, queue } = frame.visit.params;
  const index = queue.indexOf(id);
  menu.commands = [
    { id: 'favorite', label: favorites.has(id) ? 'Убрать из избранного' : 'В избранное' },
    { id: 'next', label: 'Следующая запись', disabled: index < 0 || index >= queue.length - 1 },
  ];
  menu.show(menuTrigger);
  menuTrigger.setAttribute('aria-expanded', 'true');
  releaseMenu = back.enterLayer(() => menu.close(), () => menu.open);
});

menu.addEventListener('metro-close', () => {
  menuTrigger.setAttribute('aria-expanded', 'false');
  releaseMenu?.();
  releaseMenu = undefined;
});

menu.addEventListener('metro-command', ({ detail }) => {
  const { id, queue } = frame.visit.params;
  const { title } = recordings.get(id);
  if (detail.id === 'favorite') {
    if (favorites.delete(id)) playerStatus.textContent = `Удалено из избранного · ${title}`;
    else {
      favorites.add(id);
      playerStatus.textContent = `Добавлено в избранное · ${title}`;
    }
  } else if (detail.id === 'next') {
    const next = queue[queue.indexOf(id) + 1];
    if (!next) return;
    const params = { id: next, queue };
    if (recordings.get(next).private && !signedIn) requestAccess(params);
    else frame.navigate('player', { params, replace: true });
  }
});

frame.addEventListener('metro-navigate', ({ detail: { to } }) => {
  backButton.hidden = to.value === 'home';
  if (to.value === 'signin') return;
  menu.close();
  if (to.value === 'player') showPlayer(to);
  else if (feeds.has(to.value)) restoreSource(to);
  const url = to.value === 'player' ? destinationURL({ track: to.params.id }) : destinationURL({ view: to.value });
  history.replaceState(history.state, '', url);
});

function followLink(event, link) {
  if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  link.focus({ preventScroll: true });
  void openEntry(browserEntry(link.href));
}

frame.addEventListener('click', event => followLink(event, event.target.closest('a[data-track], a[data-view]')));
document.querySelector('#overview').addEventListener('metro-section-open', event => {
  event.preventDefault();
  event.detail.invoker.focus({ preventScroll: true });
  void openEntry(browserEntry(event.detail.invoker.href));
});
search.addEventListener('input', () => {
  buildFeed('search');
  feeds.get('search').scrollTop = 0;
});
access.addEventListener('click', () => requestAccess());
backButton.addEventListener('pointerdown', event => {
  backStartedWithMenu = event.button === 0 && menu.open;
});
backButton.addEventListener('click', event => {
  // A browser may light-dismiss the popover between pointerdown and click.
  const dismissedByPointer = event.detail > 0 && backStartedWithMenu && !menu.open;
  backStartedWithMenu = false;
  if (dismissedByPointer) menuTrigger.focus({ preventScroll: true });
  else void back.requestBack();
});
document.querySelector('#cancel-signin').addEventListener('click', () => { void back.requestBack(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (menu.open || frame.value === 'signin' || frame.value === 'player')) {
    event.preventDefault();
    event.stopPropagation();
    void back.requestBack();
  }
}, { capture: true });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  abandonAccess();
  for (const source of audioSources.values()) URL.revokeObjectURL(source);
});

await frame.updateComplete;
void openEntry(browserEntry(location.href));
