const requestPath = '/examples/refresh/requests.json';
const action = (page, name) => page.getByRole('button', { name: `Actions for ${name}`, exact: true });
const pick = (page, name) => page.getByRole('radio', { name: `Select ${name}`, exact: true });
const refresh = page => page.getByRole('button', { name: 'Refresh', exact: true });
const result = page => page.locator('#results-status');

export const refreshCommands = {
  async refreshColdFlow({ context, page }) {
    return withRefresh(context, page, async (demo, url, traffic) => {
      await demo.goto(url);
      const first = await traffic.next();
      await demo.getByText('Loading requests…').waitFor();
      const whileLoading = await demo.getByRole('progressbar', { name: 'Refreshing requests' }).isVisible()
        && await demo.getByRole('radio').count() === 0;
      await respond(first, 503);
      await demo.getByRole('alert').filter({ hasText: 'Requests could not be loaded.' }).waitFor();
      await waitForIdle(demo);
      const coldError = await demo.getByRole('progressbar').count() === 0 && await demo.getByRole('radio').count() === 0;

      await demo.getByRole('button', { name: 'Try again', exact: true }).press('Enter');
      await (await traffic.next()).continue();
      await pick(demo, 'Entrance lighting').waitFor();
      await waitForIdle(demo);
      const retry = await result(demo).textContent();

      await demo.reload();
      await respond(await traffic.next(), 200, []);
      await demo.getByText('There are no available requests.').waitFor();
      await waitForIdle(demo);
      return { whileLoading, coldError, retry, empty: await result(demo).textContent(),
        alertsAfterEmpty: await demo.getByRole('alert').count(), methods: traffic.methods };
    });
  },

  async refreshRecoveryFlow({ context, page }) {
    return withRefresh(context, page, async (demo, url, traffic) => {
      await demo.goto(url);
      await (await traffic.next()).continue();
      await pick(demo, 'Entrance lighting').waitFor();
      await waitForIdle(demo);
      await observeResults(demo);
      await refresh(demo).press('Enter');
      const failure = await traffic.next();
      await demo.getByRole('progressbar', { name: 'Refreshing requests' }).waitFor();
      const row = pick(demo, 'Workshop ventilation');
      await row.press('Space');
      const rowsInteractive = await row.isChecked() && await refresh(demo).isDisabled();
      await online(demo);
      await online(demo);
      await respond(failure, 503);
      await demo.getByRole('alert').filter({ hasText: 'The refresh failed.' }).waitFor();
      await waitForIdle(demo);
      const keptOnError = await row.isChecked();

      await demo.getByRole('button', { name: 'Retry refresh' }).press('Enter');
      const waiting = await traffic.next();
      const aborted = demo.waitForEvent('requestfailed', { predicate: request => request === waiting.request() });
      await demo.getByRole('button', { name: 'Cancel refresh' }).press('Enter');
      // Release the network route as well, so a response racing cancellation cannot be committed.
      await respond(waiting, 200, []).catch(() => {});
      const failed = await aborted;
      await waitForIdle(demo);
      const afterCancel = { alerts: await demo.getByRole('alert').count(), selected: await row.isChecked(),
        aborted: Boolean(failed.failure()?.errorText) };

      await refresh(demo).press('Enter');
      await (await traffic.next()).continue();
      await waitForIdle(demo);
      return { rowsInteractive, keptOnError, afterCancel, result: await result(demo).textContent(),
        progress: await demo.getByRole('progressbar').count(), methods: traffic.methods,
        announcements: await demo.evaluate(() => window.refreshAnnouncements) };
    });
  },

  async refreshFocusFlow({ context, page }) {
    return withRefresh(context, page, async (demo, url, traffic) => {
      const seed = await (await demo.request.get(new URL(requestPath, url).href)).json();
      await demo.goto(url);
      await (await traffic.next()).continue();
      await pick(demo, 'Entrance lighting').waitFor();
      await waitForIdle(demo);

      const filters = demo.getByRole('button', { name: 'Filters', exact: true });
      await filters.press('Enter');
      const expanded = await filters.getAttribute('aria-expanded') === 'true';
      const state = demo.getByRole('combobox', { name: 'Request state' });
      const filterFocus = await focused(state);
      await state.press('ArrowDown');
      await demo.getByRole('button', { name: 'Apply filter' }).press('Enter');
      await demo.getByText('12 requests shown.').waitFor();
      const focusAfterFilter = await focused(pick(demo, 'Entrance lighting'));
      const routeBefore = demo.url();

      const label = 'Equipment calibration';
      await pick(demo, label).press('Space');
      const rowAction = action(demo, label);
      await rowAction.evaluate(button => button.focus({ preventScroll: true }));
      await demo.locator('#requests').evaluate(element => element.restoreAnchor({ key: '105', offset: -10, axis: 'vertical' }));
      const anchorBefore = await anchor(demo);
      await observeResults(demo);

      const added = { id: '100', label: 'Roof inspection', state: 'open', description: 'Check the roof access.' };
      const updated = [added, ...seed];
      await online(demo);
      await respond(await traffic.next(), 200, updated);
      await demo.getByText('13 requests shown.').waitFor();
      await waitForIdle(demo);
      const afterUpdate = { anchor: await anchor(demo), focused: await focused(rowAction),
        selected: await pick(demo, label).isChecked(), route: demo.url() === routeBefore };

      await online(demo);
      await respond(await traffic.next(), 200, updated);
      await waitForIdle(demo);
      const unchanged = { anchor: await anchor(demo), focused: await focused(rowAction),
        announcements: await demo.evaluate(() => window.refreshAnnouncements.slice()) };

      await rowAction.press('Enter');
      const menu = demo.getByRole('menu', { name: 'Request actions' });
      await menu.waitFor();
      await demo.keyboard.press('Escape');
      await menu.waitFor({ state: 'hidden' });
      const menuFocus = await focused(rowAction) && await rowAction.getAttribute('aria-expanded') === 'false';
      await rowAction.press('Enter');
      await menu.getByRole('menuitem', { name: 'View request' }).press('Enter');
      const details = demo.getByRole('dialog', { name: label });
      await details.waitFor();
      const fromMenu = await demo.locator('#details-description').textContent();
      const closeDetails = demo.getByRole('button', { name: 'Close details', exact: true });
      await closeDetails.press('Enter');
      const command = demo.getByRole('button', { name: 'View selected request', exact: true });
      await command.press('Enter');
      await details.waitFor();
      const fromBar = await demo.locator('#details-description').textContent();
      await closeDetails.press('Enter');

      await rowAction.evaluate(button => button.focus({ preventScroll: true }));
      await demo.locator('#requests').evaluate(element => element.restoreAnchor({ key: '105', offset: -10, axis: 'vertical' }));
      await online(demo);
      await respond(await traffic.next(), 200, updated.filter(item => item.id !== '105'));
      await demo.getByText('12 requests shown. Equipment calibration is no longer in this view.').waitFor();
      await waitForIdle(demo);
      const nearest = action(demo, 'Meeting room projector');
      await nearest.waitFor();
      const removed = { anchor: await anchor(demo), nearest: await focused(nearest), disabled: await command.isDisabled() };

      await online(demo);
      await respond(await traffic.next(), 200, updated.filter(item => item.state !== 'open'));
      await demo.getByText('No requests match the Open filter.').waitFor();
      await waitForIdle(demo);
      const empty = { focused: await focused(filters), expanded: await filters.getAttribute('aria-expanded'), route: demo.url() === routeBefore,
        announcements: await demo.evaluate(() => window.refreshAnnouncements) };
      return { expanded, filterFocus, focusAfterFilter, state: new URL(routeBefore).searchParams.get('state'), anchorBefore,
        afterUpdate, unchanged, actions: { menuFocus, fromMenu, fromBar }, removed, empty, methods: traffic.methods };
    });
  },
};

