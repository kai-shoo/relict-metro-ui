export const activationMessage = 'metro-example-notifications/activate';

export function isInboxPage(url, scope) {
  const root = new URL(scope);
  return url.origin === root.origin && !url.username && !url.password &&
    (url.pathname === root.pathname || url.pathname === new URL('index.html', root).pathname);
}

export function recordHref(id, scope) {
  const url = new URL(scope);
  url.searchParams.set('event', id);
  return url.href;
}

export function readRecordRoute(href, scope) {
  let url;
  try { url = new URL(href, scope); } catch { return null; }
  const parameters = [...url.searchParams];
  if (!isInboxPage(url, scope) || url.hash || parameters.length !== 1) return null;
  const [[name, id]] = parameters;
  return name === 'event' && /^[a-z0-9-]{1,40}$/.test(id) ? { id, href: recordHref(id, scope) } : null;
}

export function notificationTag(id) {
  return `metro-example-updates:${id}`;
}
