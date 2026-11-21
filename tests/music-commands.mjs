async function atMusic(context, runner, query, run, width = 960) {
  const demo = await context.newPage();
  try {
    demo.setDefaultTimeout(5000);
    await demo.setViewportSize({ width, height: 660 });
    await demo.emulateMedia({ reducedMotion: 'reduce' });
    await demo.goto(new URL(`/examples/music/${query}`, runner.url()).href);
    return await run(demo);
  } finally {
    await demo.close();
  }
}

export const musicCommands = {
  async musicAccess({ context, page }, cancel) {
    return atMusic(context, page, cancel ? '?track=beacon&entry=tile' : '', async demo => {
      const frame = demo.locator('#frame');
      const signIn = demo.getByRole('heading', { name: 'Демонстрационный вход' });
      const title = demo.getByRole('heading', { name: 'Маяк в тумане', exact: true });
      let tileHasGlyph;
      if (!cancel) {
        const tile = demo.getByRole('link', { name: 'Маяк в тумане', exact: true });
        const icon = demo.locator('metro-tile metro-icon svg');
        await icon.waitFor();
        tileHasGlyph = await icon.evaluate(element => {
          const box = element.getBoundingClientRect();
          const content = element.getRootNode().host.assignedSlot.parentElement.getBoundingClientRect();
          return box.width >= 40 && box.height >= 40
            && Math.abs(box.left + box.width / 2 - content.left - content.width / 2) <= 1
            && Math.abs(box.top + box.height / 2 - content.top - content.height / 2) <= 1;
        });
        await tile.click();
      }
      await signIn.waitFor();
      const pending = demo.locator('#signin-destination');
      const targetWasDeferred = (await pending.textContent()).includes('Маяк в тумане');
      await frame.evaluate(element => {
        element.playerVisits = [];
        element.addEventListener('metro-navigate', ({ detail }) => {
          if (detail.to.value === 'player') element.playerVisits.push(detail.to.params.id);
        });
      });
      const code = demo.getByRole('textbox', { name: 'Код демонстрации' });
      const submit = demo.getByRole('button', { name: 'Войти', exact: true });
      const form = demo.locator('#signin-form');

      let failedOnce = false;
      if (!cancel) {
        await code.fill('wrong');
        await submit.click();
        await demo.getByText('Код не подошёл. Попробуйте ещё раз.').waitFor();
        failedOnce = (await pending.textContent()).includes('Маяк в тумане') && await signIn.isVisible();
      }
      await code.fill('demo');
      await submit.click();
      await demo.waitForFunction(() => document.querySelector('#signin-form').getAttribute('aria-busy') === 'true');
      if (cancel) {
        await demo.getByRole('button', { name: 'Отмена', exact: true }).click();
        await demo.getByRole('heading', { name: 'Слушать', exact: true }).waitFor();
        await demo.getByRole('button', { name: 'Войти в демонстрационный режим' }).click();
        await signIn.waitFor();
        const cleared = (await pending.textContent()) === '' && !new URL(demo.url()).searchParams.has('track');
        await code.fill('demo');
        await submit.click();
        await demo.getByRole('heading', { name: 'Слушать', exact: true }).waitFor();
        return { targetWasDeferred, cleared, playerVisits: await frame.evaluate(element => element.playerVisits) };
      }

      await form.evaluate(element => element.requestSubmit());
      await title.waitFor();
      const playerVisits = await frame.evaluate(element => element.playerVisits);
      const openedURL = new URL(demo.url()).searchParams.get('track');
      await demo.locator('#back').click();
      await demo.getByRole('heading', { name: 'Слушать', exact: true }).waitFor();
      return { tileHasGlyph, targetWasDeferred, failedOnce, playerVisits, openedURL };
    }, cancel ? 960 : 350);
  },

  async musicPlayback({ context, page }) {
    return atMusic(context, page, '', async demo => {
      const nav = demo.getByRole('navigation', { name: 'Разделы архива' });
      const back = demo.locator('#back');
      const player = demo.locator('#player');
      const heading = demo.getByRole('heading', { name: 'У озера', exact: true });
      const menuButton = demo.getByRole('button', { name: 'Команды записи' });
      const menu = demo.getByRole('menu', { name: 'Команды · У озера' });

      await nav.getByRole('link', { name: 'Недавние' }).click();
      const recent = demo.locator('[data-feed="recent"]');
      const recentTrack = recent.getByRole('link', { name: /У озера/ });
      await recentTrack.scrollIntoViewIfNeeded();
      const recentScroll = await recent.evaluate(element => element.scrollTop);
      await recentTrack.click();
      await heading.waitFor();
      await player.getByRole('button', { name: 'Воспроизвести' }).click();
      await demo.waitForFunction(() => document.querySelector('#player').state.position > .1);
      await player.evaluate(element => { element.verifiedMedia = element.media; });

      await menuButton.click();
      await menu.waitFor();
      await back.click();
      await menu.waitFor({ state: 'hidden' });
      const menuFirst = await heading.isVisible() && await menuButton.evaluate(element => element === document.activeElement);
      await menuButton.click();
      await menu.getByRole('menuitem', { name: 'В избранное' }).click();
      const favoriteTarget = await demo.locator('#player-status').textContent();
      const position = await player.evaluate(element => element.state.position);
      await back.click();
      await demo.waitForFunction(() => document.activeElement?.dataset.track === 'lake');
      const recentRestored = recentScroll > 0 && await recent.evaluate(element => element.scrollTop) === recentScroll
        && await recentTrack.evaluate(element => element === document.activeElement);
      await demo.waitForFunction(seconds => document.querySelector('#player').state.position > seconds, position);
      const playsInBackground = await player.evaluate(element => element.state.playing);

      await back.click();
      await nav.getByRole('link', { name: 'Поиск' }).click();
      const query = demo.getByRole('searchbox', { name: 'Найти запись' });
      await query.fill('У ');
      const results = demo.locator('[data-feed="search"]');
      const foundTrack = results.getByRole('link', { name: /У озера/ });
      await foundTrack.scrollIntoViewIfNeeded();
      const searchScroll = await results.evaluate(element => element.scrollTop);
      const resultKeys = await results.locator('[data-track]').evaluateAll(rows => rows.map(row => row.dataset.track));
      await foundTrack.click();
      await heading.waitFor();
      const sameMedia = await player.evaluate((element, seconds) => element.verifiedMedia === element.media
        && element.state.playing && element.state.position > seconds, position);
      const queue = await demo.locator('#frame').evaluate(element => element.visit.params.queue);
      await menuButton.click();
      const favoriteRetained = await menu.getByRole('menuitem', { name: 'Убрать из избранного' }).isVisible();
      await demo.keyboard.press('Escape');
      await menu.waitFor({ state: 'hidden' });
      await back.click();
      await demo.waitForFunction(() => document.activeElement?.dataset.track === 'lake');
      const searchRestored = searchScroll > 0 && await results.evaluate(element => element.scrollTop) === searchScroll
        && await foundTrack.evaluate(element => element === document.activeElement) && await query.inputValue() === 'У ';
      const queueFollowsSearch = !resultKeys.includes('beacon') && queue.join(',') === resultKeys.join(',');
      return { menuFirst, favoriteTarget, recentRestored, searchRestored, sameMedia, playsInBackground,
        favoriteRetained, queueFollowsSearch };
    });
  },
};
