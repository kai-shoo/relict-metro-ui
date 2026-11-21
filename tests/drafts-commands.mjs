import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const durableKey = 'metro-example-drafts:v1:local';
const readState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), durableKey);
const apiPath = '/examples/drafts/api/submissions/';

async function withDemo(browser, run, intercept) {
  const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const server = spawn(process.execPath, [script], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  const closed = once(server, 'exit');
  let context;
  let proxy;
  try {
    const signal = AbortSignal.timeout(4000);
    const [started] = await Promise.race([
      once(server.stdout, 'data', { signal }),
      closed.then(([code]) => { throw new Error(`Demo server exited with ${code}`); }),
    ]);
    let origin = /http:\/\/127\.0\.0\.1:\d+/.exec(started.toString())?.[0];
    if (!origin) throw new Error(`Demo server did not report its URL: ${started}`);
    if (intercept) {
      proxy = forwardServer(origin, intercept).listen(0, '127.0.0.1');
      await once(proxy, 'listening');
      origin = `http://127.0.0.1:${proxy.address().port}`;
    }
    context = await browser.newContext();
    context.setDefaultTimeout(5000);
    return await run(context, `${origin}/examples/drafts/`);
  } finally {
    try {
      await context?.close();
    } finally {
      proxy?.close();
      proxy?.closeAllConnections();
      server.kill();
      await closed;
    }
  }
}

function forwardServer(origin, intercept) {
  return createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = request.method === 'POST' ? Buffer.concat(chunks) : undefined;
      const target = new URL(request.url, origin);
      const forward = () => fetch(target, { method: request.method, headers: request.headers, body });
      const result = target.pathname.startsWith(apiPath)
        ? await intercept({ request, body, forward }) : await forward();
      if (!result) {
        response.writeHead(201, {
          'Content-Type': 'application/json',
          'Content-Length': 256,
          Connection: 'close',
        }).end('{"truncated":');
        return;
      }
      response.writeHead(result.status, Object.fromEntries(result.headers))
        .end(Buffer.from(await result.arrayBuffer()));
    } catch {
      response.destroy();
    }
  });
}

async function compose(page, summary, notes) {
  await page.getByRole('textbox', { name: 'Summary' }).fill(summary);
  await page.getByRole('textbox', { name: 'Notes' }).fill(notes);
  await page.getByRole('button', { name: 'Queue for later' }).click();
}

const row = (page, version) => page.getByRole('region', { name: `North depot · Revision ${version}` });
const send = page => page.getByRole('button', { name: 'Send queued revisions' }).click();

export const draftsCommands = {
  async draftsRetryAndLateReceipt({ context: runner }) {
    const postRequests = [];
    const committed = Promise.withResolvers();
    const release = Promise.withResolvers();
    return withDemo(runner.browser(), async (context, url) => {
      const page = await context.newPage();
      try {
        await page.goto(url);
        await compose(page, 'Shipping inspection', 'First version');
        await send(page);
        const retry = row(page, 1).getByRole('button', { name: 'Retry' });
        await retry.click();
        const receipt = await committed.promise;
        await row(page, 1).getByText('Transferring').waitFor();
        await compose(page, 'Shipping inspection', 'Edited while sending');
        release.resolve();
        await row(page, 1).getByText('Sent', { exact: true }).waitFor();
        await row(page, 2).getByText('Queued', { exact: true }).waitFor();
        const state = await readState(page);
        const originalRequests = postRequests.slice();
        const { key, data, pathname } = originalRequests[1];
        const target = new URL(pathname, url).href;
        const headers = { 'Idempotency-Key': key };
        const duplicate = await context.request.post(target, { data, headers });
        const conflict = await context.request.post(target, { data: { ...data, notes: 'Different document' }, headers });
        return {
          postRequests: originalRequests, receipt, state, duplicateStatus: duplicate.status(), duplicate: await duplicate.json(),
          conflictStatus: conflict.status(), notes: await page.getByRole('textbox', { name: 'Notes' }).inputValue(),
        };
      } finally {
        release.resolve();
      }
    }, async ({ request, body, forward }) => {
      if (request.method !== 'POST') return forward();
      postRequests.push({ pathname: request.url, key: request.headers['idempotency-key'], data: JSON.parse(body) });
      if (postRequests.length === 1) return null;
      if (postRequests.length === 2) {
        try {
          const response = await forward();
          committed.resolve(await response.clone().json());
          await release.promise;
          return response;
        } catch (error) {
          committed.reject(error);
          throw error;
        }
      }
      return forward();
    });
  },

  async draftsReloadReceipt({ context: runner }) {
    const requests = [];
    let serverReceipt;
    let payload;
    return withDemo(runner.browser(), async (context, url) => {
      const page = await context.newPage();
      await page.goto(url);
      await page.getByRole('textbox', { name: 'Summary' }).fill('Record with proof');
      const chooser = page.getByLabel('Attach a file');
      await chooser.evaluate(input => {
        input.addEventListener('click', event => event.preventDefault(), { once: true });
        input.click();
      });
      await chooser.setInputFiles({
        name: 'proof.txt', mimeType: 'text/plain', buffer: Buffer.from('Proof retained through send'),
      });
      await page.getByRole('link', { name: 'proof.txt' }).waitFor();
      await compose(page, 'Record with proof', 'Sent notes');
      await send(page);
      await row(page, 1).getByRole('button', { name: 'Retry' }).waitFor();
      const notes = page.getByRole('textbox', { name: 'Notes' });
      await notes.fill('New unsaved notes');
      await notes.evaluate(input => input.setSelectionRange(4, 7));
      await page.reload();
      await row(page, 1).getByText('Sent', { exact: true }).waitFor();
      const draftRestored = await notes.evaluate(input => input.getRootNode().activeElement === input
        && input.value === 'New unsaved notes' && input.selectionStart === 4 && input.selectionEnd === 7);
      return { requests, serverReceipt, state: await readState(page), payload, draftRestored };
    }, async ({ request, body, forward }) => {
      requests.push(request.method);
      if (request.method === 'GET') return forward();
      payload = JSON.parse(body);
      serverReceipt = await (await forward()).json();
      return null;
    });
  },

  async draftsOfflineReopen({ context: runner }) {
    return withDemo(runner.browser(), async (context, url) => {
      const first = await context.newPage();
      await first.goto(url);
      await first.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await compose(first, 'Visited online', 'Saved before disconnect');
      await first.close();

      await context.setOffline(true);
      const page = await context.newPage();
      await page.goto(url);
      await page.getByText('Offline. Drafts can still be saved on this device.').waitFor();
      const reusedShell = await page.evaluate(() => Boolean(navigator.serviceWorker.controller) && !navigator.onLine);
      const restored = await page.getByRole('textbox', { name: 'Notes' }).inputValue();
      await compose(page, 'Visited online', 'Saved while offline');
      await send(page);
      await row(page, 2).getByText('Waiting · Offline').waitFor();
      const pending = await readState(page);

      await page.evaluate(() => { window.addEventListener('online', () => { window.wasNotifiedOnline = true; }); });
      await context.setOffline(false);
      await page.waitForFunction(() => navigator.onLine);
      if (runner.browser().browserType().name() === 'firefox') {
        // Playwright's Firefox transport clears offline mode without always emitting online in the page.
        await page.evaluate(() => {
          if (!window.wasNotifiedOnline) window.dispatchEvent(new Event('online'));
        });
      }
      await row(page, 1).getByText('Sent', { exact: true }).waitFor();
      await row(page, 2).getByText('Sent', { exact: true }).waitFor();
      return { reusedShell, restored, pending, state: await readState(page) };
    });
  },
};
