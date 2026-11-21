async function withInkInput({ context, page }, deviceOptions, run) {
  const device = await context.browser().newContext({ viewport: { width: 760, height: 540 }, ...deviceOptions });
  try {
    const demo = await device.newPage();
    demo.setDefaultTimeout(5000);
    const url = new URL('/__metro-test/ink-canvas', page.url()).href;
    await demo.route(url, route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <html lang="en">
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Ink input</title>
          <script type="module" src="/src/ink-canvas.ts"></script>
          <div id="paper-scroll" style="width: 420px; height: 300px; overflow: auto">
            <metro-ink-canvas label="Ink sample" style="width: 380px; --metro-ink-height: 170px"></metro-ink-canvas>
            <div style="height: 420px"></div>
          </div>
        </html>`,
    }));
    await demo.goto(url);
    const canvas = demo.getByRole('img', { name: 'Ink sample' });
    await canvas.waitFor();
    const session = await device.newCDPSession(demo);
    try {
      return await run(demo, canvas, session);
    } finally {
      await session.detach();
    }
  } finally {
    await device.close();
  }
}

function point(box, x, y) {
  return { x: Math.round(box.x + box.width * x), y: Math.round(box.y + box.height * y) };
}

async function swipe(session, from, to) {
  const send = (type, at) => session.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [at] : [] });
  await send('touchStart', from);
  try {
    for (let step = 1; step <= 8; step++) {
      await send('touchMove', { x: from.x + (to.x - from.x) * step / 8, y: from.y + (to.y - from.y) * step / 8 });
    }
  } finally {
    await send('touchEnd');
  }
}

export const inkCanvasCommands = {
  async inkCanvasTouch(client) {
    return withInkInput(client, { hasTouch: true }, async (demo, canvas, session) => {
      const scroller = demo.locator('#paper-scroll');
      const ink = demo.locator('metro-ink-canvas');
      await scroller.evaluate(node => {
        node.addEventListener('scrollend', () => { node.dataset.scrollEnded = 'true'; }, { once: true });
        node.addEventListener('metro-ink-change', event => { node.dataset.inkChange = event.detail.reason; });
      });
      await canvas.evaluate(node => {
        node.addEventListener('pointerdown', event => {
          if (event.isTrusted && event.pointerType === 'touch') {
            node.dataset.trustedStarts = String(Number(node.dataset.trustedStarts || 0) + 1);
          }
        });
      });

      const initialBox = await canvas.boundingBox();
      await swipe(session, point(initialBox, .5, .82), point(initialBox, .5, .16));
      await demo.waitForFunction(() => {
        const node = document.querySelector('#paper-scroll');
        return node.scrollTop > 20 && node.dataset.scrollEnded === 'true';
      });
      const scrollTop = await scroller.evaluate(node => node.scrollTop);
      const strokesAfterScroll = await ink.evaluate(node => node.strokes.length);
      const startsAfterScroll = Number(await canvas.getAttribute('data-trusted-starts'));
      await scroller.evaluate(node => { node.scrollTop = 0; });

      const touch = demo.getByRole('button', { name: 'Draw with touch' });
      await touch.tap();
      await demo.waitForFunction(() => {
        const ink = document.querySelector('metro-ink-canvas');
        return getComputedStyle(ink.shadowRoot.querySelector('canvas')).touchAction === 'none';
      });
      const drawingBox = await canvas.boundingBox();
      await swipe(session, point(drawingBox, .2, .4), point(drawingBox, .75, .4));
      await demo.waitForFunction(() => document.querySelector('metro-ink-canvas').strokes.length > 0);
      return {
        scrollTop, strokesAfterScroll, startsAfterScroll,
        touchPressed: await touch.getAttribute('aria-pressed'),
        startsAfterDrawing: Number(await canvas.getAttribute('data-trusted-starts')),
        strokesAfterDrawing: await ink.evaluate(node => node.strokes.length),
        scrollAfterDrawing: await scroller.evaluate(node => node.scrollTop),
        changeReason: await scroller.getAttribute('data-ink-change'),
      };
    });
  },

  async inkCanvasPen(client) {
    return withInkInput(client, { deviceScaleFactor: 2 }, async (demo, canvas, session) => {
      await demo.waitForFunction(() => {
        const canvas = document.querySelector('metro-ink-canvas').shadowRoot.querySelector('canvas');
        return canvas.clientWidth > 0 && canvas.width === canvas.clientWidth * devicePixelRatio;
      });
      const box = await canvas.boundingBox();
      const start = point(box, .2, .5);
      const end = point(box, .7, .5);
      await session.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen', force: .35,
      });
      await session.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', ...end, button: 'none', buttons: 1, pointerType: 'pen', force: .8,
      });
      await session.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', ...end, button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen',
      });
      return canvas.evaluate(node => {
        const strokes = node.getRootNode().host.strokes;
        return { pixelRatio: devicePixelRatio, backingScale: node.width / node.clientWidth, strokes };
      });
    });
  },
};
