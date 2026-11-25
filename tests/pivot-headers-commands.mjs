async function withMail({ context, page }, options, run) {
  const device = await context.browser().newContext({ reducedMotion: 'reduce', ...options });
  try {
    const demo = await device.newPage();
    demo.setDefaultTimeout(4000);
    await demo.route('**/dist/metro-ui.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: "import '/src/pivot.ts'; import '/src/command-bar.ts';",
    }));
    await demo.goto(new URL('/examples/mail/?folder=flagged', page.url()).href);
    await demo.getByRole('list', { name: 'Flagged messages' }).waitFor();
    return await run(demo, demo.locator('#mail-pivot'), device);
  } finally {
    await device.close();
  }
}

function readHeaders(pivot) {
  return pivot.evaluate(element => {
    const root = element.shadowRoot;
    const strip = root.querySelector('[role="tablist"]');
    const view = strip.getBoundingClientRect();
    const rtl = getComputedStyle(strip).direction === 'rtl';
    const tabs = [...strip.querySelectorAll('[part="tab"]')];
    const selected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    const read = tab => {
      if (!tab) return null;
      const range = document.createRange();
      range.selectNodeContents(tab);
      const glyphs = range.getBoundingClientRect();
      const bounds = tab.getBoundingClientRect();
      const left = Math.max(view.left, glyphs.left);
      const right = Math.min(view.right, glyphs.right);
      const visible = Math.max(0, right - left);
      return {
        label: tab.textContent.trim(),
        hidden: tab.getAttribute('aria-hidden') === 'true',
        buttonVisible: bounds.left >= view.left - 1 && bounds.right <= view.right + 1,
        start: rtl ? view.right - bounds.right : bounds.left - view.left,
        visible,
        clipped: visible > 0 && visible + 1 < glyphs.width,
        point: visible ? { x: (left + right) / 2, y: (glyphs.top + glyphs.bottom) / 2 } : null,
      };
    };
    const drawn = tabs.map(read);
    return {
      value: element.value,
      active: drawn[selected],
      previous: drawn[selected - 1] ?? null,
      next: drawn[selected + 1] ?? null,
      lastVisible: drawn.filter(tab => tab.visible).at(-1),
      focus: root.activeElement?.textContent.trim() ?? null,
      focusOutline: root.activeElement ? getComputedStyle(root.activeElement).outlineStyle : null,
      real: tabs.filter(tab => tab.getAttribute('role') === 'tab').map(tab => tab.textContent.trim()),
      copies: tabs.filter(tab => tab.getAttribute('aria-hidden') === 'true').length,
    };
  });
}

async function readEvents(pivot) {
  return pivot.evaluate(element => element.pivotChanges);
}

async function listen(pivot) {
  await pivot.evaluate(element => {
    element.pivotChanges = [];
    element.addEventListener('metro-change', event => element.pivotChanges.push(event.detail.value));
  });
}

async function pickPrevious(demo, pivot, layout, name) {
  const point = layout.previous?.point;
  if (!point) throw new Error(`No visible previous heading for "${layout.active?.label}"`);
  await demo.mouse.click(point.x, point.y);
  await pivot.getByRole('tab', { name, selected: true }).waitFor();
}

async function traceSelection(demo, pivot, layout, name) {
  await pivot.evaluate(element => {
    const strip = element.shadowRoot.querySelector('[role="tablist"]');
    element.addEventListener('metro-change', () => {
      element.pivotOffsets = [strip.scrollLeft];
      strip.addEventListener('scroll', () => {
        if (element.pivotOffsets.at(-1) !== strip.scrollLeft) element.pivotOffsets.push(strip.scrollLeft);
      }, { signal: (element.pivotTrace = new AbortController()).signal });
    }, { once: true });
  });
  await pickPrevious(demo, pivot, layout, name);
  await demo.waitForFunction(inset => {
    const root = document.querySelector('#mail-pivot').shadowRoot;
    const strip = root.querySelector('[role="tablist"]');
    const button = strip.querySelector('[aria-selected="true"]');
    return Math.abs(button.getBoundingClientRect().left - strip.getBoundingClientRect().left - inset) <= 1;
  }, layout.active.start);
  const { end, offsets } = await pivot.evaluate(element => {
    element.pivotTrace.abort();
    const strip = element.shadowRoot.querySelector('[role="tablist"]');
    return { end: strip.scrollLeft, offsets: element.pivotOffsets };
  });
  const start = offsets.shift();
  return { start, end, offsets, distance: layout.active.start - layout.previous.start };
}

