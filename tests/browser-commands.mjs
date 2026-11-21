import { notificationCommands } from './notification-commands.mjs';
import { musicCommands } from './music-commands.mjs';
import { draftsCommands } from './drafts-commands.mjs';
import { refreshCommands } from './refresh-commands.mjs';
import { offlineCommands } from './offline-commands.mjs';
import { annotationCommands } from './annotation-commands.mjs';
import { phoneHubCommands } from './phone-hub-example-commands.mjs';
import { importsCommands } from './imports-commands.mjs';
import { landscapeMailCommands } from './landscape-mail-commands.mjs';
import { progressCommands } from './progress-commands.mjs';
import { pickerFormCommands } from './picker-forms-commands.mjs';
import { inkCanvasCommands } from './ink-canvas-commands.mjs';
import { phoneDateTimeCommands } from './phone-date-time-commands.mjs';
import { pivotHeaderCommands } from './pivot-headers-commands.mjs';
import { applications } from '../examples/catalog/applications.js';

// Real navigations and touch sequences run through the Browser Mode provider.
export const browserCommands = {
  ...notificationCommands,
  ...musicCommands,
  ...draftsCommands,
  ...refreshCommands,
  ...offlineCommands,
  ...annotationCommands,
  ...phoneHubCommands,
  ...importsCommands,
  ...landscapeMailCommands,
  ...progressCommands,
  ...pickerFormCommands,
  ...inkCanvasCommands,
  ...phoneDateTimeCommands,
  ...pivotHeaderCommands,
  async personPictureLoading({ context, page }) {
    return withPage(context, async demo => {
      let release;
      let respond;
      let started;
      const pending = new Promise(resolve => { release = resolve; });
      const received = new Promise(resolve => { started = resolve; });
      const finished = new Promise(resolve => { respond = resolve; });
      const image = width => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="80">
        <rect width="20" height="20" fill="purple"/></svg>`;
      await demo.route('**/slow-portrait.svg', async route => {
        started();
        await pending;
        try { await route.fulfill({ contentType: 'image/svg+xml', body: image(80) }); }
        catch { /* The avatar may already have discarded this image. */ }
        finally { respond(); }
      });
      await demo.route('**/current-portrait.svg', route =>
        route.fulfill({ contentType: 'image/svg+xml', body: image(120) }));
      try {
        await demo.goto(new URL('/examples/catalog/?tag=metro-person-picture', page.url()).href);
        await demo.evaluate(() => { document.querySelector('metro-person-picture').src = '/slow-portrait.svg'; });
        await received;
        const initialsWhileLoading = await demo.getByText('АВ', { exact: true }).isVisible();
        await demo.evaluate(() => { document.querySelector('metro-person-picture').src = '/current-portrait.svg'; });
        await demo.waitForFunction(() => document.querySelector('metro-person-picture')
          .shadowRoot.querySelector('metro-image')?.image?.naturalWidth === 120);
        release();
        await finished;
        const result = await demo.evaluate(() => {
          const avatar = document.querySelector('metro-person-picture');
          const photo = avatar.shadowRoot.querySelector('metro-image');
          return { width: photo.image.naturalWidth, initials: Boolean(avatar.shadowRoot.querySelector('[part~="initials"]')),
            label: avatar.shadowRoot.querySelector('[part="surface"]').getAttribute('aria-label') };
        });
        return { initialsWhileLoading, ...result };
      } finally {
        release();
      }
    });
  },
  async webViewTimeout({ context, page }) {
    return withPage(context, async demo => {
      const address = '/tests/__delayed-web-document';
      let requests = 0;
      let releaseFirst;
      let finishFirst;
      const gate = new Promise(resolve => { releaseFirst = resolve; });
      const finished = new Promise(resolve => { finishFirst = resolve; });
      await demo.route(`**${address}`, async route => {
        if (++requests === 1) {
          await gate;
          try { await route.fulfill({ contentType: 'text/html', body: '<title>Late document</title>' }); }
          catch { /* Removing the timed-out iframe can cancel the intercepted request. */ }
          finally { finishFirst(); }
          return;
        }
        await route.fulfill({ contentType: 'text/html', body: '<title>Retried document</title>' });
      });
      try {
        await demo.goto(new URL('/examples/catalog/?tag=metro-web-view', page.url()).href);
        const read = () => demo.evaluate(() => {
          const view = document.querySelector('metro-web-view');
          return { state: view.state, hasFrame: Boolean(view.frame),
            title: view.frame?.contentDocument?.title ?? null,
            errors: window.webErrors, loads: window.webLoads, canGoBack: view.canGoBack };
        });
        await demo.evaluate(async address => {
          const expander = document.querySelector('metro-expander');
          expander.open = true;
          await expander.updateComplete;
          const view = expander.querySelector('metro-web-view');
          window.webErrors = 0;
          window.webLoads = 0;
          view.addEventListener('metro-web-error', () => { window.webErrors++; });
          view.addEventListener('metro-web-load', () => { window.webLoads++; });
          view.historyEnabled = true;
          view.loadTimeout = 600;
          view.src = address;
        }, address);
        await demo.getByRole('alert').waitFor({ timeout: 4000 });
        releaseFirst();
        await finished;
        const afterTimeout = await read();
        await demo.evaluate(() => { document.querySelector('metro-web-view').loadTimeout = 4000; });
        await demo.getByRole('button', { name: 'Retry' }).click();
        await demo.waitForFunction(() => document.querySelector('metro-web-view').state === 'ready');
        return { afterTimeout, afterRetry: await read(), requests };
      } finally {
        releaseFirst();
      }
    });
  },
  async catalogApplicationLayout({ context, page }, width, colorScheme, textSize) {
    return withPage(context, async demo => {
      await demo.setViewportSize({ width, height: 750 });
      await demo.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      const results = [];
      for (const [file, tags] of Object.entries(applications)) {
        const errors = [];
        const recordError = error => errors.push(error.message);
        demo.on('pageerror', recordError);
        try {
          const response = await demo.goto(new URL(file, new URL('/examples/catalog/', page.url())).href);
          if (textSize !== 100) {
            await demo.evaluate(size => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
          }
          const state = await demo.evaluate(async tags => {
            await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return {
              overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
              missing: tags.filter(tag => {
                const constructor = customElements.get(tag);
                return !constructor || !(document.querySelector(tag) instanceof constructor);
              }),
            };
          }, tags);
          results.push({ file, status: response?.status(), ...state, errors });
        } finally {
          demo.off('pageerror', recordError);
        }
      }
      return results;
    });
  },
  async photosExample({ context, page }, switchLayout, enlargeLabels = false) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 390, height: 680 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/examples/photos/', page.url()).href);
      const pivot = demo.locator('#photo-pivot');
      const menu = demo.locator('#photo-menu');
      const initial = await demo.evaluate(() => history.length);
      const albumTab = pivot.getByRole('tab', { name: 'Альбомы' });
      await pivot.getByRole('tab', { name: 'Коллекция', selected: true }).waitFor();
      if (switchLayout && context.browser().browserType().name() === 'chromium') {
        const touch = await context.newCDPSession(demo);
        await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        try {
          const feed = await pivot.locator('[data-feed="collection"]').boundingBox();
          const start = { x: Math.round(feed.x + feed.width * .8), y: Math.round(feed.y + 80) };
          await swipe(touch, start, { x: start.x - 145, y: start.y + 1 });
        } finally {
          await touch.detach();
        }
      } else {
        await pivot.getByRole('tab', { name: 'Коллекция' }).press('ArrowRight');
        if (await albumTab.getAttribute('aria-selected') !== 'true') await albumTab.press('Enter');
      }
      await pivot.getByRole('tab', { name: 'Альбомы', selected: true }).waitFor();
      const phoneFeed = pivot.locator('[data-feed="albums"]');
      const photoId = enlargeLabels ? 'bridge' : 'street';
      const photoTitle = enlargeLabels ? 'Мост в сумерках' : 'Улица после дождя';
      const photoDescription = enlargeLabels
        ? 'Окна на дальнем берегу за тёмными арками моста.'
        : 'Цветные фасады отражаются на мокрой мостовой.';
      const open = phoneFeed.getByRole('link', { name: photoTitle });
      await open.scrollIntoViewIfNeeded();
      const savedTop = await phoneFeed.evaluate(element => element.scrollTop);
      const savedAnchor = await open.evaluate(element => {
        const feed = element.closest('[data-feed]');
        return { offset: element.getBoundingClientRect().top - feed.getBoundingClientRect().top, width: feed.clientWidth };
      });
      await open.click();

      const title = demo.getByRole('heading', { name: photoTitle });
      await title.waitFor();
      const viewer = demo.locator('#photo-image');
      await viewer.getByRole('img', { name: photoDescription }).waitFor();
      await viewer.getByRole('button', { name: 'Увеличить' }).click();
      if (switchLayout) await demo.setViewportSize({ width: 1040, height: 680 });
      if (enlargeLabels) await demo.addStyleTag({ content: '.photo-card span { font-size: 200%; }' });
      const photoPreserved = await title.isVisible()
        && await viewer.evaluate(element => element.view.zoom === 1.5)
        && new URL(demo.url()).searchParams.get('photo') === photoId;
      const oneVisit = await demo.evaluate(() => history.length) === initial + 1;

      if (switchLayout) await demo.locator('#photo-back').click();
      else await demo.goBack();
      const shell = switchLayout ? menu : pivot;
      const feed = shell.locator('[data-feed="albums"]');
      const returned = feed.getByRole('link', { name: photoTitle });
      await returned.waitFor();
      await demo.waitForFunction(({ id, shellId }) => {
        const card = document.activeElement;
        const feed = card?.closest(`#${shellId} [data-feed="albums"]`);
        if (card?.dataset.photo !== id || !feed) return false;
        const rect = card.getBoundingClientRect();
        const viewport = feed.getBoundingClientRect();
        return rect.top < viewport.bottom && rect.bottom > viewport.top;
      }, { id: photoId, shellId: switchLayout ? 'photo-menu' : 'photo-pivot' });
      const scrollRestored = savedTop > 0 && (enlargeLabels
        ? await returned.evaluate((element, { savedAnchor, savedTop }) => {
          const feed = element.closest('[data-feed]');
          const offset = element.getBoundingClientRect().top - feed.getBoundingClientRect().top;
          return feed.clientWidth === savedAnchor.width && Math.abs(offset - savedAnchor.offset) <= 1 && feed.scrollTop > savedTop;
        }, { savedAnchor, savedTop })
        : switchLayout || await feed.evaluate(element => element.scrollTop) === savedTop);
      const sectionRestored = await shell.evaluate(element => element.value) === 'albums'
        && new URL(demo.url()).searchParams.get('section') === 'albums';
      const captionsFit = await feed.evaluate(element => element.scrollWidth <= element.clientWidth + 1);

      let menuSynchronized = true;
      if (switchLayout) {
        await demo.setViewportSize({ width: 390, height: 680 });
        await demo.waitForFunction(() => document.activeElement?.closest('#photo-pivot')?.id === 'photo-pivot');
        await demo.setViewportSize({ width: 1040, height: 680 });
        await demo.waitForFunction(() => document.activeElement?.closest('#photo-menu')?.id === 'photo-menu');
        const albumLink = menu.getByRole('link', { name: 'Альбомы' });
        const albumWasCurrent = await albumLink.getAttribute('aria-current') === 'page';
        await menu.getByRole('link', { name: 'Коллекция' }).click();
        await menu.locator('[data-feed="collection"]').getByRole('link', { name: 'Маяк на мысе' }).waitFor();
        menuSynchronized = albumWasCurrent && await pivot.evaluate(element => element.value) === 'collection'
          && await demo.evaluate(() => history.length) === initial + 1;
      }
      return { photoPreserved, oneVisit, scrollRestored, sectionRestored, menuSynchronized, captionsFit };
    });
  },

  async photosGridAtLargeText({ context, page }, width) {
    return withPage(context, async demo => {
      await demo.setViewportSize({ width, height: 570 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/examples/photos/', page.url()).href);
      const feed = demo.locator('#photo-pivot [data-feed="collection"]');
      const grid = feed.locator('.photo-grid');
      const columns = () => grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      const photo = feed.getByRole('link', { name: 'Снежный перевал' });
      await photo.waitFor();
      const normal = await columns();
      await photo.press('Enter');
      await demo.getByRole('heading', { name: 'Снежный перевал' }).waitFor();
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await demo.goBack();
      await demo.waitForFunction(() => document.activeElement?.dataset.photo === 'pass');

      return {
        normal, enlarged: await columns(),
        captionFits: await feed.evaluate(element => element.scrollWidth <= element.clientWidth + 1),
        focusVisible: await photo.evaluate(element => {
          const viewport = element.closest('[data-feed]').getBoundingClientRect();
          const card = element.getBoundingClientRect();
          return document.activeElement === element && card.top < viewport.bottom && card.bottom > viewport.top;
        }),
      };
    });
  },

  async navigationExample({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4500);
      await demo.setViewportSize({ width: 940, height: 690 });
      await demo.goto(new URL('/examples/navigation/?project=north', page.url()).href);
      const shell = demo.getByRole('navigation', { name: 'Разделы проекта' });
      const selected = shell.getByRole('link', { name: 'Проекты', exact: true });
      const team = shell.getByRole('link', { name: 'Команда', exact: true });
      const back = demo.getByRole('button', { name: 'Назад', exact: true });
      const detail = demo.getByRole('heading', { name: 'Северный маршрут' });
      await detail.waitFor();
      const deepLink = await selected.getAttribute('aria-current') === 'page' && await back.isEnabled();
      await demo.setViewportSize({ width: 370, height: 650 });
      const menu = demo.getByRole('button', { name: 'Разделы', exact: true });
      await menu.click();
      await back.click();
      await demo.waitForFunction(() => !document.querySelector('#sections').open);
      const menuFirst = await detail.isVisible() && await back.isEnabled();
      await back.click();
      await demo.getByRole('heading', { name: 'Проекты', exact: true }).waitFor();
      await demo.setViewportSize({ width: 940, height: 690 });
      await team.click();
      await team.click();
      await demo.getByRole('heading', { name: 'Команда', exact: true }).waitFor();
      const peersReplace = await back.isDisabled() && await team.getAttribute('aria-current') === 'page';
      await selected.click();
      const taskLink = demo.getByRole('link', { name: 'Северный маршрут', exact: true });
      await taskLink.click();
      await detail.waitFor();
      await back.click();
      await demo.waitForFunction(() => document.activeElement?.id === 'open-task');
      const restored = await taskLink.isVisible() && await selected.getAttribute('aria-current') === 'page' &&
        new URL(demo.url()).searchParams.get('section') === 'projects';

      await demo.setViewportSize({ width: 320, height: 330 });
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await taskLink.evaluate(link => link.scrollIntoView({ block: 'end' }));
      const listPosition = await demo.evaluate(() => window.scrollY);
      await taskLink.press('Enter');
      await detail.waitFor();
      await menu.press('Enter');
      await menu.press('Shift+Tab');
      await demo.keyboard.press('Enter');
      await demo.waitForFunction(() => !document.querySelector('#sections').open);
      const compactMenuFirst = await detail.isVisible() && await back.isEnabled();
      await demo.keyboard.press('Shift+Tab');
      await demo.keyboard.press('Enter');
      await demo.waitForFunction(() => document.activeElement?.id === 'open-task');
      const compactRestored = await taskLink.evaluate((link, scroll) => {
        const rect = link.getBoundingClientRect();
        const style = getComputedStyle(link);
        const focusInset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        return scroll > 0 && Math.abs(window.scrollY - scroll) <= 1 &&
          link.matches(':focus-visible') && rect.top >= focusInset &&
          rect.bottom + focusInset <= window.innerHeight + 1;
      }, listPosition);

      await taskLink.press('Enter');
      const breadcrumbs = demo.getByRole('navigation', { name: 'Расположение проекта' });
      const ancestor = breadcrumbs.getByRole('link', { name: 'Проекты', exact: true });
      await ancestor.press('Enter');
      await demo.waitForFunction(() => document.activeElement?.id === 'open-task');
      const breadcrumbRestored = new URL(demo.url()).searchParams.get('section') === 'projects'
        && await back.isDisabled() && await breadcrumbs.count() === 0;
      return { deepLink, menuFirst, peersReplace, restored, compactMenuFirst, compactRestored, breadcrumbRestored };
    });
  },

  async collectionCrossSlideMove({ context, page }) {
    const device = await context.browser().newContext({ hasTouch: true, viewport: { width: 980, height: 800 } });
    try {
      const demo = await device.newPage();
      await demo.goto(new URL('/examples/collections/', page.url()).href);
      await demo.getByRole('checkbox', { name: 'Select Field notes' }).check();
      await demo.getByRole('checkbox', { name: 'Select Night signal' }).check();
      demo.setDefaultTimeout(4000);
      const source = await demo.locator('#library metro-list-item[value="field-notes"] metro-cross-slide').boundingBox();
      const destination = await demo.locator('#queue metro-list-item[value="morning-bulletin"] metro-cross-slide').boundingBox();
      const start = { x: Math.round(source.x + 60), y: Math.round(source.y + source.height / 2) };
      const target = { x: Math.round(destination.x + 70), y: Math.round(destination.y + 7) };
      const cdp = await device.newCDPSession(demo);
      const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
      const approach = async () => {
        await send('touchStart', start);
        await send('touchMove', { x: start.x + 26, y: start.y });
        await send('touchMove', { x: start.x + 94, y: start.y });
        await send('touchMove', target);
        await demo.waitForFunction(() => {
          const queue = document.querySelector('#queue');
          return queue.shadowRoot.querySelector('[data-reorder-key="morning-bulletin"] [part="marker"]');
        });
      };
      await approach();
      const outside = await demo.getByRole('heading', { name: 'Library and queue' }).boundingBox();
      await send('touchMove', { x: Math.round(outside.x + 55), y: Math.round(outside.y + 15) });
      await send('touchEnd');
      await demo.waitForFunction(() => !document.querySelector('#transfer').batchProposal);
      const canceled = await demo.locator('#queue').evaluate(list => [...list.values]);
      await approach();
      await send('touchEnd');
      await demo.waitForFunction(() => document.querySelector('#queue').values.length === 3);
      return await demo.evaluate(canceled => ({
        canceled,
        library: [...document.querySelector('#library').values],
        archive: [...document.querySelector('#archive').values],
        queue: [...document.querySelector('#queue').values],
        selection: [...document.querySelector('#transfer').selection.values],
      }), canceled);
    } finally {
      await device.close();
    }
  },

  async compactCollectionSelection({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4000);
      await demo.setViewportSize({ width: 305, height: 500 });
      const url = new URL('/examples/collections/selection.html', page.url());
      await demo.goto(new URL('./', url).href);
      await demo.goto(url.href);
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const field = demo.getByRole('button', { name: 'Select Field notes' });
      await field.press('Space');
      const labelsFit = await demo.evaluate(() => {
        const heading = document.querySelector('h1');
        const range = document.createRange();
        range.selectNodeContents(heading);
        if (range.getClientRects().length !== 1) return false;
        return [...document.querySelectorAll('metro-pivot-item[value="field"] metro-cross-slide')].every(row => {
          const button = row.shadowRoot.querySelector('button').getBoundingClientRect();
          const link = row.querySelector('a');
          const label = link.firstChild;
          return Array.from(label.textContent.matchAll(/\S+/g)).every(word => {
            range.setStart(label, word.index);
            range.setEnd(label, word.index + word[0].length);
            const boxes = range.getClientRects();
            return boxes.length === 1 && (boxes[0].right <= button.left || boxes[0].bottom <= button.top);
          });
        });
      });
      const opener = demo.getByRole('button', { name: 'Selection (1)' });
      const dialog = demo.getByRole('dialog', { name: 'Selection' });
      await opener.press('Enter');
      await dialog.waitFor();
      const reply = Promise.withResolvers();
      await demo.route('**/available-recordings.json', async route => {
        await reply.promise;
        try { await route.fulfill({ json: ['field-notes'] }); } catch { /* Back aborts the request. */ }
      });
      try {
        await demo.getByRole('button', { name: 'Add to queue' }).press('Enter');
        await demo.getByText('Checking availability…', { exact: true }).waitFor();
        await demo.goBack();
      } finally {
        reply.resolve();
      }
      const backStayedOnPage = demo.url() === url.href;
      if (!backStayedOnPage) return { labelsFit, backStayedOnPage };
      await dialog.waitFor({ state: 'hidden' });
      const focusReturned = await opener.evaluate(button => document.activeElement === button);
      await demo.goForward();
      await dialog.waitFor();
      await demo.locator('#selected-recordings').getByText('Field notes', { exact: true }).waitFor();
      const pendingCleared = await demo.locator('#queue-update').textContent() === '' &&
        await demo.locator('#queue-positions > li').count() === 0;
      await demo.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      const escapeReturned = await opener.evaluate(button => document.activeElement === button);
      await demo.goBack();
      const escapeRemovedEntry = demo.url() === new URL('./', url).href;
      return { labelsFit, backStayedOnPage, focusReturned, escapeReturned, escapeRemovedEntry, pendingCleared };
    });
  },

  async collectionSelectionQueue({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/examples/collections/selection.html', page.url()).href);
      await demo.getByRole('button', { name: 'Select Field notes' }).click();
      await demo.getByRole('tab', { name: 'Broadcast' }).click();
      await demo.getByRole('button', { name: 'Select Radio archive' }).click();
      await demo.getByRole('button', { name: 'Selection (2)' }).click();
      const add = demo.getByRole('button', { name: 'Add to queue' });
      const status = demo.locator('#queue-update');
      const positions = demo.locator('#queue-positions > li');
      const firstReply = Promise.withResolvers();
      let firstRequests = 0;
      await demo.route('**/available-recordings.json', async route => {
        firstRequests++;
        await firstReply.promise;
        await route.continue();
      });
      let pendingFocus;
      try {
        await add.press('Enter');
        await status.getByText('Checking availability…', { exact: true }).waitFor();
        pendingFocus = await add.evaluate(button => document.activeElement === button);
        await demo.keyboard.press('Enter');
      } finally {
        firstReply.resolve();
      }
      await status.getByText('Queue contains 2 recordings.', { exact: true }).waitFor();
      await demo.unroute('**/available-recordings.json');
      await add.click();
      await status.getByText('Queue contains 4 recordings.', { exact: true }).waitFor();
      const separatePositions = await positions.evaluateAll(items => items.map(item => [item.dataset.metroKey, item.textContent]));
      await demo.route('**/available-recordings.json', route => route.fulfill({
        json: ['field-notes', 'evening-report', 'morning-bulletin'],
      }));
      await add.click();
      await status.getByText('Queue contains 5 recordings. Unavailable: Radio archive.', { exact: true }).waitFor();
      await demo.getByRole('button', { name: 'Back', exact: true }).click();
      await demo.waitForFunction(() => document.activeElement?.id === 'open-selection');
      const opener = demo.getByRole('button', { name: 'Selection (1)' });
      const updatedSelection = await opener.isVisible();
      const removedRow = !await demo.getByRole('link', { name: 'Radio archive' }).isVisible();
      await demo.unroute('**/available-recordings.json');
      await demo.route('**/available-recordings.json', route => route.fulfill({
        json: ['evening-report', 'morning-bulletin'],
      }));
      await opener.press('Enter');
      await add.press('Enter');
      await status.getByText('Queue contains 5 recordings. Unavailable: Field notes.', { exact: true }).waitFor();
      const emptyFocus = await status.evaluate(element => document.activeElement === element);
      await demo.keyboard.press('Escape');
      await demo.waitForFunction(() => document.activeElement?.id === 'open-selection');
      return {
        separatePositions, updatedSelection, removedRow, pendingFocus, firstRequests, emptyFocus,
      };
    });
  },

  async setMetroMedia({ page }, settings) {
    await page.emulateMedia(settings);
  },

  async nativeNotificationHost({ context, page }) {
    const url = new URL('/tests/fixtures/notification-host.html', page.url());
    await context.grantPermissions(['notifications'], { origin: url.origin });
    try {
      return await withPage(context, async demo => {
        await demo.goto(url.href);
        return demo.evaluate(async modulePath => {
          const { MetroBrowserNotifications, readMetroNotificationActivation } = await import(modulePath);
          const installed = await navigator.serviceWorker.register('./notification-worker.js');
          try {
            const registration = await navigator.serviceWorker.ready;
            const host = new MetroBrowserNotifications(registration);
            const id = 'metro-system-notification';
            const result = await host.publish({ id, title: 'Metro notice', destination: {
              href: './notification-host.html?from=notice', parameters: { record: 'one' },
            } });
            const [notice] = await registration.getNotifications({ tag: id });
            const activation = readMetroNotificationActivation(notice, registration.scope);
            const pathname = activation && new URL(activation.destination.href).pathname;
            await host.dismiss(id);
            const remaining = (await registration.getNotifications({ tag: id })).length;
            return { result, hasNotice: !!notice, kind: activation?.kind, pathname, remaining };
          } finally {
            await installed.unregister();
          }
        }, new URL('/dist/shell-host.js', url).href);
      });
    } finally {
      await context.clearPermissions();
    }
  },

  async editorExample({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/examples/editor/', page.url()).href);
      const open = demo.getByRole('button', { name: 'Открыть редактор' });
      await open.click();
      const text = demo.getByRole('textbox', { name: 'Текст заметки' });
      const status = demo.locator('#status');
      await text.fill('Новая заметка о маршруте');
      await text.press('Control+s');
      await status.getByText('Сохранено · Северный маршрут').waitFor();

      await demo.getByLabel('Документ', { exact: true }).selectOption('garden');
      await text.fill('Новая заметка о саде');
      await demo.getByRole('button', { name: 'Ещё', exact: true }).click();
      await demo.getByRole('button', { name: 'Сохранить', exact: true }).click();
      await status.getByText('Сохранено · Городской сад').waitFor();
      await demo.getByLabel('Документ', { exact: true }).selectOption('north');
      const activeDocumentSaved = await text.inputValue() === 'Новая заметка о маршруте';

      await text.fill('Незавершённая заметка');
      await text.press('Alt');
      await demo.locator('#tips kbd').waitFor();
      await text.press('Escape');
      await demo.locator('#tips').waitFor({ state: 'hidden' });
      const select = demo.getByRole('button', { name: 'Выбрать заметки' });
      await select.click();
      await demo.getByRole('button', { name: 'Категория', exact: true }).click();
      const category = demo.getByRole('dialog', { name: 'Категории' });
      await category.waitFor();
      await demo.locator('#categories').getByRole('button', { name: 'Назад', exact: true }).click();
      await category.waitFor({ state: 'hidden' });
      const pickerFirst = await select.getAttribute('aria-pressed') === 'true';

      const back = demo.locator('.tools [data-back]');
      await back.click();
      const modeSecond = await select.getAttribute('aria-pressed') === 'false';
      await back.click();
      const confirmation = demo.getByRole('dialog', { name: 'Выйти из редактора?' });
      await confirmation.waitFor();
      const stay = demo.locator('#confirm').getByRole('button', { name: 'Остаться' });
      await stay.press('Control+s');
      await stay.click();
      await confirmation.waitFor({ state: 'hidden' });
      await back.click();
      await demo.locator('#confirm').getByRole('button', { name: 'Выйти', exact: true }).click();
      await demo.waitForFunction(() => document.activeElement?.id === 'open');
      await open.click();
      return { activeDocumentSaved, pickerFirst, modeSecond, shortcutBlocked: await text.inputValue() === 'Новая заметка о маршруте' };
    });
  },

  async mediaExample({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(3500);
      await demo.goto(new URL('/examples/media/', page.url()).href);
      const player = demo.locator('metro-media-player');
      await demo.getByRole('grid', { name: 'Записи' }).getByRole('gridcell', { name: 'У озера', exact: true }).click();
      await demo.getByRole('group', { name: 'У озера' }).waitFor();
      await demo.getByRole('button', { name: 'Воспроизвести' }).click();
      await demo.waitForFunction(() => document.querySelector('metro-media-player')?.state.position > 0);
      await demo.getByRole('button', { name: 'Пауза' }).click();
      await player.evaluate(element => { element.verifiedElement = element.media; });
      await demo.getByRole('checkbox', { name: 'Использовать управление браузера' }).check();
      const preservedPlayback = await player.evaluate(element => element.media === element.verifiedElement
        && element.media.controls && element.state.position > 0);
      await demo.getByRole('button', { name: 'Создать уведомление о записи' }).click();
      const toast = demo.locator('metro-toast');
      const opened = toast.getByRole('button', { name: 'Открыть' });
      await opened.click();
      await opened.waitFor({ state: 'hidden' });
      const history = demo.locator('metro-notification-center').getByRole('button', { name: 'Открыть У озера' });
      const notificationPreserved = await history.isVisible();
      await demo.getByRole('button', { name: 'Увеличить' }).click();
      return {
        preservedPlayback, notificationPreserved,
        zoom: await demo.locator('metro-multi-scale-image').evaluate(element => element.view.zoom),
      };
    });
  },

  async compactMediaStack({ context, page }) {
    return withPage(context, async demo => {
      await demo.setViewportSize({ width: 305, height: 500 });
      await demo.goto(new URL('/examples/media/', page.url()).href);
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const toggle = demo.getByRole('checkbox', { name: 'Использовать управление браузера' });
      await toggle.waitFor();
      const layout = await demo.locator('metro-stack-panel').evaluate(panel => {
        const wordsFit = text => Array.from(text.textContent.matchAll(/\S+/gu)).every(word => {
          const range = document.createRange();
          range.setStart(text, word.index);
          range.setEnd(text, word.index + word[0].length);
          return range.getClientRects().length === 1;
        });
        const title = document.querySelector('metro-text-block[level="1"]');
        const barTitle = document.querySelector('metro-title-bar').shadowRoot.querySelector('[part="title"]');
        const checkbox = panel.querySelector('#native');
        const mark = checkbox.shadowRoot.querySelector('[part="indicator"]').getBoundingClientRect();
        const label = checkbox.shadowRoot.querySelector('[part="label"]').getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        const children = [...panel.children].map(child => child.getBoundingClientRect()).filter(child => child.height);
        return { titleFits: wordsFit(title.firstChild), barFits: barTitle.scrollWidth <= barTitle.clientWidth + 1,
          labelFits: wordsFit(checkbox.firstChild), actionFits: wordsFit(panel.querySelector('#announce').firstChild),
          indicatorAboveLabel: mark.bottom <= label.top,
          childrenStacked: children.every((child, index) => child.left >= bounds.left && child.right <= bounds.right + 1 &&
            (index === 0 || child.top >= children[index - 1].bottom)) };
      });
      await toggle.press('Space');
      const nativeEnabled = await demo.locator('#recording').evaluate(player => player.media.controls);
      return { ...layout, nativeEnabled };
    });
  },

  async mediaFullscreen({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(3500);
      await demo.goto(new URL('/tests/fixtures/media-fullscreen.html', page.url()).href);
      const player = demo.locator('metro-media-player');
      await demo.waitForFunction(() => document.querySelector('metro-media-player')?.state.duration > 0);
      await player.evaluate(element => {
        element.verifiedElement = element.media;
        element.seek(.5);
      });
      await demo.getByRole('button', { name: 'Full screen', exact: true }).click();
      await demo.getByRole('button', { name: 'Exit full screen' }).waitFor();
      const entered = await player.evaluate(element => !!element.shadowRoot.fullscreenElement && element.media === element.verifiedElement);
      await demo.getByRole('button', { name: 'Exit full screen' }).click();
      await demo.getByRole('button', { name: 'Full screen', exact: true }).waitFor();
      return {
        entered,
        preserved: await player.evaluate(element => !element.shadowRoot.fullscreenElement
          && element.media === element.verifiedElement && Math.abs(element.state.position - .5) < .03),
      };
    });
  },

  async mailBack({ context, page }, method) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/examples/mail/', page.url()).href);
      const pivot = demo.locator('#mail-pivot');
      await pivot.getByRole('tab', { name: 'Flagged' }).click();
      await demo.getByRole('group', { name: 'Flagged actions' }).waitFor();
      const list = demo.locator('[data-mail-list="flagged"]');
      const letter = list.locator('[data-message-id="ridge-signal"]');
      await letter.scrollIntoViewIfNeeded();
      const saved = await list.evaluate(element => element.scrollTop);
      await letter.click();
      const title = demo.locator('#message-title');
      await title.waitFor();
      const detailFocused = await title.evaluate(element => element === document.activeElement);

      if (method === 'button') await demo.locator('[data-mail-back]').click();
      else await demo.goBack();

      await demo.waitForFunction(() => document.activeElement?.dataset.messageId === 'ridge-signal');
      return {
        detailFocused,
        selected: await pivot.evaluate(element => element.value),
        scrollRestored: saved > 0 && await list.evaluate(element => element.scrollTop) === saved,
        focused: await letter.evaluate(element => element === document.activeElement),
        actionsVisible: await demo.getByRole('group', { name: 'Flagged actions' }).isVisible(),
      };
    });
  },

  async mailCommand({ context, page }) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/examples/mail/', page.url()).href);
      await demo.locator('#mail-pivot').getByRole('tab', { name: 'Flagged' }).click();
      const bar = demo.getByRole('group', { name: 'Flagged actions' });
      const more = bar.getByRole('button', { name: 'More commands' });
      await more.click();
      await bar.getByRole('button', { name: 'Clear these flags' }).click();
      const empty = demo.locator('[data-mail-list="flagged"]').getByText('No flagged messages.');
      await empty.waitFor();
      return {
        empty: await empty.isVisible(),
        status: await demo.getByRole('status').textContent(),
        focused: await more.evaluate(element => element === element.getRootNode().activeElement),
      };
    });
  },

  async startLink({ context, page }) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/examples/start/', page.url()).href);
      const [linked] = await Promise.all([
        context.waitForEvent('page'),
        demo.getByRole('link', { name: 'Mail', exact: true }).click({ modifiers: ['ControlOrMeta'] }),
      ]);
      try {
        await linked.waitForURL('**/examples/mail/');
        return {
          original: new URL(demo.url()).pathname,
          opened: new URL(linked.url()).pathname,
        };
      } finally {
        await linked.close();
      }
    });
  },

  async settingsForm({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(3500);
      await demo.goto(new URL('/examples/controls/', page.url()).href);
      await demo.getByRole('radio', { name: 'Вручную' }).check();
      await demo.getByRole('checkbox', { name: 'Предпросмотр писем' }).uncheck();
      await demo.getByRole('button', { name: 'Сохранить' }).click();
      const status = demo.getByRole('status').filter({ hasText: 'Проверка почты: ручная. Предпросмотр: выключен.' });
      await status.waitFor();

      const more = demo.getByRole('button', { name: 'Ещё', exact: true });
      await more.click();
      await demo.getByRole('menuitem', { name: 'Восстановить настройки' }).click();
      const dialog = demo.getByRole('dialog', { name: 'Восстановить настройки?' });
      await dialog.waitFor();
      const cancel = demo.getByRole('button', { name: 'Отмена', exact: true });
      const cancelFocused = await cancel.evaluate(element => element === document.activeElement);
      await demo.getByRole('button', { name: 'Восстановить', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      return {
        cancelFocused,
        focusReturned: await more.evaluate(element => element === element.getRootNode().activeElement),
        radioReset: await demo.getByRole('radio', { name: 'Автоматически' }).isChecked(),
        checkboxReset: await demo.getByRole('checkbox', { name: 'Предпросмотр писем' }).isChecked(),
        resultHidden: !await demo.getByRole('status', { name: '' }).isVisible(),
      };
    });
  },

  async settingsMenuWrapping({ context, page }) {
    return withPage(context, async demo => {
      await demo.setViewportSize({ width: 375, height: 667 });
      await demo.goto(new URL('/examples/controls/', page.url()).href);
      await demo.locator('metro-menu-flyout').evaluate(async element => {
        document.documentElement.style.fontSize = '200%';
        const style = document.createElement('style');
        style.textContent = `
          html { scrollbar-gutter: stable; }
          metro-menu-flyout::part(surface) {
            min-inline-size: 0;
            max-inline-size: 330px;
            max-block-size: 10rem;
            scrollbar-gutter: stable;
          }
        `;
        document.head.append(style);
        element.commands = [
          { id: 'selected', label: 'Выбранная настройка' },
          ...Array.from({ length: 11 }, (_, index) => ({
            id: `setting-${index}`, label: `Настройка ${index + 1}`,
          })),
        ];
        await element.updateComplete;
      });
      const more = demo.getByRole('button', { name: 'Ещё', exact: true });
      const trigger = demo.getByRole('button', { name: 'О синхронизации', exact: true });
      await more.press('Enter');
      const menu = demo.getByRole('menu', { name: 'Действия с настройками' });
      const item = menu.getByRole('menuitem', { name: 'Выбранная настройка' });
      const wordLineCounts = element => {
        const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const range = document.createRange();
        return Array.from(text.textContent.matchAll(/\S+/gu), word => {
          range.setStart(text, word.index);
          range.setEnd(text, word.index + word[0].length);
          return range.getClientRects().length;
        });
      };
      const lines = await item.locator('[part="label"]').evaluate(wordLineCounts);
      const scrolls = await menu.evaluate(element => element.scrollHeight > element.clientHeight);
      await item.press('Escape');
      return {
        menuWordLines: lines,
        triggerWordLines: await trigger.evaluate(wordLineCounts),
        scrolls,
        focusReturned: await more.evaluate(element => element === element.getRootNode().activeElement),
      };
    });
  },

  async workspaceCompact({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4000);
      await demo.setViewportSize({ width: 305, height: 460 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/examples/workspace/', page.url()).href);
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const projects = demo.getByRole('tab', { name: 'Проекты', exact: true });
      const notebook = demo.getByRole('tab', { name: 'Блокнот', exact: true });
      await projects.focus();
      await demo.keyboard.press('ArrowRight');
      const manualSelection = await notebook.evaluate(tab => tab.matches(':focus')) &&
        await projects.getAttribute('aria-selected') === 'true';
      await demo.keyboard.press('Enter');
      const draft = demo.getByRole('textbox', { name: 'Черновик блокнота' });
      const text = 'Черновик сохранится';
      await draft.fill(text);
      await demo.keyboard.press('Control+F4');
      const dialog = demo.getByRole('dialog', { name: 'Закрыть блокнот?' });
      await dialog.waitFor();
      const heading = dialog.getByRole('heading', { name: 'Закрыть блокнот?' });
      const startsAtHeading = await heading.evaluate(element => element.matches(':focus')) &&
        await dialog.evaluate(element => element.scrollTop === 0);
      const confirmation = demo.locator('#confirm');
      const stay = confirmation.getByRole('button', { name: 'Остаться' });
      const close = confirmation.getByRole('button', { name: 'Закрыть', exact: true });
      const lineCount = locator => locator.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      });
      const [headingLines, stayLines, closeLines] = await Promise.all([lineCount(heading), lineCount(stay), lineCount(close)]);
      await demo.keyboard.press('Tab');
      const safeActionFocused = await stay.evaluate(button => button.matches(':focus'));
      await demo.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      const draftRestored = await draft.inputValue() === text && await draft.evaluate(field => field.matches(':focus'));
      await demo.keyboard.press('Control+F4');
      await close.press('Enter');
      await notebook.waitFor({ state: 'detached' });
      const selectedFallback = await projects.getAttribute('aria-selected') === 'true';
      const pageFits = await demo.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth);
      return {
        manualSelection, headingLines, actionLines: [stayLines, closeLines], startsAtHeading, safeActionFocused,
        draftRestored, selectedFallback, pageFits,
      };
    });
  },

  async workspaceTransfer({ context, page }) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/examples/workspace/', page.url()).href);
      await demo.getByRole('tab', { name: 'Блокнот' }).click();
      await demo.getByRole('textbox', { name: 'Черновик блокнота' }).fill('Записано перед переносом');
      const [detached] = await Promise.all([
        context.waitForEvent('page'),
        demo.getByRole('button', { name: 'Открыть блокнот в новом окне' }).click(),
      ]);
      try {
        const note = detached.getByRole('textbox', { name: 'Черновик блокнота' });
        await note.waitFor();
        const draftMoved = await note.inputValue();
        await detached.getByRole('button', { name: 'Закрыть Блокнот' }).click();
        await detached.getByRole('button', { name: 'Остаться' }).click();
        const keptOpen = await note.isVisible();
        await note.fill('Дополнено в новом окне');
        await Promise.all([
          detached.waitForEvent('close'),
          detached.getByRole('button', { name: 'Вернуть в рабочую область' }).click(),
        ]);
        const draftReturned = await demo.getByRole('textbox', { name: 'Черновик блокнота' }).inputValue();
        const [secondWindow] = await Promise.all([
          context.waitForEvent('page'),
          demo.getByRole('button', { name: 'Открыть блокнот в новом окне' }).click(),
        ]);
        try {
          const secondNote = secondWindow.getByRole('textbox', { name: 'Черновик блокнота' });
          await secondNote.fill('Сохранено после закрытия окна');
        } finally {
          await secondWindow.close();
        }
        const draftRecovered = await demo.getByRole('textbox', { name: 'Черновик блокнота' }).inputValue();
        return { draftMoved, keptOpen, draftReturned, draftRecovered };
      } finally {
        if (!detached.isClosed()) await detached.close();
      }
    });
  },

  async workspaceReorder({ context, page }) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/examples/workspace/', page.url()).href);
      const documents = demo.getByRole('tablist', { name: 'Документы' });
      const projects = documents.getByRole('tab', { name: 'Проекты' });
      const notebook = documents.getByRole('tab', { name: 'Блокнот' });
      await notebook.dragTo(projects, { targetPosition: { x: 5, y: 12 } });
      return {
        order: await documents.getByRole('tab').allTextContents(),
        selected: await projects.getAttribute('aria-selected'),
      };
    });
  },

  async workspaceTearOut({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(5500);
      await demo.goto(new URL('/examples/workspace/', page.url()).href);
      const tab = demo.getByRole('tab', { name: 'Блокнот' });
      const field = demo.getByRole('textbox', { name: 'Черновик блокнота' });
      const zone = demo.locator('#detach-zone');
      await tab.click();
      await field.fill('Черновик остаётся при отказе и переезжает при подтверждении');

      await demo.evaluate(() => {
        window.workspaceOriginalOpen = window.open;
        window.open = () => null;
      });
      await tab.dragTo(zone);
      await demo.getByText('Браузер заблокировал новое окно.').waitFor();
      const afterDenied = await field.inputValue();
      await demo.evaluate(() => { window.open = window.workspaceOriginalOpen; });

      const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 5500 }),
        tab.dragTo(zone),
      ]);
      try {
        const newField = popup.getByRole('textbox', { name: 'Черновик блокнота' });
        await newField.waitFor();
        await tab.waitFor({ state: 'detached' });
        await popup.waitForFunction(() => {
          const field = document.activeElement;
          return field?.dataset.metroFocus === 'notebook-draft' && field.shadowRoot?.activeElement?.matches('textarea');
        });
        const focusMoved = await newField.evaluate(element => element.getRootNode().activeElement === element);
        return { afterDenied, moved: await newField.inputValue(), focusMoved };
      } finally {
        if (!popup.isClosed()) await popup.close();
      }
    });
  },

  async workspaceDragAcrossWindows({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(5000);
      await demo.goto(new URL('/examples/workspace/', page.url()).href);
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        demo.getByRole('button', { name: 'Открыть блокнот в новом окне' }).click(),
      ]);
      const source = await context.newCDPSession(popup);
      const target = await context.newCDPSession(demo);
      try {
        const draft = popup.getByRole('textbox', { name: 'Черновик блокнота' });
        await draft.fill('Вернуть в начало ряда');
        const tab = popup.getByRole('tab', { name: 'Блокнот' });
        const from = await tab.boundingBox();
        const to = await demo.getByRole('tab', { name: 'Проекты' }).boundingBox();
        const start = { x: Math.round(from.x + from.width / 2), y: Math.round(from.y + from.height / 2) };
        const point = { x: Math.round(to.x + 6), y: Math.round(to.y + to.height / 2) };

        await source.send('Input.setInterceptDrags', { enabled: true });
        const caught = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Chromium did not start the native tab drag')), 4000);
          source.once('Input.dragIntercepted', event => { clearTimeout(timeout); resolve(event.data); });
        });
        const [data] = await Promise.all([caught, (async () => {
          await source.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...start });
          await source.send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, x: start.x + 24, y: start.y });
        })()]);
        await target.send('Input.dispatchDragEvent', { type: 'dragEnter', data, ...point });
        await target.send('Input.dispatchDragEvent', { type: 'dragOver', data, ...point });
        await demo.locator('#documents [data-drop-before=""]').waitFor();
        await Promise.all([
          popup.waitForEvent('close'),
          target.send('Input.dispatchDragEvent', { type: 'drop', data, ...point }),
        ]);
        const restored = demo.getByRole('textbox', { name: 'Черновик блокнота' });
        await restored.waitFor();
        return {
          order: await demo.getByRole('tab').allTextContents(),
          draft: await restored.inputValue(),
          focus: await restored.evaluate(element => element.getRootNode().activeElement === element),
        };
      } finally {
        await Promise.allSettled([source.detach(), target.detach()]);
        if (!popup.isClosed()) await popup.close();
      }
    });
  },

  async pivotTouch({ context, page }, axis) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 },
    });

    try {
      const demo = await mobile.newPage();
      await demo.goto(new URL('/tests/fixtures/components.html', page.url()).href);
      const pivot = demo.locator('#folders');
      await pivot.getByRole('tab', { name: 'Inbox' }).waitFor();
      const cdp = await mobile.newCDPSession(demo);
      const scroll = demo.locator('#scroll');
      await scroll.evaluate(element => {
        window.changes = [];
        document.addEventListener('metro-change', event => window.changes.push(event.detail.value));
        window.scrolled = new Promise(resolve => element.addEventListener('scrollend', resolve, { once: true }));
      });

      if (axis === 'horizontal') {
        const box = await pivot.getByRole('link', { name: 'First letter' }).boundingBox();
        const start = { x: box.x + box.width * 0.7, y: box.y + box.height / 2 };
        await swipe(cdp, start, { x: start.x - 126, y: start.y + 2 });
        await pivot.getByRole('tab', { name: 'Sent', selected: true }).waitFor();
      } else {
        const box = await scroll.boundingBox();
        const start = { x: box.x + box.width / 2, y: box.y + box.height * 0.8 };
        await swipe(cdp, start, { x: start.x + 3, y: start.y - 140 });
        await demo.waitForFunction(() => document.querySelector('#scroll').scrollTop > 40);
        await demo.evaluate(() => window.scrolled.then(() => undefined));
      }

      const result = {
        selected: await pivot.evaluate(element => element.value),
        changes: await demo.evaluate(() => window.changes),
        hash: new URL(demo.url()).hash,
        scrolled: await scroll.evaluate(element => element.scrollTop),
      };

      if (axis === 'vertical') {
        const box = await scroll.boundingBox();
        await demo.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await demo.waitForURL(/#opened$/);
        result.tapHash = new URL(demo.url()).hash;
      }
      return result;
    } finally {
      await mobile.close();
    }
  },

  async pivotResizeTouch({ context, page }) {
    const mobile = await context.browser().newContext({ hasTouch: true, isMobile: true,
      viewport: { width: 390, height: 844 } });
    try {
      const demo = await mobile.newPage();
      await demo.route('**/dist/metro-ui.js', route => route.fulfill({ contentType: 'text/javascript',
        body: "import '/src/pivot.ts'; import '/src/command-bar.ts'; import '/src/tile.ts';" }));
      await demo.goto(new URL('/tests/fixtures/components.html', page.url()).href);
      const pivot = demo.locator('#folders');
      const viewport = pivot.locator('[part="viewport"]');
      const letter = pivot.getByRole('link', { name: 'First letter' });
      const box = await letter.boundingBox();
      const start = { x: Math.round(box.x + box.width * .7), y: Math.round(box.y + box.height / 2) };
      const end = { x: start.x - 126, y: start.y };
      await viewport.evaluate(element => {
        window.pivotChanges = [];
        document.querySelector('#folders').addEventListener('metro-change', event => window.pivotChanges.push(event.detail.value));
        element.addEventListener('pointermove', event => { window.pivotLastX = Math.round(event.clientX); });
        window.pivotReleased = new Promise(resolve => element.addEventListener('pointerup', () => resolve(), { once: true }));
      });
      const cdp = await mobile.newCDPSession(demo);
      let before, resized;
      const read = () => viewport.evaluate(element => ({ width: element.clientWidth,
        dragging: element.hasAttribute('data-dragging'), offset: element.style.getPropertyValue('--_metro-pivot-drag') }));
      await swipe(cdp, start, end, 'touchEnd', async () => {
        await demo.waitForFunction(x => window.pivotLastX === x, end.x);
        before = await read();
        await pivot.evaluate(element => { element.style.inlineSize = `${element.clientWidth - 60}px`; });
        resized = await read();
      });
      await demo.evaluate(() => window.pivotReleased);
      const value = await pivot.evaluate(element => element.value);
      const changes = await demo.evaluate(() => window.pivotChanges);
      const released = await read();
      return { before, resized, released, value, changes, hash: new URL(demo.url()).hash };
    } finally {
      await mobile.close();
    }
  },

  async toggleSwitchTouch({ context, page }) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 },
    });
    try {
      const demo = await mobile.newPage();
      await demo.goto(new URL('/tests/fixtures/switch-touch.html', page.url()).href);
      const toggle = demo.locator('metro-toggle-switch');
      const track = toggle.locator('[part="track"]');
      await track.waitFor();
      await toggle.evaluate(element => {
        window.changes = [];
        element.addEventListener('change', () => window.changes.push(element.checked));
      });
      const state = () => toggle.evaluate(element => ({
        checked: element.checked, changes: window.changes, scrollTop: document.querySelector('#scroll').scrollTop,
      }));
      const session = await mobile.newCDPSession(demo);
      const box = await track.boundingBox();
      const point = { x: box.x + 6, y: box.y + box.height / 2 };
      await swipe(session, point, { x: point.x + 53, y: point.y });
      const horizontal = await state();
      const current = await track.boundingBox();
      const start = { x: current.x + 6, y: current.y + current.height / 2 };
      await swipe(session, start, { x: start.x, y: start.y - 125 });
      await demo.waitForFunction(() => document.querySelector('#scroll').scrollTop > 20);
      return { horizontal, vertical: await state() };
    } finally {
      await mobile.close();
    }
  },

  async flipViewNestedTouch({ context, page }) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 },
    });
    try {
      const demo = await mobile.newPage();
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/tests/fixtures/flip-touch.html', page.url()).href);
      const view = demo.locator('metro-flip-view');
      const list = view.locator('[data-value="one"]');
      const button = list.getByRole('button', { name: 'Open photo' });
      await button.waitFor();
      await view.evaluate(element => {
        const trace = { values: [], clicks: 0 };
        window.flipTrace = trace;
        element.addEventListener('metro-change', event => trace.values.push(event.detail.value));
        element.querySelector('button').addEventListener('click', () => trace.clicks++);
      });
      const state = () => view.evaluate(element => ({ ...window.flipTrace, value: element.value,
        hub: document.querySelector('metro-hub').value,
        offset: element.shadowRoot.querySelector('[part="viewport"]').scrollLeft,
        scrollTop: element.querySelector('[data-value="one"]').scrollTop,
      }));
      const setSwipeDisabled = disabled => view.evaluate(async (element, value) => {
        element.swipeDisabled = value;
        await element.updateComplete;
      }, disabled);
      const session = await mobile.newCDPSession(demo);
      const drag = async (target, dx, dy, beforeFinish) => {
        const rect = await target.boundingBox();
        const start = { x: rect.x + rect.width * .8, y: rect.y + rect.height * .75 };
        await swipe(session, start, { x: start.x + dx, y: start.y + dy }, 'touchEnd', beforeFinish);
      };
      await drag(list, 0, -108);
      await demo.waitForFunction(() => document.querySelector('[data-value="one"]').scrollTop > 45);
      const vertical = await state();
      await setSwipeDisabled(true);
      await drag(list, -185, 0);
      const disabled = await state();
      await setSwipeDisabled(false);
      await list.evaluate(element => element.scrollTop = 0);
      let preview;
      await drag(button, -240, 0, async () => {
        await demo.waitForFunction(() => {
          const surface = document.querySelector('metro-flip-view').shadowRoot.querySelector('[part="viewport"]');
          return surface.scrollLeft > surface.clientWidth / 2;
        });
        preview = await state();
      });
      await demo.waitForFunction(() => window.flipTrace.values[0] === 'two');
      const horizontal = await state();
      await setSwipeDisabled(true);
      await view.getByRole('button', { name: 'Previous item' }).click();
      await demo.waitForFunction(() => window.flipTrace.values[1] === 'one');
      const byButton = await state();

      await setSwipeDisabled(false);
      await view.evaluate(async element => {
        const slide = document.createElement('div');
        slide.dataset.value = 'three';
        slide.textContent = 'Third photo';
        element.append(slide);
        await element.updateComplete;
      });
      const choose = value => view.evaluate(async (element, next) => {
        element.value = next;
        await element.updateComplete;
      }, value);
      await drag(button, -240, 0, () => choose('three'));
      const programmatic = await state();
      await choose('one');
      await drag(button, -240, 0, async () => {
        await view.evaluate(element => element.focus({ preventScroll: true }));
        await demo.keyboard.press('End');
      });
      await demo.waitForFunction(() => window.flipTrace.values.length > 2);
      const keyboard = await state();
      await choose('one');
      await button.click();
      return { vertical, disabled, preview, horizontal, button: byButton, programmatic, keyboard, click: await state() };
    } finally {
      await mobile.close();
    }
  },

  async sliderTouch({ context, page }) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 },
    });

    try {
      const demo = await mobile.newPage();
      await demo.goto(new URL('/tests/fixtures/numeric-touch.html', page.url()).href);
      const slider = demo.locator('metro-slider');
      const track = slider.locator('[part="track"]');
      const box = await track.boundingBox();
      const start = { x: box.x + box.width * 0.2, y: box.y + box.height / 2 };
      const end = { x: box.x + box.width * 0.8, y: start.y + 2 };
      await slider.evaluate(element => {
        window.events = [];
        for (const type of ['input', 'change']) {
          element.addEventListener(type, () => window.events.push([type, element.value]));
        }
      });
      const cdp = await mobile.newCDPSession(demo);
      const state = () => slider.evaluate(element => ({
        value: element.value,
        scrolled: document.querySelector('#scroll').scrollTop,
        events: window.events,
      }));

      await swipe(cdp, start, end, 'touchCancel');
      const canceled = await state();
      await swipe(cdp, start, end);
      const horizontal = await state();
      await swipe(cdp, start, { x: start.x + 2, y: start.y - 125 });
      await demo.waitForFunction(() => document.querySelector('#scroll').scrollTop > 40);
      return { canceled, horizontal, vertical: await state() };
    } finally {
      await mobile.close();
    }
  },

  async collectionTouch({ context, page }, control) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 },
    });
    try {
      const demo = await mobile.newPage();
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/tests/fixtures/collection-touch.html', page.url()).href);
      const viewport = demo.getByRole('region', { name: 'Entries list' });
      const swipeRow = demo.locator('metro-swipe-control');
      const link = demo.getByRole('link', { name: 'Open entry' });
      const inner = demo.locator('#nested-scroll');
      await link.waitFor();
      const cdp = await mobile.newCDPSession(demo);
      const result = () => demo.evaluate(() => window.readState());
      const point = async (element, x = .66, y = .5) => {
        const box = await element.boundingBox();
        return { x: Math.round(box.x + box.width * x), y: Math.round(box.y + box.height * y) };
      };

      if (control === 'swipe') {
        let start = await point(link);
        await swipe(cdp, start, { x: start.x - 120, y: start.y + 2 });
        await demo.waitForFunction(() => document.querySelector('metro-swipe-control').openSide === 'end');
        const opened = await result();

        start = await point(link, .7);
        await swipe(cdp, start, { x: start.x + 125, y: start.y + 2 }, 'touchCancel');
        const canceled = await result();
        await swipeRow.getByRole('button', { name: 'Archive' }).tap();
        const archived = await result();

        await swipeRow.evaluate(async element => { element.mode = 'execute'; await element.updateComplete; });
        start = await point(link, .85);
        await swipe(cdp, start, { x: start.x - 185, y: start.y + 2 });
        const executed = await result();
        let readyBeforeReplacement, draggingAfterReplacement;
        await swipe(cdp, start, { x: start.x - 185, y: start.y + 2 }, 'touchEnd', async () => {
          ({ readyBeforeReplacement, draggingAfterReplacement } = await swipeRow.evaluate(async element => {
            const viewport = element.shadowRoot.querySelector('[part="viewport"]');
            const readyBeforeReplacement = viewport.hasAttribute('data-ready');
            element.actions = [{ id: 'delete', label: 'Delete', destructive: true }];
            await element.updateComplete;
            return { readyBeforeReplacement, draggingAfterReplacement: viewport.hasAttribute('data-dragging') };
          }));
        });
        const replacedCommands = await result();

        await swipeRow.evaluate(async element => { element.mode = 'reveal'; await element.updateComplete; });
        await swipe(cdp, start, { x: start.x - 185, y: start.y + 2 }, 'touchEnd', () =>
          swipeRow.evaluate(async element => { element.mode = 'execute'; await element.updateComplete; }));
        const changedMode = await result();
        await swipe(cdp, start, { x: start.x - 185, y: start.y + 2 }, 'touchEnd', () =>
          swipeRow.evaluate(async element => { element.value = 'replacement'; await element.updateComplete; }));
        const replaced = await result();
        await link.tap();
        // Chromium can suppress the first CDP tap after a drag on an ordinary link too.
        if (!new URL(demo.url()).hash) await link.tap();
        await demo.waitForURL(/#opened$/);
        return { opened, canceled, archived, executed, replacedCommands, changedMode, replaced,
          readyBeforeReplacement, draggingAfterReplacement, tapped: await result() };
      }

      const start = await point(link, .5);
      await swipe(cdp, start, { x: start.x + 1, y: start.y - 115 });
      await demo.waitForFunction(() => document.querySelector('metro-refresh-container').scrollViewport.scrollTop > 40);
      const scrolled = await result();
      const inside = await point(viewport, .4, .35);
      await swipe(cdp, inside, { x: inside.x + 1, y: inside.y + 110 });
      const mid = await result();

      await viewport.evaluate(element => { element.scrollTop = 0; });
      await demo.waitForFunction(() => document.querySelector('metro-refresh-container').scrollViewport.hasAttribute('data-pull-enabled'));
      const pull = await point(link, .5);
      await swipe(cdp, pull, { x: pull.x + 1, y: pull.y + 118 }, 'touchCancel');
      const canceled = await result();
      await swipe(cdp, pull, { x: pull.x + 1, y: pull.y + 118 });
      const refreshed = await result();
      await swipe(cdp, pull, { x: pull.x + 1, y: pull.y + 118 });
      const busy = await result();

      await demo.evaluate(async () => {
        const refresh = document.querySelector('metro-refresh-container');
        refresh.refreshing = false;
        await refresh.updateComplete;
      });
      const nestedStart = await point(inner, .6, .7);
      await swipe(cdp, nestedStart, { x: nestedStart.x + 1, y: nestedStart.y - 74 });
      await demo.waitForFunction(() => document.querySelector('#nested-scroll').scrollTop > 20);
      return { scrolled, mid, canceled, refreshed, busy, nested: await result() };
    } finally {
      await mobile.close();
    }
  },

  async collectionReducedMotion({ context, page }) {
    return withPage(context, async demo => {
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/tests/fixtures/collection-touch.html', page.url()).href);
      await demo.getByRole('link', { name: 'Open entry' }).waitFor();
      return demo.evaluate(() => {
        const row = document.querySelector('metro-swipe-control');
        const refresh = document.querySelector('metro-refresh-container');
        refresh.style.setProperty('--metro-motion', '180ms');
        const surfaces = [row.shadowRoot.querySelector('[part="content"]'), refresh.shadowRoot.querySelector('[part="indicator"]')];
        return {
          matched: matchMedia('(prefers-reduced-motion: reduce)').matches,
          durations: surfaces.map(element => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(Number.parseFloat))),
        };
      });
    });
  },

  async reorderDrag({ context, page }) {
    return withPage(context, async demo => {
      await demo.goto(new URL('/tests/fixtures/reorder-list.html', page.url()).href);
      const source = demo.getByRole('button', { name: 'Move Alpha' });
      const target = demo.locator('[data-reorder-key="c"]');
      await source.dragTo(target, { targetPosition: { x: 12, y: 5 } });
      const state = () => demo.evaluate(() => window.readOrder());
      await demo.waitForFunction(() => window.readOrder().commits.length === 1);
      const dropped = await state();
      await source.dragTo(demo.locator('#outside'));
      const canceled = await state();

      const src = await source.boundingBox();
      const dest = await target.boundingBox();
      await demo.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
      await demo.mouse.down();
      await demo.mouse.move(dest.x + 12, dest.y + dest.height - 5, { steps: 12 });
      await demo.mouse.move(dest.x + 11, dest.y + dest.height - 4);
      await demo.waitForFunction(() => window.readOrder().proposal?.before === null);
      await demo.locator('metro-reorder-list').evaluate(async list => {
        list.items = list.items.filter(item => item.value !== 'c');
        await list.updateComplete;
      });
      await demo.mouse.up();
      return { dropped, canceled, stale: await state() };
    });
  },

  async lockablePivotTouch({ context, page }) {
    const mobile = await context.browser().newContext({
      hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 },
    });
    try {
      const demo = await mobile.newPage();
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/tests/fixtures/lockable-pivot-touch.html', page.url()).href);
      const inner = demo.locator('#inner');
      const alpha = demo.locator('#alpha');
      await alpha.waitFor();
      const cdp = await mobile.newCDPSession(demo);
      const state = () => demo.evaluate(() => window.readPivots());
      const point = async locator => {
        const box = await locator.boundingBox();
        return { x: Math.round(box.x + box.width * .7), y: Math.round(box.y + box.height / 2) };
      };
      const left = start => ({ x: start.x - 125, y: start.y + 1 });
      let start = await point(alpha);
      await swipe(cdp, start, left(start));
      const locked = await state();
      await inner.evaluate(async pivot => { pivot.locked = false; await pivot.updateComplete; });
      start = await point(alpha);
      await swipe(cdp, start, left(start));
      await demo.getByRole('tab', { name: 'Beta', selected: true }).waitFor();
      const unlocked = await state();
      start = await point(demo.locator('#beta'));
      let began = false;
      await swipe(cdp, start, left(start), 'touchEnd', async () => {
        began = (await state()).dragging;
        await inner.evaluate(async pivot => { pivot.locked = true; await pivot.updateComplete; });
      });
      const interrupted = await state();
      await inner.evaluate(async pivot => { pivot.locked = false; await pivot.updateComplete; });
      start = await point(demo.locator('#beta'));
      let beganBeforeBriefLock = false;
      await swipe(cdp, start, left(start), 'touchEnd', async () => {
        beganBeforeBriefLock = (await state()).dragging;
        await inner.evaluate(pivot => { pivot.locked = true; pivot.locked = false; });
      });
      return { locked, unlocked, began, interrupted, beganBeforeBriefLock, briefLock: await state() };
    } finally {
      await mobile.close();
    }
  },

  async collectionTransferDrag({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/tests/fixtures/collection-transfer.html', page.url()).href);
      const one = demo.locator('#source').getByRole('button', { name: 'Move One' });
      const destination = demo.locator('#target').locator('[data-reorder-key="three"]');
      await one.dragTo(destination, { targetPosition: { x: 12, y: 6 } });
      await demo.waitForFunction(() => window.readTransfer().moves.length === 1 && window.readTransfer().focus === 'one');
      const dropped = await demo.evaluate(() => window.readTransfer());
      await demo.locator('#source').getByRole('button', { name: 'Move Two' }).dragTo(demo.locator('#outside'));
      return { dropped, canceled: await demo.evaluate(() => window.readTransfer()) };
    });
  },

  async compactCollectionTransfer({ context, page }) {
    return withPage(context, async demo => {
      await demo.setViewportSize({ width: 305, height: 460 });
      await demo.goto(new URL('/examples/collections/', page.url()).href);
      const transfer = demo.locator('#transfer');
      const start = transfer.getByRole('button', { name: 'Transfer', exact: true });
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await transfer.evaluate(element => {
        window.transferRequests = 0;
        element.addEventListener('metro-before-transfer', () => { window.transferRequests++; }, true);
        element.addEventListener('metro-before-transfer', event => {
          event.detail.accept(new Promise(() => {}));
        }, { capture: true, once: true });
      });
      const focusedRowIsVisible = id => demo.locator(id).evaluate(list => {
        const row = list.shadowRoot.activeElement;
        const box = row?.getBoundingClientRect();
        return row?.dataset.reorderHandle === 'field-notes' && box.top >= -1 && box.bottom <= innerHeight + 1;
      });
      await start.press('Enter');
      const cancel = transfer.getByRole('button', { name: 'Cancel transfer' });
      await cancel.waitFor();
      const pendingFocus = await start.evaluate(button => button.matches(':focus'));
      await demo.keyboard.press('Enter');
      const requestsWhilePending = await demo.evaluate(() => window.transferRequests);
      await demo.keyboard.press('Tab');
      const cancelIsNext = await cancel.evaluate(button => button.matches(':focus'));
      await demo.keyboard.press('Escape');
      await cancel.waitFor({ state: 'detached' });
      await demo.waitForFunction(() => document.querySelector('#library').shadowRoot.activeElement?.dataset.reorderHandle === 'field-notes');
      const canceledFocusVisible = await focusedRowIsVisible('#library');
      await start.press('Enter');
      await demo.waitForFunction(() => document.querySelector('#archive').shadowRoot.activeElement?.dataset.reorderHandle === 'field-notes');
      const movedFocusVisible = await focusedRowIsVisible('#archive');
      const labelsFit = await demo.locator('#archive').evaluate(list => {
        return [...list.querySelectorAll('.record-choice')].every(label => {
          const text = label.lastChild;
          const range = document.createRange();
          return Array.from(text.textContent.matchAll(/\S+/g)).every(word => {
            range.setStart(text, word.index);
            range.setEnd(text, word.index + word[0].length);
            return range.getClientRects().length === 1;
          });
        });
      });
      return { pendingFocus, requestsWhilePending, cancelIsNext, canceledFocusVisible, movedFocusVisible, labelsFit };
    });
  },

  async groupedCollectionExample({ context, page }) {
    return withPage(context, async demo => {
      demo.setDefaultTimeout(5000);
      await demo.goto(new URL('/examples/collections/', page.url()).href);
      const transfer = demo.locator('#transfer');
      const library = demo.locator('#library');
      const archive = demo.locator('#archive');
      const queue = demo.locator('#queue');
      await archive.getByRole('checkbox', { name: 'Select Night signal', exact: true }).press('Space');
      await library.getByRole('checkbox', { name: 'Select Field notes', exact: true }).press('Space');
      await transfer.getByRole('checkbox', { name: 'Transfer selected (2)' }).press('Space');
      await transfer.getByRole('combobox', { name: 'Destination' }).press('End');
      await transfer.getByRole('combobox', { name: 'Operation' }).press('End');
      await transfer.getByRole('combobox', { name: 'Position' }).press('End');
      await transfer.evaluate(element => {
        window.batchCommits = [];
        window.batchPreviews = [];
        const report = ({ items, targetGroup, before, operation, input }) => ({
          items: items.map(item => [item.sourceGroup, item.value]), targetGroup, before, operation, input,
        });
        element.addEventListener('metro-transfer-batch-preview', event => window.batchPreviews.push(report(event.detail)));
        element.addEventListener('metro-transfer-batch', event => window.batchCommits.push({ ...report(event.detail),
          targetKeys: event.detail.targetKeys }));
      });
      const read = () => demo.evaluate(() => ({ library: document.querySelector('#library').values,
        archive: document.querySelector('#archive').values, queue: document.querySelector('#queue').values,
        focus: document.querySelector('#queue').shadowRoot.activeElement?.dataset.reorderHandle ?? null,
        commits: window.batchCommits, previews: window.batchPreviews }));

      await transfer.getByRole('button', { name: 'Transfer', exact: true }).press('Enter');
      await queue.getByRole('checkbox', { name: 'Select Field notes (copy)', exact: true }).waitFor();
      await demo.waitForFunction(() => document.querySelector('#queue').shadowRoot.activeElement?.dataset.reorderHandle === 'copy-1');
      const copied = await read();
      const origin = archive.getByRole('button', { name: 'Move Night signal', exact: true });
      const destination = queue.locator('[data-reorder-key="morning-bulletin"]');
      await origin.dragTo(destination, { targetPosition: { x: 12, y: 6 } });
      await demo.waitForFunction(() => window.batchCommits.length === 2 &&
        document.querySelector('#queue').shadowRoot.activeElement?.dataset.reorderHandle === 'night-signal');
      const moved = await read();
      await queue.getByRole('button', { name: 'Move Night signal', exact: true }).dragTo(demo.locator('main > h1'));
      return { copied, moved, canceled: await read() };
    });
  },

  async crossSlideTouch({ context, page }) {
    const mobile = await context.browser().newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });
    try {
      const demo = await mobile.newPage();
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/tests/fixtures/cross-slide-touch.html', page.url()).href);
      const record = demo.getByRole('link', { name: 'Recording' });
      await record.waitFor();
      await record.tap();
      await demo.waitForURL(/#record$/);
      const read = () => demo.evaluate(() => window.readCrossSlide());
      const tapped = await read();
      const cdp = await mobile.newCDPSession(demo);
      const box = await record.boundingBox();
      const start = { x: Math.round(box.x + box.width * .7), y: Math.round(box.y + box.height / 2) };
      await swipe(cdp, start, { x: start.x - 44, y: start.y + 2 });
      const short = await read();
      await swipe(cdp, start, { x: start.x - 125, y: start.y + 2 });
      const over = await read();
      await swipe(cdp, start, { x: start.x - 41, y: start.y + 2 }, 'touchCancel');
      const canceled = await read();
      await swipe(cdp, start, { x: start.x + 1, y: start.y - 145 });
      await demo.waitForFunction(() => document.querySelector('#scroll').scrollTop > 40);
      const scrolled = await read();

      const strip = await demo.locator('#strip').boundingBox();
      const point = { x: Math.round(strip.x + strip.width * .65), y: Math.round(strip.y + strip.height / 2) };
      await swipe(cdp, point, { x: point.x + 2, y: point.y - 45 });
      const across = await read();
      await swipe(cdp, point, { x: point.x - 135, y: point.y + 1 });
      await demo.waitForFunction(() => document.querySelector('#strip').scrollLeft > 40);
      return { tapped, short, over, canceled, scrolled, across, sideways: await read() };
    } finally {
      await mobile.close();
    }
  },

  async mapExample({ context: runner, page }, removePlace) {
    const context = await runner.browser().newContext();
    try {
      return await withPage(context, async demo => {
        demo.setDefaultTimeout(4000);
        const url = new URL('/examples/map/', page.url());
        const engine = context.browser().browserType().name();
        if (engine === 'chromium') {
          const cdp = await context.newCDPSession(demo);
          const { targetInfo } = await cdp.send('Target.getTargetInfo');
          await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied',
            origin: url.origin, browserContextId: targetInfo.browserContextId });
        }
        await demo.addInitScript(engine => {
          window.locationRequests = 0;
          const position = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
          navigator.geolocation.getCurrentPosition = (success, failure, options) => {
            window.locationRequests++;
            if (engine === 'chromium') position(success, failure, options);
            else queueMicrotask(() => failure({ code: 1, message: 'Permission denied' }));
          };
        }, engine);
        await demo.goto(url.href);
        await demo.getByRole('button', { name: 'Open map' }).click();
        const beforePermission = await demo.evaluate(() => window.locationRequests);
        const region = demo.getByRole('region', { name: 'Nearby map' });
        const map = demo.locator('#places-map');
        await demo.getByRole('button', { name: 'My location' }).click();
        await demo.getByText('Location unavailable. Browse the map or choose a place.').waitFor();
        await region.focus();
        await demo.keyboard.press('ArrowRight');
        await demo.getByRole('button', { name: 'Zoom in' }).click();
        const state = () => map.evaluate(element => ({ view: element.view, bounds: element.bounds }));
        const saved = await state();
        const places = demo.getByRole('list', { name: 'Nearby places' });
        await places.getByRole('button', { name: 'Riverside library' }).click();
        const selectedOnMap = await demo.locator('#frame').evaluate(element => element.value);
        await demo.getByRole('button', { name: 'Open place' }).click();
        await demo.getByRole('button', { name: 'Back to map' }).waitFor();
        await map.evaluate((element, remove) => {
          element.view = { latitude: 0, longitude: 0, zoom: 2 };
          if (remove) element.markers = element.markers.filter(marker => marker.id !== 'library');
        }, removePlace);
        await demo.getByRole('button', { name: 'Back to map' }).click();
        if (removePlace) await demo.waitForFunction(() => document.querySelector('#places-map').shadowRoot.activeElement?.dataset.id === 'market');
        else await demo.waitForFunction(() => document.activeElement?.id === 'open-place');
        await demo.waitForFunction(expected => {
          const bounds = document.querySelector('#places-map').bounds;
          return Object.keys(expected).every(key => bounds[key] === expected[key]);
        }, saved.bounds);
        const returned = await state();
        const selected = await map.evaluate(element => element.selected);
        await demo.getByRole('button', { name: 'Back to Explore' }).click();
        await demo.waitForFunction(() => document.activeElement?.id === 'open-map');
        return { beforePermission, requests: await demo.evaluate(() => window.locationRequests), selectedOnMap, saved, returned, selected,
          section: await demo.locator('#hub').evaluate(element => element.value) };
      });
    } finally {
      await context.close();
    }
  },

  async mapExampleTouch({ context, page }) {
    const mobile = await context.browser().newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });
    try {
      const demo = await mobile.newPage();
      demo.setDefaultTimeout(4000);
      await demo.goto(new URL('/examples/map/', page.url()).href);
      const preview = demo.getByRole('button', { name: 'Open map' });
      const hub = demo.locator('#hub');
      const frame = demo.locator('#frame');
      const cdp = await mobile.newCDPSession(demo);
      const box = await preview.boundingBox();
      const start = { x: Math.round(box.x + box.width * .75), y: Math.round(box.y + box.height / 2) };
      await swipe(cdp, start, { x: start.x - 145, y: start.y + 1 });
      await demo.waitForFunction(() => document.querySelector('#hub').value === 'saved');
      const afterPreview = await frame.evaluate(element => element.value);
      await hub.evaluate(async element => { element.value = 'nearby'; await element.updateComplete; });
      await preview.click();
      const map = demo.locator('#places-map');
      const viewport = demo.getByRole('region', { name: 'Nearby map' });
      const area = await viewport.boundingBox();
      const pan = { x: Math.round(area.x + area.width * .77), y: Math.round(area.y + area.height * .75) };
      const before = await map.evaluate(element => element.view);
      await swipe(cdp, pan, { x: pan.x - 115, y: pan.y + 2 });
      return { afterPreview, route: await frame.evaluate(element => element.value), before,
        after: await map.evaluate(element => element.view) };
    } finally {
      await mobile.close();
    }
  },
};

async function withPage(context, run) {
  const page = await context.newPage();
  try {
    return await run(page);
  } finally {
    await page.close();
  }
}

async function swipe(session, start, end, finish = 'touchEnd', beforeFinish) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let step = 1; step <= 8; step++) {
    const x = start.x + (end.x - start.x) * step / 8;
    const y = start.y + (end.y - start.y) * step / 8;
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await beforeFinish?.();
  await session.send('Input.dispatchTouchEvent', { type: finish, touchPoints: [] });
}
