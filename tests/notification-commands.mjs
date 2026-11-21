const delivery = 'metro-example-updates:delivery';
const survey = 'metro-example-updates:survey';

export const notificationCommands = {
  async compactUnreadBadge({ context, page }) {
    return withNotifications(context, page, async (_browserContext, demo, url) => {
      await demo.setViewportSize({ width: 305, height: 460 });
      await demo.goto(url.href);
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const badge = demo.getByRole('img', { name: '2 unread events' });
      await badge.waitFor();
      const { titleOneLine, badgeBesideTitle } = await demo.locator('#updates-title').evaluate(heading => {
        const text = heading.firstChild;
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, text.textContent.trimEnd().length);
        const label = range.getBoundingClientRect();
        const count = heading.querySelector('metro-info-badge').getBoundingClientRect();
        return {
          titleOneLine: range.getClientRects().length === 1,
          badgeBesideTitle: count.left > label.right && count.top < label.bottom && count.bottom > label.top &&
            count.right <= heading.getBoundingClientRect().right + 1,
        };
      });
      const delivery = demo.getByRole('link', { name: 'Equipment delivery' });
      await delivery.click();
      await demo.getByRole('link', { name: 'Back to updates' }).click();
      const one = demo.getByRole('img', { name: '1 unread event' });
      await one.waitFor();
      const decreased = (await one.textContent()).trim() === '1';
      const focusReturned = await delivery.evaluate(link => link === document.activeElement);
      await demo.getByRole('link', { name: 'Survey briefing' }).click();
      await demo.getByRole('link', { name: 'Back to updates' }).click();
      const hiddenAtZero = !await demo.locator('#unread').isVisible();
      return { titleOneLine, badgeBesideTitle, decreased, focusReturned, hiddenAtZero };
    });
  },

  async warmSystemNotification({ context, page }) {
    return withNotifications(context, page, async (browserContext, demo, url) => {
      await demo.addInitScript(() => {
        const request = Notification.requestPermission.bind(Notification);
        window.permissionRequests = 0;
        Notification.requestPermission = (...args) => {
          window.permissionRequests++;
          return request(...args);
        };
        window.badges = [];
        Object.defineProperties(navigator, {
          setAppBadge: { value: async count => { window.badges.push(count); } },
          clearAppBadge: { value: async () => { window.badges.push(0); } },
        });
      });
      await demo.goto(url.href);
      await demo.getByText('Choose whether to allow system notifications.').waitFor();
      const publish = demo.getByRole('button', { name: 'Notify about equipment delivery' });
      const gated = await publish.isDisabled() && await demo.evaluate(() =>
        Notification.permission === 'default' && window.permissionRequests === 0);
      await demo.getByRole('button', { name: 'Enable system notifications' }).click();
      await demo.waitForFunction(() => window.permissionRequests === 1);
      // Set the browser permission and reload because Playwright cannot accept the OS prompt.
      await browserContext.grantPermissions(['notifications'], { origin: url.origin });
      await demo.reload();
      await publish.click();
      await demo.getByText('System notification sent.').waitFor();

      const worker = await notificationWorker(browserContext, url);
      const native = await readNotice(worker, delivery);
      const before = await demo.evaluate(() => history.length);
      const pageCount = browserContext.pages().length;
      const dispatched = await dispatchNativeEvent(worker, delivery, 2);
      const heading = demo.getByRole('heading', { name: 'Equipment delivery' });
      await heading.waitFor();
      const focused = await heading.evaluate(node => node === document.activeElement);
      const oneEntry = await demo.evaluate(() => history.length) === before + 1;
      const windowReused = browserContext.pages().length === pageCount;

      // Deliver the same ID again after the first activation has already completed.
      await worker.evaluate(notice => registration.showNotification(notice.title, notice.options), native);
      const repeated = await dispatchNativeEvent(worker, delivery);
      const stillOneEntry = await demo.evaluate(() => history.length) === before + 1;
      await demo.getByRole('link', { name: 'Back to updates' }).click();
      const anchor = demo.getByRole('link', { name: 'Equipment delivery' });
      await anchor.waitFor();
      const anchorFocused = await anchor.evaluate(node => node === document.activeElement);
      const unread = await demo.getByRole('img', { name: '1 unread event' }).isVisible();
      await demo.getByRole('link', { name: 'Survey briefing' }).click();
      const badges = await demo.evaluate(() => window.badges);
      return { gated, native, dispatched, repeated, oneEntry, stillOneEntry, windowReused, focused, anchorFocused, unread, badges };
    });
  },

  async coldSystemNotification({ context, page }) {
    return withNotifications(context, page, async (browserContext, demo, url) => {
      await browserContext.grantPermissions(['notifications'], { origin: url.origin });
      await demo.goto(url.href);
      await demo.getByRole('button', { name: 'Notify about survey briefing' }).click();
      await demo.getByText('System notification sent.').waitFor();
      const worker = await notificationWorker(browserContext, url);
      await demo.close();
      const dispatched = await dispatchNativeEvent(worker, survey);
      const [href] = dispatched.windowURLs;
      const newDocument = browserContext.pages().find(page => page.url() === href);
      const opened = newDocument ?? await browserContext.newPage();
      if (!newDocument) await opened.goto(href);

      await opened.getByRole('heading', { name: 'Survey briefing' }).waitFor();
      const details = opened.getByRole('region', { name: 'Survey briefing' });
      const description = await details.getByText('The briefing starts at 09:30 in meeting room 2.').isVisible();
      await opened.getByRole('link', { name: 'Back to updates' }).click();
      await opened.getByRole('img', { name: '1 unread event' }).waitFor();
      const parent = opened.url();

      // The object may disappear after a notification payload has already been delivered.
      await opened.getByRole('link', { name: 'Survey briefing' }).click();
      await opened.getByRole('button', { name: 'Remove event' }).click();
      await opened.getByRole('heading', { name: 'Event unavailable' }).waitFor();
      await opened.close();

      const restored = await browserContext.newPage();
      await restored.goto(href);
      const message = await restored.getByText('This event was removed or is no longer available.').isVisible();
      await restored.getByRole('link', { name: 'Back to updates' }).click();
      await restored.getByRole('link', { name: 'Equipment delivery' }).waitFor();
      const removed = await restored.getByRole('link', { name: 'Survey briefing' }).isHidden();
      return { dispatched, parent, description, message, removed };
    });
  },

  async staleSystemNotification({ context, page }) {
    return withNotifications(context, page, async (browserContext, demo, url) => {
      await browserContext.grantPermissions(['notifications'], { origin: url.origin });
      await demo.goto(url.href);
      await demo.getByRole('button', { name: 'Notify about equipment delivery' }).click();
      await demo.getByText('System notification sent.').waitFor();
      const worker = await notificationWorker(browserContext, url);
      const native = await readNotice(worker, delivery);
      const replace = (tag, fields) => worker.evaluate(({ native, tag, fields }) => registration.showNotification(native.title, {
        tag, data: { ...native.options.data, ...fields },
      }), { native, tag, fields });

      await replace(delivery, { expiresAt: 1 });
      const expired = await dispatchNativeEvent(worker, delivery);
      await replace(delivery, { href: 'https://example.invalid/?event=delivery' });
      const exterior = await dispatchNativeEvent(worker, delivery);
      await replace(delivery, { href: new URL('styles.css?event=delivery', url).href });
      const nonRoute = await dispatchNativeEvent(worker, delivery);
      await replace(survey, { expiresAt: 1 });
      const beforePrune = await readNotice(worker, survey);
      await demo.reload();
      await demo.getByText('System notifications are enabled.').waitFor();
      await demo.waitForFunction(async tag => {
        const sw = await navigator.serviceWorker.ready;
        return (await sw.getNotifications({ tag })).length === 0;
      }, survey);
      const routePreserved = demo.url() === url.href;
      const unread = await demo.getByRole('img', { name: '2 unread events' }).isVisible();
      return { expired, exterior, nonRoute, wasPresent: Boolean(beforePrune), routePreserved, unread };
    });
  },

  async blockedSystemNotification({ context, page }) {
    return withNotifications(context, page, async (browserContext, demo, url) => {
      const cdp = await browserContext.newCDPSession(demo);
      const { targetInfo } = await cdp.send('Target.getTargetInfo');
      await cdp.send('Browser.setPermission', {
        permission: { name: 'notifications' }, setting: 'denied', origin: url.origin,
        browserContextId: targetInfo.browserContextId,
      });
      await demo.goto(url.href);
      await demo.getByText('System notifications are blocked. You can still open events below.').waitFor();
      const blocked = await demo.getByRole('button', { name: 'Notify about equipment delivery' }).isDisabled();
      await demo.getByRole('link', { name: 'Equipment delivery' }).click();
      await demo.getByRole('heading', { name: 'Equipment delivery' }).waitFor();
      return { blocked, route: new URL(demo.url()).searchParams.get('event') };
    });
  },
};

