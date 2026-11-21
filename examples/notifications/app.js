import { MetroBrowserNotifications, publishMetroAppBadge } from '../../dist/metro-ui.js';
import { activationMessage, notificationTag, readRecordRoute, recordHref } from './activation.js';

const scope = new URL('./', location.href).href;
const workerURL = new URL('./worker.js', scope).href;
const storageKey = 'metro-example-notifications:v1';
const noticeLifetime = 10 * 60 * 1000;
const updates = document.querySelector('#updates');
const updatesTitle = document.querySelector('#updates-title');
const event = document.querySelector('#event');
const eventTitle = document.querySelector('#event-title');
const description = document.querySelector('#event-description');
const unread = document.querySelector('#unread');
const empty = document.querySelector('#empty');
const enable = document.querySelector('#enable');
const systemStatus = document.querySelector('#system-status');
const remove = document.querySelector('#remove');
const back = document.querySelector('#back');
const records = new Map([...document.querySelectorAll('[data-record]')].map(row => {
  const link = row.querySelector('a');
  return [row.dataset.record, {
    row, link, title: link.textContent, description: row.querySelector('p').textContent,
    notify: row.querySelector('[data-notify]'),
  }];
}));

const states = new Map();
let current;
let notifications;
let publishedCount;

function stateKey(id, state) {
  return `${storageKey}:${id}:${state}`;
}

function refreshStates() {
  try {
    for (const id of records.keys()) {
      const status = ['removed', 'read'].find(state => localStorage.getItem(stateKey(id, state)) === '1');
      if (status) states.set(id, status);
      else states.delete(id);
    }
  } catch { /* in-tab state survives */ }
}

function setState(id, state) {
  states.set(id, state);
  try { localStorage.setItem(stateKey(id, state), '1'); } catch { /* in-tab state survives */ }
}

function render({ moveFocus = false } = {}) {
  refreshStates();
  const previous = current;
  current = readRecordRoute(location.href, scope)?.id;
  const record = records.get(current);
  const available = record && states.get(current) !== 'removed';
  if (available && !states.has(current)) setState(current, 'read');

  let count = 0;
  for (const [id, item] of records) {
    item.row.hidden = states.get(id) === 'removed';
    if (!states.has(id)) count++;
  }
  unread.value = count;
  unread.label = `${count} unread ${count === 1 ? 'event' : 'events'}`;
  unread.hidden = count === 0;
  if (publishedCount !== count) {
    publishedCount = count;
    void publishMetroAppBadge(count).catch(() => {});
  }
  empty.hidden = [...records.values()].some(item => !item.row.hidden);

  updates.hidden = Boolean(current);
  event.hidden = !current;
  if (current) {
    eventTitle.textContent = available ? record.title : 'Event unavailable';
    description.textContent = available ? record.description : 'This event was removed or is no longer available.';
    remove.hidden = !available;
  }

  if (moveFocus) {
    const anchor = records.get(previous);
    const target = current ? eventTitle : anchor && !anchor.row.hidden ? anchor.link : updatesTitle;
    target.focus();
  }
}

function activate(route) {
  if (route.id === current) {
    render();
    return;
  }
  // A foreground update replaces the current detail and preserves its parent entry.
  if (current) history.replaceState(history.state, '', route.href);
  else history.pushState({ fromUpdates: true }, '', route.href);
  render({ moveFocus: true });
}

function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

for (const [id, record] of records) {
  record.link.addEventListener('click', event => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    const href = recordHref(id, scope);
    activate({ id, href });
    void notifications?.dismiss(notificationTag(id)).catch(() => {});
  });
  record.notify.addEventListener('click', async () => {
    if (!notifications || states.get(id) === 'removed') return;
    record.notify.disabled = true;
    systemStatus.textContent = 'Sending system notification…';
    try {
      await notifications.pruneExpired();
      const result = await notifications.publish({
        id: notificationTag(id), title: record.title, message: record.description,
        destination: { href: recordHref(id, scope) }, expiresAt: Date.now() + noticeLifetime,
      });
      systemStatus.textContent = result === 'applied' ? 'System notification sent.' : 'System notifications are unavailable.';
      if (states.get(id) === 'removed') await notifications.dismiss(notificationTag(id));
    } catch {
      systemStatus.textContent = 'The system notification could not be sent.';
    } finally {
      updateNotificationControls();
    }
  });
}

back.addEventListener('click', event => {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  if (history.state?.fromUpdates) history.back();
  else {
    history.replaceState(null, '', scope);
    render({ moveFocus: true });
  }
});

remove.addEventListener('click', () => {
  if (!current || !records.has(current)) return;
  setState(current, 'removed');
  void notifications?.dismiss(notificationTag(current)).catch(() => {});
  render({ moveFocus: true });
});

addEventListener('popstate', () => render({ moveFocus: true }));
addEventListener('storage', event => {
  if (event.key === null || event.key.startsWith(`${storageKey}:`)) render();
});

function updateNotificationControls() {
  const permission = notifications?.permission;
  enable.disabled = permission !== 'default';
  for (const { notify } of records.values()) notify.disabled = permission !== 'granted';
}

function describePermission() {
  const permission = notifications?.permission;
  systemStatus.textContent = permission === 'granted' ? 'System notifications are enabled.'
    : permission === 'default' ? 'Choose whether to allow system notifications.'
      : permission === 'denied' ? 'System notifications are blocked. You can still open events below.'
        : 'System notifications are unavailable. You can still open events below.';
  updateNotificationControls();
}

enable.addEventListener('click', async () => {
  if (!notifications || notifications.permission === 'denied') return;
  enable.disabled = true;
  try {
    await notifications.requestPermission();
    describePermission();
    await notifications.pruneExpired();
  } catch {
    systemStatus.textContent = 'The browser could not enable notifications.';
    updateNotificationControls();
  }
});

async function connectNotifications() {
  if (!isSecureContext || !('serviceWorker' in navigator) || !('Notification' in globalThis)) {
    describePermission();
    return;
  }

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.source?.scriptURL !== workerURL || event.data?.type !== activationMessage ||
        typeof event.data.href !== 'string' || !event.ports[0]) return;
    const route = readRecordRoute(event.data.href, scope);
    if (!route) return;
    activate(route);
    event.ports[0].postMessage(route.href);
    event.ports[0].close();
  });

  try {
    await navigator.serviceWorker.register(workerURL, { type: 'module', scope });
    const registration = await navigator.serviceWorker.ready;
    notifications = new MetroBrowserNotifications(registration);
    describePermission();
    await notifications.pruneExpired();
    if (current) await notifications.dismiss(notificationTag(current));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateNotificationControls();
        void notifications.pruneExpired().catch(() => {});
      }
    });
  } catch {
    describePermission();
  }
}

render();
void connectNotifications();