export const pivotHeaderCommands = {
  async mailPivotHeaders(client) {
    return withMail(client, { viewport: { width: 720, height: 780 } }, async (demo, pivot) => {
      await listen(pivot);
      const before = await readHeaders(pivot);
      await pickPrevious(demo, pivot, before, 'Inbox');
      await demo.getByRole('list', { name: 'Inbox messages' }).waitFor();
      const inbox = await readHeaders(pivot);
      await pickPrevious(demo, pivot, inbox, 'Archive');
      const archive = await readHeaders(pivot);

      await pivot.evaluate(element => { element.closest('.mail').dir = 'rtl'; });
      const rtlWithoutResize = await readHeaders(pivot);
      await pivot.evaluate(element => { element.closest('.mail').removeAttribute('dir'); });

      await demo.keyboard.press('ArrowRight');
      await demo.waitForFunction(() => document.querySelector('#mail-pivot').shadowRoot.activeElement?.textContent.trim() === 'Inbox');
      const preview = await readHeaders(pivot);
      await demo.keyboard.press('Enter');
      await pivot.getByRole('tab', { name: 'Inbox', selected: true }).waitFor();

      await pivot.evaluate(element => {
        element.closest('.mail').style.inlineSize = 'min(100%, 62rem)';
      });
      await demo.setViewportSize({ width: 1080, height: 800 });
      await pivot.locator('.tab-copy').first().waitFor({ state: 'detached' });
      const wide = await readHeaders(pivot);

      await pivot.evaluate(element => { element.dir = 'rtl'; });
      await demo.setViewportSize({ width: 390, height: 740 });
      await pivot.locator('.tab-copy').first().waitFor();
      const rtlInbox = await readHeaders(pivot);
      await pickPrevious(demo, pivot, rtlInbox, 'Archive');
      const rtlArchive = await readHeaders(pivot);
      await demo.keyboard.press('ArrowLeft');
      await demo.waitForFunction(() => document.querySelector('#mail-pivot').shadowRoot.activeElement?.textContent.trim() === 'Inbox');
      return { before, inbox, archive, rtlWithoutResize, preview, wide, rtlInbox, rtlArchive,
        rtlPreview: await readHeaders(pivot), events: await readEvents(pivot) };
    });
  },

  async mailPivotHeaderMotion(client) {
    return withMail(client, { viewport: { width: 720, height: 780 }, reducedMotion: 'no-preference' },
      async (demo, pivot) => {
        await listen(pivot);
        await pivot.evaluate(element => { element.style.setProperty('--metro-motion', '240ms'); });
        const straight = await traceSelection(demo, pivot, await readHeaders(pivot), 'Inbox');
        const wrapped = await traceSelection(demo, pivot, await readHeaders(pivot), 'Archive');
        return { straight, wrapped, events: await readEvents(pivot) };
      });
  },

  async mailPivotTouchBack(client) {
    return withMail(client, { viewport: { width: 350, height: 570 }, hasTouch: true, isMobile: true },
      async (demo, pivot) => {
        await listen(pivot);
        const before = await readHeaders(pivot);
        const { x, y } = before.previous.point;
        await demo.touchscreen.tap(x, y);
        await pivot.getByRole('tab', { name: 'Inbox', selected: true }).waitFor();
        const inbox = await readHeaders(pivot);
        const list = demo.locator('[data-mail-list="inbox"]');
        const letter = list.locator('[data-message-id="ridge-signal"]');
        await letter.scrollIntoViewIfNeeded();
        const saved = await list.evaluate(element => element.scrollTop);
        await letter.tap();
        await demo.locator('#message-title').waitFor();
        await demo.locator('[data-mail-back]').tap();
        await demo.waitForFunction(() => document.activeElement?.dataset.messageId === 'ridge-signal');
        const restored = await readHeaders(pivot);
        return {
          startedOnClippedInbox: before.previous.label === 'Inbox' && before.previous.clipped,
          inboxVisible: inbox.active.buttonVisible && inbox.active.label === 'Inbox',
          neighborVisible: inbox.next?.label === 'Flagged' && inbox.next.visible > 0,
          restoredHeader: restored.value === 'inbox' && restored.active.buttonVisible,
          scrollRestored: saved > 0 && await list.evaluate(element => element.scrollTop) === saved,
          commandsVisible: await demo.getByRole('group', { name: 'Inbox actions' }).isVisible(),
          events: await readEvents(pivot),
        };
      });
  },

  async mailPivotHeaderDrag(client) {
    return withMail(client, { viewport: { width: 390, height: 740 }, hasTouch: true, isMobile: true },
      async (demo, pivot, device) => {
        await listen(pivot);
        const strip = pivot.getByRole('tablist');
        const before = await strip.evaluate(element => element.scrollLeft);
        const box = await strip.boundingBox();
        const session = await device.newCDPSession(demo);
        try {
          const start = { x: Math.round(box.x + box.width * .72), y: Math.round(box.y + box.height / 2) };
          const send = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
          await send('touchStart', [start]);
          for (let step = 1; step <= 8; step++) {
            await send('touchMove', [{ x: start.x - step * 13, y: start.y }]);
          }
          await send('touchEnd', []);
        } finally {
          await session.detach();
        }
        await demo.waitForFunction(start =>
          document.querySelector('#mail-pivot').shadowRoot.querySelector('[role="tablist"]').scrollLeft > start + 30, before);
        return { delta: (await strip.evaluate(element => element.scrollLeft)) - before,
          selected: await pivot.evaluate(element => element.value), changes: await readEvents(pivot) };
      });
  },
};