async function withNotifications(context, runner, run) {
  const url = new URL('/examples/notifications/', runner.url());
  const browserContext = await context.browser().newContext();
  try {
    const demo = await browserContext.newPage();
    demo.setDefaultTimeout(5000);
    return await run(browserContext, demo, url);
  } finally {
    await browserContext.close();
  }
}

async function notificationWorker(context, url) {
  const script = new URL('worker.js', url).href;
  return context.serviceWorkers().find(worker => worker.url() === script)
    ?? context.waitForEvent('serviceworker', { predicate: worker => worker.url() === script, timeout: 5000 });
}

async function readNotice(worker, tag) {
  return worker.evaluate(async tag => {
    const [notice] = await registration.getNotifications({ tag });
    if (notice) return { title: notice.title, options: { tag: notice.tag, body: notice.body, data: notice.data } };
  }, tag);
}

async function dispatchNativeEvent(worker, tag, times = 1) {
  return worker.evaluate(async ({ tag, times }) => {
    const [notice] = await registration.getNotifications({ tag });
    if (!notice) throw new Error('Chromium has no delivered notification for this activation.');
    const tasks = [];
    const windowURLs = [];
    let openError;
    const open = clients.openWindow;
    clients.openWindow = async href => {
      windowURLs.push(href);
      try { return await open.call(clients, href); } catch (error) {
        if (error.name !== 'InvalidAccessError') throw error;
        openError = error.name;
        return null;
      }
    };
    try {
      for (let count = 0; count < times; count++) {
        const click = new NotificationEvent('notificationclick', { notification: notice });
        // Chromium restricts waitUntil to trusted OS events. Observe the same handler's promise.
        Object.defineProperty(click, 'waitUntil', { value: task => tasks.push(task) });
        dispatchEvent(click);
      }
      await Promise.all(tasks);
      const remaining = (await registration.getNotifications({ tag })).length;
      return { activations: tasks.length, distinctTasks: new Set(tasks).size, windowURLs, openError, remaining };
    } finally {
      delete clients.openWindow;
    }
  }, { tag, times });
}
