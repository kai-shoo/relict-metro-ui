import { readMetroNotificationActivation } from '../../dist/shell-host.js';
import { activationMessage, notificationTag, isInboxPage, readRecordRoute } from './activation.js';

const scope = self.registration.scope;
const inFlight = new Map();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', event => {
  const { notification } = event;
  const activation = readMetroNotificationActivation(notification, scope);
  const route = activation && readRecordRoute(activation.destination.href, scope);
  notification.close();
  if (!route || activation.id !== notificationTag(route.id)) return;

  let task = inFlight.get(route.id);
  if (!task) {
    task = activate(route.href).finally(() => inFlight.delete(route.id));
    inFlight.set(route.id, task);
  }
  event.waitUntil(task);
});

async function activate(href) {
  const windows = (await self.clients.matchAll({ type: 'window' })).filter(client =>
    client.frameType !== 'nested' && isInboxPage(new URL(client.url), scope));

  for (const client of windows) {
    if (await deliver(client, href)) {
      await focus(client);
      return;
    }
  }

  // A document still loading can handle the same URL when it starts.
  for (const client of windows) {
    const navigated = await client.navigate(href).catch(() => null);
    if (navigated) {
      await focus(navigated);
      return;
    }
  }
  await focus(await self.clients.openWindow(href));
}

async function focus(client) {
  await client?.focus().catch(() => {});
}

function deliver(client, href) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => finish(false), 500);
    const finish = accepted => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(accepted);
    };
    channel.port1.onmessage = event => finish(event.data === href);
    try {
      client.postMessage({ type: activationMessage, href }, [channel.port2]);
    } catch {
      finish(false);
      channel.port2.close();
    }
  });
}
