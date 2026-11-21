const choice = (page, name) => page.getByRole('checkbox', { name, exact: true });
const download = page => page.getByRole('button', { name: 'Download selection', exact: true });
const filePath = '/examples/offline/files/';
const catalogPath = '/examples/offline/catalog.json';

export const offlineCommands = {
  async offlineGroupFlow({ context, page }, reducedMotion) {
    return withOffline(context, page, {}, async (browser, demo, url) => {
      const seed = await (await demo.request.get(new URL(catalogPath, url).href)).json();
      let catalog;
      const files = [];
      const firstPair = Promise.withResolvers();
      const firstGate = Promise.withResolvers();
      const retryGate = Promise.withResolvers();
      let measuredSize;
      // Keep fault injection on ordinary network requests. WebKit routes bypass request mocks while a service worker controls the page.
      await demo.addInitScript(() => {
        const worker = navigator.serviceWorker;
        const register = worker.register.bind(worker);
        const proceed = new Promise(resolve => { window.installOfflineWorker = resolve; });
        worker.register = async (...args) => { await proceed; return register(...args); };
      });
      await demo.route(`**${catalogPath}`, route => catalog ? route.fulfill({ json: catalog }) : route.continue());
      await demo.route(`**${filePath}*`, async route => {
        const name = new URL(route.request().url()).pathname.split('/').at(-1);
        const attempt = files.push(name);
        if (attempt === 2) firstPair.resolve();
        if (attempt <= 2) {
          await firstGate.promise;
          if (name === 'south-route.txt') return route.fulfill({ status: 503, body: 'Unavailable' });
          return route.continue();
        }
        await retryGate.promise;
        const response = await route.fetch();
        const body = await response.body();
        measuredSize = body.byteLength;
        return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': String(measuredSize) } });
      });

      try {
        await demo.goto(url);
        const maps = choice(demo, 'Field maps');
        const north = choice(demo, 'North route');
        await north.waitFor();
        await demo.setViewportSize({ width: 305, height: 460 });
        await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        const fileLabelFits = await north.evaluate(input => {
          const label = input.getRootNode().querySelector('[part="label"] slot');
          const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
          const word = document.createRange();
          word.setStart(text, 0);
          word.setEnd(text, 'North'.length);
          return word.getClientRects().length === 1;
        });
        await demo.setViewportSize({ width: 800, height: 740 });
        await demo.evaluate(() => { document.documentElement.style.fontSize = ''; });
        await north.press('Space');
        await maps.focus();
        const mixed = await checkState(maps);
        await maps.press('Space');
        const all = await checkState(maps);
        await maps.press('Space');
        const clear = await checkState(maps);
        await maps.press('Space');

        await download(demo).evaluate(button => { button.click(); button.click(); });
        const timer = setTimeout(() => firstPair.reject(new Error('The two selected file requests did not arrive')), 5000);
        try { await firstPair.promise; } finally { clearTimeout(timer); }
        const progress = demo.getByRole('progressbar', { name: 'Downloading Field maps' });
        await progress.waitFor();
        const unknown = await progress.getAttribute('aria-valuenow') === null;
        await demo.setViewportSize({ width: 260, height: 740 });
        await download(demo).waitFor({ state: 'hidden' });
        const more = demo.getByRole('button', { name: 'More commands' });
        await more.press('Enter');
        await download(demo).waitFor();
        const overflow = await download(demo).isDisabled() && await demo.getByText('2 selected', { exact: true }).isVisible();
        await demo.keyboard.press('Escape');
        await demo.emulateMedia({ colorScheme: 'dark', reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
        const theme = await demo.evaluate(() => ({ dark: getComputedStyle(document.documentElement).backgroundColor,
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }));

        catalog = seed.map(item => item.value === 'old-route' ? { ...item, value: 'new-grid', label: 'Site grid', disabled: false } : item);
        await maps.focus();
        await demo.evaluate(() => window.dispatchEvent(new Event('online')));
        await choice(demo, 'Site grid').waitFor();
        const changedGroup = await checkState(maps);
        await choice(demo, 'Depot notes').press('Space');
        const liveSelection = await demo.locator('#selection-count').textContent();

        firstGate.resolve();
        await demo.getByText('Saved 1 file for offline use. 1 could not be saved.', { exact: true }).waitFor();
        const cachedBeforeRetry = await demo.getByRole('button', { name: 'Read North route offline' }).isVisible()
          && await demo.getByRole('button', { name: 'Read South route offline' }).isHidden();

        await demo.getByRole('button', { name: 'Retry', exact: true }).press('Enter');
        await progress.waitFor();
        const status = demo.getByRole('region', { name: 'Field maps download', exact: true }).getByRole('status');
        const retryFocused = await status.evaluate(element => element.matches(':focus'));
        await progress.evaluate(element => {
          window.measuredProgress = [];
          new MutationObserver(() => {
            if (element.hasAttribute('aria-valuenow')) window.measuredProgress.push(Number(element.getAttribute('aria-valuemax')));
          }).observe(element, { attributes: true, attributeFilter: ['aria-valuenow', 'aria-valuemax'] });
        });
        retryGate.resolve();
        await demo.getByText('Saved 1 file for offline use.', { exact: true }).waitFor();
        const measured = await demo.evaluate(size => window.measuredProgress.includes(size), measuredSize);
        const retryFocusKept = retryFocused && await status.evaluate(element => element.matches(':focus'));

        await choice(demo, 'Depot notes').focus();
        catalog = catalog.filter(item => item.value !== 'depot-notes');
        await demo.evaluate(() => window.dispatchEvent(new Event('online')));
        await choice(demo, 'Depot notes').waitFor({ state: 'detached' });
        const focusedAfterRemoval = (await checkState(maps)).focused;
        const selectionAfterRemoval = await demo.locator('#selection-count').textContent();

        await demo.evaluate(() => window.installOfflineWorker());
        await demo.waitForFunction(() => navigator.serviceWorker?.controller?.scriptURL.endsWith('/offline-worker.js'));
        await demo.unroute(`**${catalogPath}`);
        await demo.unroute(`**${filePath}*`);
        await browser.setOffline(true);
        await demo.reload();
        await demo.getByText('Showing the last saved file list.').waitFor();
        const bothSaved = await demo.getByRole('button', { name: 'Read South route offline' }).isVisible()
          && await demo.getByRole('button', { name: 'Read Site grid offline' }).isHidden();
        await demo.getByRole('button', { name: 'Read North route offline' }).press('Enter');
        await demo.getByRole('dialog', { name: 'North route' }).waitFor();
        const offlineContent = await demo.locator('#file-content').textContent();
        return { mixed, all, clear, changedGroup, liveSelection, unknown, overflow, theme, cachedBeforeRetry, measured, retryFocusKept,
          focusedAfterRemoval, selectionAfterRemoval, files: [...files.slice(0, 2).sort(), ...files.slice(2)],
          bothSaved, fileLabelFits, offlineContent };
      } finally {
        firstGate.resolve();
        retryGate.resolve();
      }
    });
  },

  async offlineTouchSelection({ context, page }) {
    return withOffline(context, page, { hasTouch: true, isMobile: true }, async (_browser, demo, url) => {
      await demo.goto(url);
      const first = choice(demo, 'North route');
      const maps = choice(demo, 'Field maps');
      await first.tap();
      const mixed = (await checkState(maps)).mixed;
      await maps.tap();
      return { mixed, full: (await checkState(maps)).checked, selected: await demo.locator('#selection-count').textContent(),
        disabledExcluded: !(await choice(demo, 'Retired route').isChecked()) };
    });
  },
};

const checkState = checkbox => checkbox.evaluate(input => ({ mixed: input.indeterminate, checked: input.checked,
  focused: input.getRootNode().activeElement === input }));

async function withOffline(context, runner, options, run) {
  const browser = await context.browser().newContext({ viewport: { width: 800, height: 740 }, ...options });
  try {
    const demo = await browser.newPage();
    demo.setDefaultTimeout(5000);
    const url = new URL('/examples/offline/', runner.url()).href;
    return await run(browser, demo, url);
  } finally {
    await browser.close();
  }
}
