export const importsCommands = {
  async shareTargetExample({ context, page }) {
    return withImports(context, page, async (browser, demo, url) => {
      await demo.goto(url.href);
      await waitForWorker(demo);
      const session = await browser.newCDPSession(demo);
      const processed = await session.send('Page.getAppManifest');
      const manifest = await demo.evaluate(async () => {
        const response = await fetch(document.querySelector('link[rel="manifest"]').href);
        return response.json();
      });
      await demo.goto(new URL('/tests/fixtures/notification-host.html', url).href);
      const hadNoReceiver = await demo.evaluate(() => navigator.serviceWorker.controller === null);
      const note = '<img src=x onerror="window.importInjection = true">';
      const delivery = await postShare(demo, new URL(manifest.share_target.action, url).href, {
        title: 'North depot', text: note, url: 'https://example.invalid/notes',
        file: { name: 'field-note.txt', mimeType: 'text/plain', buffer: Buffer.from('Inspect the loading gate.') } });
      await demo.getByRole('heading', { name: 'Review North depot' }).waitFor();
      await demo.getByText('Inspect the loading gate.').waitFor();
      const href = demo.url();
      const safePreview = await demo.locator('#note').evaluate((element, expected) => element.textContent === expected
        && !element.querySelector('img') && !window.importInjection, note);
      await demo.getByRole('button', { name: 'Keep for later' }).click();
      await demo.getByText('Import kept for later review.').waitFor();
      await demo.close();

      const resumed = await browser.newPage();
      await resumed.goto(url.href);
      const pending = resumed.getByRole('button', { name: 'Review North depot' });
      await pending.waitFor();
      const deferred = await resumed.getByText('No items have been imported.').isVisible();
      await pending.click();
      await resumed.getByText('Inspect the loading gate.').waitFor();

      const duplicate = await browser.newPage();
      await duplicate.goto(href);
      await duplicate.getByRole('heading', { name: 'Review North depot' }).waitFor();
      await resumed.getByRole('combobox', { name: 'Destination' }).press('End');
      await resumed.getByRole('button', { name: 'Import', exact: true }).press('Enter');
      await resumed.getByText('Imported into Archive.').waitFor();
      const receipt = resumed.getByRole('region', { name: 'Archive' }).getByText('North depot', { exact: true });
      await receipt.waitFor();
      const cleared = await resumed.getByText('No imports are waiting.').isVisible();
      await duplicate.getByRole('button', { name: 'Import', exact: true }).press('Enter');
      await duplicate.getByText('This import was already accepted.').waitFor();
      const imported = duplicate.getByRole('region', { name: 'Archive' }).getByText('North depot', { exact: true });
      await imported.waitFor();
      const originalDestination = await imported.count();
      const otherDestination = await duplicate.getByRole('region', { name: 'Notebook' }).count();
      await resumed.goto(href);
      await resumed.getByText('This import was already accepted.').waitFor();
      await resumed.getByRole('region', { name: 'Archive' }).locator('summary').press('Enter');
      await resumed.getByRole('region', { name: 'Archive' }).getByText('Inspect the loading gate.').waitFor();
      const parsedManifest = processed.errors.length === 0 && processed.manifest.shareTarget?.method === 'kPost'
        && processed.manifest.id === url.href;
      return { delivery, manifest, href, hadNoReceiver, safePreview, deferred, cleared, originalDestination, otherDestination,
        parsedManifest, previewRemoved: await resumed.getByRole('heading', { name: 'Review North depot' }).isHidden() };
    });
  },

  async launchFileImportExample({ context, page }) {
    return withImports(context, page, async (_browser, demo, url) => {
      await demo.addInitScript(() => {
        Object.defineProperty(window, 'launchQueue', { value: { setConsumer(consume) {
          window.deliverTestFile = () => consume({ files: [{ kind: 'file', getFile: async () =>
            new File(['Site notes from the file handler'], 'survey.md', { type: 'text/markdown' }) }] });
        } } });
      });
      await demo.goto(url.href);
      await demo.waitForFunction(() => typeof window.deliverTestFile === 'function');
      await demo.evaluate(() => window.deliverTestFile());
      await demo.getByRole('heading', { name: 'Review survey.md' }).waitFor();
      await demo.getByText('Opened from the file handler').waitFor();
      await demo.getByRole('button', { name: 'Keep for later' }).click();

      await demo.locator('#picker input[type="file"]').setInputFiles({ name: 'device.txt', mimeType: 'text/plain',
        buffer: Buffer.from('Notes chosen with the local picker') });
      await demo.getByRole('heading', { name: 'Review device.txt' }).waitFor();
      const viaPicker = await demo.getByText('Chosen from this device').isVisible() &&
        await demo.getByText('Notes chosen with the local picker').isVisible();
      await demo.getByRole('button', { name: 'Import', exact: true }).click();
      await demo.getByRole('region', { name: 'Notebook' }).getByText('device.txt').waitFor();
      return { viaPicker, launchStillPending: await demo.getByRole('button', { name: 'Review survey.md' }).isVisible(),
        pickerAcknowledged: await demo.getByRole('button', { name: 'Review device.txt' }).isHidden() };
    });
  },

  async invalidShareTargetExample({ context, page }) {
    return withImports(context, page, async (_browser, demo, url) => {
      await demo.goto(url.href);
      await waitForWorker(demo);
      const delivery = await postShare(demo, new URL('incoming-share', url).href, { title: 'Unsupported', file: { name: 'program.exe',
        mimeType: 'application/octet-stream', buffer: Buffer.from('unsupported format') } });
      await demo.getByText('Choose up to four text or Markdown files of 256 KiB each, or share a short note or URL.').waitFor();
      return { delivery, empty: await demo.getByText('No imports are waiting.').isVisible(),
        emptyReceipts: await demo.getByText('No items have been imported.').isVisible() };
    });
  },
};

async function withImports(context, runner, run) {
  const url = new URL('/examples/imports/', runner.url());
  const browser = await context.browser().newContext();
  try {
    const demo = await browser.newPage();
    demo.setDefaultTimeout(5000);
    return await run(browser, demo, url);
  } finally {
    await browser.close();
  }
}

async function waitForWorker(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/examples/imports/worker.js'));
}

async function postShare(page, action, { file, ...fields }) {
  await page.evaluate(({ action, fields }) => {
    const form = document.createElement('form');
    form.id = 'share-target-form';
    form.action = action;
    form.enctype = 'multipart/form-data';
    form.method = 'post';
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'files';
    form.append(input);
    document.body.append(form);
  }, { action, fields });
  await page.locator('#share-target-form input[type="file"]').setInputFiles(file);
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/incoming-share') && response.request().method() === 'POST'),
    page.waitForURL(/\?(incoming|import-error)=/, { waitUntil: 'load' }),
    page.locator('#share-target-form').evaluate(form => form.requestSubmit()),
  ]);
  return { status: response.status(), worker: response.fromServiceWorker(),
    multipart: response.request().headers()['content-type']?.startsWith('multipart/form-data;') ?? false };
}