const focused = locator => locator.evaluate(element => element === document.activeElement);
const anchor = demo => demo.locator('#requests').evaluate(element => element.getAnchor());
const online = demo => demo.evaluate(() => window.dispatchEvent(new Event('online')));

function waitForIdle(demo) {
  return demo.waitForFunction(() => document.querySelector('#requests').refreshing === false);
}

function observeResults(demo) {
  return result(demo).evaluate(element => {
    window.refreshAnnouncements = [];
    new MutationObserver(() => window.refreshAnnouncements.push(element.textContent)).observe(element, { childList: true });
  });
}

function respond(route, status, json = {}) { return route.fulfill({ status, json }); }

async function withRefresh(context, runner, run) {
  const demo = await context.newPage();
  const methods = [];
  const paused = [];
  let waiting;
  try {
    demo.setDefaultTimeout(5000);
    await demo.route(`**${requestPath}`, route => {
      methods.push(route.request().method());
      if (waiting) { waiting(route); waiting = undefined; }
      else paused.push(route);
    });
    const next = () => paused.length ? Promise.resolve(paused.shift()) : new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiting = undefined; reject(new Error('No collection request arrived')); }, 5000);
      waiting = route => { clearTimeout(timer); resolve(route); };
    });
    return await run(demo, new URL('/examples/refresh/', runner.url()).href, { methods, next });
  } finally {
    await demo.close();
  }
}
