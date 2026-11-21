async function swipeHour(session, box) {
  const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height * .77) };
  const send = (type, point) => session.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
  await send('touchStart', start);
  try {
    for (let step = 1; step <= 8; step++) {
      await send('touchMove', { x: start.x, y: start.y - Math.round(box.height * .58 * step / 8) });
    }
  } finally {
    await send('touchEnd');
  }
}

export const phoneDateTimeCommands = {
  async phonePickerPageNavigation({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(3000);
      const url = new URL('/__metro-test/phone-picker-page', page.url()).href;
      await demo.route(url, route => route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="module" src="/src/date-picker.ts"></script>
          <script type="module" src="/src/time-picker.ts"></script>
          <button>Other action</button>
          <form>
            <metro-date-picker presentation="phone" locale="ja-JP" label="Date" value="2028-02-29"></metro-date-picker>
            <metro-time-picker presentation="phone" locale="ko-KR" label="Time" value="11:30"></metro-time-picker>
          </form>`,
      }));
      await demo.goto(url);
      await demo.evaluate(() => history.replaceState({ form: 'preserved' }, ''));
      for (const [orientation, viewport] of [{ width: 360, height: 640 }, { width: 640, height: 360 }].entries()) {
        await demo.setViewportSize(viewport);
        for (const { label, tag, columns, values } of [
          { label: 'Date', tag: 'metro-date-picker', columns: ['year', 'month', 'day'], values: ['2028-02-01', '2028-02-02'] },
          { label: 'Time', tag: 'metro-time-picker', columns: ['period', 'hour', 'minute'], values: ['11:31', '11:32'] },
        ]) {
          const trigger = demo.getByRole('button', { name: label, exact: true });
          const surface = demo.getByRole('main', { name: label });
          const bar = surface.getByRole('group', { name: 'Application Bar' });
          for (const action of ['Cancel', 'Back', 'Done']) {
            const previous = await demo.locator(tag).evaluate(element => element.value);
            await trigger.click();
            await surface.waitFor();
            const layout = await surface.evaluate(element => {
              const { x, y, width, height } = element.getBoundingClientRect();
              return { x, y, width, height, columns: [...element.querySelectorAll('[data-column]')].map(wheel => wheel.dataset.column) };
            });
            const isolated = await demo.locator('body > button').evaluate(button => {
              button.focus();
              return button.inert && !button.matches(':focus');
            });
            const barBottom = await bar.evaluate(element => element.getBoundingClientRect().bottom);
            if (layout.x !== 0 || layout.y !== 0 || layout.width !== viewport.width || layout.height !== viewport.height ||
                layout.columns.join() !== columns.join() || barBottom !== viewport.height ||
                await demo.getByRole('dialog').count() || !isolated) {
              throw new Error(`Unexpected ${label} page layout: ${JSON.stringify({ ...layout, isolated })}`);
            }
            const wheel = surface.getByRole('spinbutton').last();
            await wheel.press('ArrowUp');
            const selected = await wheel.getAttribute('aria-valuenow');
            if (Number(selected) !== Number(values[orientation].slice(-2))) {
              throw new Error(`${label} did not stage the expected value: ${selected}`);
            }
            if (action === 'Back') await demo.goBack();
            else await bar.getByRole('button', { name: action }).click();
            await surface.waitFor({ state: 'hidden' });
            await demo.waitForFunction(() => history.state?.form === 'preserved' && Object.keys(history.state).length === 1);
            const next = await demo.locator(tag).evaluate(element => element.value);
            if (!(await trigger.evaluate(element => element.matches(':focus'))) ||
                await demo.locator('body > button').evaluate(button => button.inert) ||
                next !== (action === 'Done' ? values[orientation] : previous)) {
              throw new Error(`${label} did not return to the field correctly on ${action}: ${previous} → ${next}`);
            }
          }
        }
      }
    } finally {
      await demo.close();
    }
  },
  async phonePickerLayout({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 320, height: 460 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      const url = new URL('/__metro-test/phone-picker-layout', page.url()).href;
      await demo.route(url, route => route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html lang="ru" style="font-size:200%">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="module" src="/src/date-picker.ts"></script>
          <metro-date-picker presentation="phone" value="2028-02-29" label="Дата"
            apply-label="Готово" cancel-label="Отмена"></metro-date-picker>`,
      }));
      await demo.goto(url);
      const trigger = demo.getByRole('button', { name: 'Дата', exact: true });
      await trigger.click();
      const pickerPage = demo.getByRole('main', { name: 'Дата' });
      const { width, headingVisible } = await pickerPage.evaluate(element => {
        const surface = element.getBoundingClientRect();
        const heading = element.querySelector('[part="picker-heading"]').getBoundingClientRect();
        return { width: surface.width, headingVisible: heading.top >= surface.top && heading.bottom <= surface.bottom };
      });
      await demo.keyboard.press('Tab');
      const month = demo.getByRole('spinbutton', { name: 'Month' });
      await month.evaluate(element => { element.getRootNode().host.locale = 'en-US'; });
      const retainedFocus = await month.evaluate(element => element.matches(':focus'));
      await demo.keyboard.press('Tab');
      await demo.keyboard.press('Tab');
      const year = demo.getByRole('spinbutton', { name: 'Year' });
      const reachable = await year.evaluate(element => {
        const wheel = element.getBoundingClientRect();
        const strip = element.closest('.phone-wheels').getBoundingClientRect();
        return element.getRootNode().activeElement === element &&
          wheel.left >= strip.left - 1 && wheel.right <= strip.right + 1;
      });
      const completeRows = await year.evaluate(element => {
        const wheel = element.getBoundingClientRect();
        return [-1, 0, 1].every(offset => {
          const cell = element.querySelector(`[data-offset="${offset}"]`).getBoundingClientRect();
          return cell.top >= wheel.top - 1 && cell.bottom <= wheel.bottom + 1;
        });
      });
      await demo.keyboard.press('Escape');
      await pickerPage.waitFor({ state: 'hidden' });
      return { width, headingVisible, reachable, completeRows, retainedFocus,
        restoredFocus: await trigger.evaluate(element => element.matches(':focus')) };
    } finally {
      await demo.close();
    }
  },
  async swipePhoneTime({ context, page }) {
    const device = await context.browser().newContext({
      viewport: { width: 390, height: 720 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce',
    });
    try {
      const demo = await device.newPage();
      demo.setDefaultTimeout(5000);
      const url = new URL('/__metro-test/phone-time', page.url()).href;
      await demo.route(url, route => route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html>
          <html lang="en-GB">
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Phone time picker</title>
            <script type="module" src="/src/time-picker.ts"></script>
            <form>
              <metro-time-picker presentation="phone" lang="en-GB" name="arrival" label="Arrival" value="11:00"></metro-time-picker>
            </form>
          </html>`,
      }));
      await demo.goto(url);

      await demo.getByRole('button', { name: 'Arrival' }).tap();
      const pickerPage = demo.getByRole('main', { name: 'Arrival' });
      await pickerPage.waitFor();
      const hour = demo.getByRole('spinbutton', { name: 'Hour' });
      await demo.waitForFunction(() =>
        document.querySelector('metro-time-picker').shadowRoot.querySelector('[data-column="hour"]')?.scrollTop > 0);
      const hourBefore = await hour.getAttribute('aria-valuenow');
      const center = await hour.evaluate(wheel => {
        const state = { events: [], touchStarts: 0, snap: null };
        window.phoneTimeTest = state;
        const picker = wheel.getRootNode().host;
        const center = wheel.scrollTop;
        const cellHeight = wheel.querySelector('[data-offset="0"]').getBoundingClientRect().height;
        for (const type of ['input', 'change']) {
          picker.form.addEventListener(type, event => state.events.push(`${event.type}:${picker.value}`));
        }
        wheel.addEventListener('pointerdown', event => {
          if (event.isTrusted && event.pointerType === 'touch') state.touchStarts++;
        });
        wheel.addEventListener('scrollend', event => {
          // Observe the native snap position before the wheel recenters its selected cell.
          const distance = wheel.scrollTop - center;
          const offset = Math.round(distance / cellHeight);
          if (event.isTrusted && offset && !state.snap) {
            state.snap = { offset, error: Math.abs(distance - offset * cellHeight) };
          }
        }, { capture: true });
        return center;
      });
      const box = await hour.boundingBox();
      const session = await device.newCDPSession(demo);
      try {
        await swipeHour(session, box);
      } finally {
        await session.detach();
      }
      await demo.waitForFunction(center => {
        const wheel = document.querySelector('metro-time-picker').shadowRoot.querySelector('[data-column="hour"]');
        const state = window.phoneTimeTest;
        return state.snap && Math.abs(wheel.scrollTop - center) <= 1
          && wheel.getAttribute('aria-valuenow') !== '11';
      }, center);
      const swipe = await hour.evaluate(wheel => ({
        touchStarts: window.phoneTimeTest.touchStarts,
        snap: window.phoneTimeTest.snap,
        hour: Number(wheel.getAttribute('aria-valuenow')),
        cell: Number(wheel.querySelector('[data-offset="0"]').dataset.value),
      }));
      const snapshot = () => demo.locator('metro-time-picker').evaluate(picker => ({
        value: picker.value,
        submitted: new FormData(picker.form).get('arrival'),
        events: window.phoneTimeTest.events,
      }));
      const staged = await snapshot();
      await demo.getByRole('button', { name: 'Done' }).tap();
      await pickerPage.waitFor({ state: 'hidden' });
      return { hourBefore, swipe, staged, committed: await snapshot() };
    } finally {
      await device.close();
    }
  },
};
