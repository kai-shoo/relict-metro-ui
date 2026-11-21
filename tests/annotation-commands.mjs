const storageKey = 'metro-annotations:v1:northern-route';

async function documentPage(context, runner, run) {
  const demo = await context.newPage();
  try {
    demo.setDefaultTimeout(5000);
    await demo.setViewportSize({ width: 1020, height: 760 });
    await demo.goto(new URL('/examples/annotations/', runner.url()).href);
    await demo.evaluate(key => localStorage.removeItem(key), storageKey);
    await demo.reload();
    return await run(demo);
  } finally {
    await demo.evaluate(key => localStorage.removeItem(key), storageKey).catch(() => {});
    await demo.close();
  }
}

const inkOn = (page, sheet) => page.locator(`#${sheet} metro-ink-canvas`);
const strokesOn = (page, sheet) => inkOn(page, sheet).evaluate(ink => ink.strokes);
const between = (a, b, distance) => Math.abs(a - b) < distance;

async function pointOn(page, sheet, x, y) {
  const box = await inkOn(page, sheet).locator('canvas').boundingBox();
  return { x: Math.round(box.x + box.width * x), y: Math.round(box.y + box.height * y) };
}

async function draw(demo, sheet, y) {
  const start = await pointOn(demo, sheet, .22, y);
  const end = await pointOn(demo, sheet, .74, y);
  await demo.mouse.move(start.x, start.y);
  await demo.mouse.down();
  await demo.mouse.move(end.x, end.y, { steps: 7 });
  await demo.mouse.up();
}

async function painted(demo, id) {
  await demo.waitForFunction(sheet => {
    const ink = document.querySelector(`#${sheet} metro-ink-canvas`);
    const canvas = ink.shadowRoot.querySelector('canvas');
    const first = ink.strokes[0]?.points[0];
    if (!first || Math.abs(canvas.width - canvas.clientWidth * devicePixelRatio) > 1) return false;
    const x = Math.floor(first.x * canvas.width);
    const y = Math.floor(first.y * canvas.height);
    return canvas.getContext('2d').getImageData(x, y, 1, 1).data[3] > 0;
  }, id);
}

