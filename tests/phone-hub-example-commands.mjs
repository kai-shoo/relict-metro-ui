export const phoneHubCommands = {
  async phoneHubExample({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 460, height: 820 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/examples/phone-hub/', page.url()).href);
      const frame = demo.locator('#frame');
      const hub = demo.locator('#hub');
      const bar = demo.locator('#commands');
      const more = bar.getByRole('button', { name: 'Ещё', exact: true });
      const clear = bar.getByRole('button', { name: 'Очистить недавние' });
      const overview = demo.getByRole('heading', { name: 'Обзор', exact: true });
      const favorites = demo.getByRole('heading', { name: 'Избранное', exact: true });
      const back = demo.locator('#back');
      const dialog = demo.getByRole('dialog', { name: 'Очистить недавние маршруты?' });
      const confirm = demo.getByRole('button', { name: 'Очистить', exact: true });

      await more.waitFor();
      const previewIsPassive = await hub.evaluate(element => element.firstVisible === 'overview'
        && element.sectionsInView.includes('recent')) && await bar.getAttribute('mode') === 'minimal'
        && !await clear.isVisible();
      await more.click();
      await bar.getByRole('button', { name: 'О каталоге' }).waitFor();
      await demo.keyboard.press('Escape');
      await demo.waitForFunction(() => !document.querySelector('#commands').open);
      const menuBack = await more.evaluate(button => button.getRootNode().activeElement === button);

      await overview.press('ArrowRight');
      await clear.waitFor();
      const recentIsCompact = await bar.getAttribute('mode') === 'compact'
        && await frame.evaluate(element => element.value === 'hub' && !element.canGoBack);

      await more.click();
      await bar.getByRole('button', { name: 'О каталоге' }).waitFor();
      await hub.evaluate(element => { element.value = 'favorites'; });
      await favorites.waitFor();
      await demo.waitForFunction(() => {
        const bar = document.querySelector('#commands');
        const section = document.querySelector('#favorites');
        return bar.context === 'favorites' && !bar.open && section.shadowRoot.activeElement?.matches('h2');
      });
      const contextChanged = await bar.getAttribute('mode') === 'minimal' && !await clear.isVisible();
      await favorites.press('ArrowLeft');

      const list = demo.locator('#recent-scroll');
      const link = list.getByRole('link', { name: /Край хребта/ });
      await demo.waitForFunction(() => {
        const hub = document.querySelector('#hub');
        return hub.value === 'recent' && hub.firstVisible === 'recent';
      });
      const saved = await link.evaluate(element => {
        const list = element.closest('#recent-scroll');
        list.scrollTop = list.scrollHeight;
        element.focus({ preventScroll: true });
        return list.scrollTop;
      });
      await demo.keyboard.press('Enter');
      await demo.getByRole('heading', { name: 'Край хребта', exact: true }).waitFor();
      await back.click();
      await clear.waitFor();
      if (saved <= 0) throw new Error('The recent list did not scroll before navigation.');
      await demo.waitForFunction(top => {
        const hub = document.querySelector('#hub');
        return hub.value === 'recent' && hub.firstVisible === 'recent'
          && document.activeElement?.dataset.record === 'ridge'
          && document.querySelector('#recent-scroll').scrollTop === top;
      }, saved);

      await clear.click();
      await dialog.waitFor();
      await hub.evaluate(element => { element.value = 'favorites'; });
      await demo.waitForFunction(() => document.querySelector('#commands').context === 'favorites');
      await confirm.click();
      await demo.getByText('Секция изменилась. Список недавних сохранён.').waitFor();
      await favorites.press('ArrowLeft');
      await clear.waitFor();
      const stalePreserved = await link.isVisible();

      await clear.click();
      await dialog.waitFor();
      await demo.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      const cancelPreserved = await link.isVisible();
      await clear.click();
      await confirm.click();
      await demo.getByText('Список недавних очищен.').waitFor();
      const freshCleared = !await link.isVisible() && await clear.isDisabled();
      return { previewIsPassive, menuBack, recentIsCompact, contextChanged, stalePreserved, cancelPreserved, freshCleared };
    } finally {
      await demo.close();
    }
  },

  async desktopHubExample({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 1280, height: 760 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      let helpRequests = 0;
      let deferred;
      await demo.route('**/desktop-help.json', route => {
        helpRequests++;
        if (helpRequests === 1) deferred = route;
        else return route.continue();
      });
      await demo.goto(new URL('/examples/phone-hub/desktop.html', page.url()).href);

      const hub = demo.locator('#desktop-hub');
      const frame = demo.locator('#desktop-frame');
      const zones = demo.getByRole('button', { name: 'Обзор секций', exact: true });
      const back = demo.locator('#desktop-back');
      const help = demo.locator('#help-body');
      const showSection = async name => {
        await zones.click();
        await demo.getByRole('button', { name, exact: true }).click();
      };
      await demo.waitForFunction(() => document.querySelector('#desktop-hub').sectionsInView.includes('featured'));
      const initiallyDeferred = helpRequests === 0;

      await Promise.all([demo.waitForRequest('**/desktop-help.json'), showSection('Справка')]);
      await help.getByText('Загружаем справку…').waitFor();
      const overviewDidNotNavigate = await frame.evaluate(element => element.value === 'archive' && !element.canGoBack)
        && await hub.evaluate(element => element.value === 'help');

      await showSection('Рекомендация');
      await demo.getByRole('link', { name: /Край хребта/ }).click();
      await demo.getByRole('heading', { name: 'Край хребта', exact: true }).waitFor();
      const cardOpenedWhileLoading = await frame.evaluate(element => element.canGoBack)
        && await help.getAttribute('aria-busy') === 'true';
      await deferred.fulfill({ status: 503, body: 'Unavailable' });
      await back.click();
      await demo.waitForFunction(() => document.activeElement?.dataset.metroFocus === 'featured-ridge');
      const cardBack = await hub.evaluate(element => element.value === 'featured');

      await showSection('Справка');
      await help.getByText('Справка недоступна. Попробуйте ещё раз.').waitFor();
      await demo.getByRole('button', { name: 'Повторить загрузку справки' }).click();
      await help.getByText('Как найти секцию', { exact: true }).waitFor();
      const retried = helpRequests === 2 && await help.getAttribute('aria-busy') === 'false';

      await showSection('Подборки');
      await demo.getByRole('link', { name: 'Подборки', exact: true }).click();
      await demo.getByRole('heading', { name: 'Все подборки', exact: true }).waitFor();
      await demo.setViewportSize({ width: 580, height: 760 });
      await back.click();
      await demo.waitForFunction(() => {
        const hub = document.querySelector('#desktop-hub');
        const section = document.querySelector('#collections');
        return hub.value === 'collections' && hub.firstVisible === 'collections' && section.shadowRoot.activeElement?.matches('a');
      });
      const reflowRestored = await hub.evaluate(element => {
        const track = element.shadowRoot.querySelector('.track');
        const viewport = element.shadowRoot.querySelector('.viewport');
        const header = element.querySelector('#collections').shadowRoot.activeElement.getBoundingClientRect();
        const visible = viewport.getBoundingClientRect();
        return getComputedStyle(track).flexDirection === 'column' && viewport.scrollTop > 0 && viewport.scrollLeft === 0
          && header.top >= visible.top - 2 && header.bottom <= visible.bottom;
      });
      return { initiallyDeferred, overviewDidNotNavigate, cardOpenedWhileLoading, cardBack, retried, reflowRestored };
    } finally {
      await demo.close();
    }
  },
};