export const annotationCommands = {
  async annotationLifeCycle({ context, page }) {
    return documentPage(context, page, async demo => {
      const edit = demo.getByRole('button', { name: 'Аннотации', exact: true });
      const caption = demo.getByRole('textbox', { name: 'Подпись следующей пометки' });
      const route = demo.getByRole('navigation', { name: 'Листы документа' });
      await edit.click();
      await caption.fill('Проверить крепление');
      await draw(demo, 'bridge', .3);
      const first = demo.getByRole('button', { name: /Проверить крепление/ });
      await first.waitFor();
      await painted(demo, 'bridge');

      await route.getByRole('link', { name: 'Наблюдательная точка' }).click();
      await caption.fill('Отметить площадку');
      await draw(demo, 'lookout', .29);
      const second = demo.getByRole('button', { name: /Отметить площадку/ });
      await second.waitFor();
      await caption.fill('Удаляемый штрих');
      await draw(demo, 'lookout', .4);
      await demo.getByRole('button', { name: /Удаляемый штрих/ }).waitFor();
      await demo.getByRole('button', { name: 'Ластик', exact: true }).focus();
      await demo.keyboard.press('Space');
      await demo.keyboard.press('Control+z');
      await demo.getByRole('button', { name: /Удаляемый штрих/ }).waitFor({ state: 'hidden' });

      await first.click();
      const pin = demo.locator('#bridge .pin');
      const relocated = await pin.evaluate(node => node === document.activeElement && !node.hidden
        && node.getAttribute('aria-label') === 'Проверить крепление · Переправа');
      const before = await strokesOn(demo, 'bridge');
      const beforeWidth = await inkOn(demo, 'bridge').locator('canvas').evaluate(canvas => canvas.clientWidth);
      await demo.setViewportSize({ width: 410, height: 760 });
      await painted(demo, 'bridge');
      const reading = await pin.evaluate(node => {
        const marker = node.getBoundingClientRect();
        const sheet = node.closest('figure').getBoundingClientRect();
        const viewport = node.closest('#document').getBoundingClientRect();
        return { x: (marker.left + marker.width / 2 - sheet.left) / sheet.width,
          y: (marker.top + marker.height / 2 - sheet.top) / sheet.height,
          visible: marker.top >= viewport.top && marker.bottom <= viewport.bottom };
      });
      const anchor = before[0].points[Math.floor(before[0].points.length / 2)];
      const retained = JSON.stringify(await strokesOn(demo, 'bridge')) === JSON.stringify(before)
        && await inkOn(demo, 'bridge').locator('canvas').evaluate(canvas => canvas.clientWidth) < beforeWidth
        && reading.visible && between(reading.x, anchor.x, .01) && between(reading.y, anchor.y, .01);
      const toolRetained = await demo.getByRole('button', { name: 'Ластик', exact: true }).getAttribute('aria-pressed') === 'true';
      await demo.locator('#back').click();
      const backRestored = await edit.evaluate(node => node === document.activeElement && node.getAttribute('aria-pressed') === 'false');

      await demo.reload();
      await first.waitFor();
      await second.waitFor();
      await painted(demo, 'bridge');
      const persisted = await route.getByRole('link', { name: 'Переправа' }).getAttribute('aria-current') === 'location'
        && JSON.stringify(await strokesOn(demo, 'bridge')) === JSON.stringify(before)
        && (await strokesOn(demo, 'lookout')).length === 1;
      await second.click();
      const secondRelocated = await demo.locator('#lookout .pin').evaluate(node => {
        const bounds = node.getBoundingClientRect();
        return node === document.activeElement && !node.hidden && bounds.top >= 0 && bounds.bottom <= innerHeight;
      });
      return { relocated, retained, toolRetained, backRestored, persisted, secondRelocated };
    });
  },

  async annotationTouch({ context, page }) {
    return documentPage(context, page, async demo => {
      await demo.getByRole('button', { name: 'Аннотации', exact: true }).click();
      const canvas = inkOn(demo, 'bridge').locator('canvas');
      const viewport = demo.locator('#document');
      const cdp = await context.newCDPSession(demo);
      let stage = 'pen stroke';
      const pen = (type, point, pressure, down) => cdp.send('Input.dispatchMouseEvent', {
        type, ...point, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons: down ? 1 : 0,
        clickCount: type === 'mouseMoved' ? 0 : 1, force: pressure,
      });
      try {
        const start = await pointOn(demo, 'bridge', .25, .28);
        const end = await pointOn(demo, 'bridge', .67, .28);
        await pen('mousePressed', start, .36, true);
        await pen('mouseMoved', end, .73, true);
        await pen('mouseReleased', end, 0, false);
        await painted(demo, 'bridge');
        const snapshot = await strokesOn(demo, 'bridge');
        const pressure = snapshot.length === 1 && between(snapshot[0].points[0].pressure, .36, .02);

        stage = 'lost capture';
        await canvas.evaluate(node => {
          node.addEventListener('pointerdown', event => { node.pointerForTest = event.pointerId; }, { once: true });
          node.addEventListener('gotpointercapture', () => { node.capturedForTest = true; }, { once: true });
        });
        await pen('mousePressed', { x: start.x, y: start.y + 26 }, .4, true);
        // A move applies the browser's pending capture before it is released.
        await pen('mouseMoved', { x: Math.round((start.x + end.x) / 2), y: start.y + 26 }, .5, true);
        const hadCapture = await canvas.evaluate(node => {
          const id = node.pointerForTest;
          if (!node.capturedForTest || !node.hasPointerCapture(id)) return false;
          node.releasePointerCapture(id);
          return true;
        });
        await pen('mouseMoved', { x: end.x, y: end.y + 26 }, .5, true);
        await pen('mouseReleased', { x: end.x, y: end.y + 26 }, 0, false);
        const cancelled = hadCapture && JSON.stringify(await strokesOn(demo, 'bridge')) === JSON.stringify(snapshot);

        const swipe = async (from, to) => {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
          for (let step = 1; step <= 7; step++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
              x: from.x + (to.x - from.x) * step / 7, y: from.y + (to.y - from.y) * step / 7,
            }] });
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        };
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        stage = 'vertical touch scroll';
        await viewport.evaluate(node => {
          node.finishedScroll = false;
          node.addEventListener('scrollend', () => { node.finishedScroll = true; }, { once: true });
        });
        await swipe({ x: end.x, y: end.y + 110 }, { x: end.x, y: end.y - 85 });
        await demo.waitForFunction(() => {
          const node = document.querySelector('#document');
          return node.scrollTop > 35 && node.finishedScroll;
        });
        const scrollsWithoutDrawing = (await strokesOn(demo, 'bridge')).length === 1;

        stage = 'enabled finger stroke';
        await demo.getByRole('navigation', { name: 'Листы документа' }).getByRole('link', { name: 'Переправа' }).click();
        await demo.getByRole('checkbox', { name: 'Рисовать пальцем' }).check();
        stage = 'touch action update';
        await demo.waitForFunction(() => {
          const canvas = document.querySelector('#bridge metro-ink-canvas').shadowRoot.querySelector('canvas');
          return getComputedStyle(canvas).touchAction === 'none' && document.querySelector('#document').scrollTop < 15;
        });
        const fingerStart = await pointOn(demo, 'bridge', .23, .26);
        const fingerEnd = await pointOn(demo, 'bridge', .68, .26);
        stage = 'finger pointer capture';
        await swipe(fingerStart, fingerEnd);
        await demo.waitForFunction(() => document.querySelector('#bridge metro-ink-canvas').strokes.length === 2);
        return { pressure, cancelled, scrollsWithoutDrawing, fingerEnabled: true };
      } catch (error) {
        const top = await viewport.evaluate(node => node.scrollTop);
        const count = (await strokesOn(demo, 'bridge')).length;
        throw new Error(`Annotation input failed during ${stage} at scrollTop ${top} with ${count} saved strokes: ${error.message}`, { cause: error });
      } finally {
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
        await cdp.detach();
      }
    });
  },
};
