const portrait = { width: 390, height: 680 };
const landscape = { width: 720, height: 390 };
const focused = locator => locator.evaluate(element => element === element.getRootNode().activeElement);

async function expectPlacement(demo, vertical) {
  await demo.waitForFunction(vertical => {
    const bar = document.querySelector('#mail-commands');
    const first = bar?.shadowRoot?.querySelector('.primary [data-command="next-unread"]')?.getBoundingClientRect();
    const second = bar?.shadowRoot?.querySelector('.primary [data-command="sort"]')?.getBoundingClientRect();
    if (!first?.width || !first.height || !second?.width || !second.height) return false;
    const rail = bar.getBoundingClientRect();
    const list = document.querySelector('#folder-view').getBoundingClientRect();
    const centerX = rect => rect.left + rect.width / 2;
    const centerY = rect => rect.top + rect.height / 2;
    return vertical
      ? second.top >= first.bottom - 1 && Math.abs(centerX(first) - centerX(second)) < 3
        && rail.left >= list.right - 1 && rail.right <= innerWidth + 1
      : second.left >= first.right - 1 && Math.abs(centerY(first) - centerY(second)) < 3
        && rail.top >= list.bottom - 1;
  }, vertical);
}

export const landscapeMailCommands = {
  async compactLandscapeOverflow({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(4000);
      await demo.setViewportSize({ width: 530, height: 330 });
      await demo.goto(new URL('/examples/mail/', page.url()).href);
      await demo.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const more = demo.getByRole('button', { name: 'More commands' });
      const markRead = demo.getByRole('button', { name: 'Mark folder as read' });
      await more.press('Enter');
      await markRead.waitFor();
      const placement = await more.evaluate(toggle => {
        const root = toggle.getRootNode();
        const rail = root.host.getBoundingClientRect();
        const menu = root.querySelector('[part="overflow"]').getBoundingClientRect();
        const button = toggle.getBoundingClientRect();
        const hit = root.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2);
        return {
          outsideRail: menu.right <= rail.left + 1,
          insideViewport: menu.left >= -1 && menu.right <= document.documentElement.clientWidth + 1 &&
            menu.top >= -1 && menu.bottom <= document.documentElement.clientHeight + 1,
          toggleReachable: hit?.closest('button') === toggle,
        };
      });
      if (!placement.toggleReachable) return placement;
      await demo.keyboard.press('End');
      const archive = demo.getByRole('button', { name: 'Archive read messages' });
      const lastActionVisible = await archive.evaluate(button => {
        const item = button.getBoundingClientRect();
        const list = button.parentElement.getBoundingClientRect();
        return button.matches(':focus') && item.top >= list.top - 1 && item.bottom <= list.bottom + 1;
      });
      await more.click();
      await markRead.waitFor({ state: 'hidden' });
      const toggleRegainedFocus = await focused(more);
      await more.press('Enter');
      await markRead.press('Enter');
      await demo.getByText('Inbox marked as read.', { exact: true }).waitFor();
      return { ...placement, lastActionVisible, toggleRegainedFocus, marked: await focused(more) };
    } finally {
      await demo.close();
    }
  },

  async landscapeMail({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize(portrait);
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      await demo.goto(new URL('/examples/mail/', page.url()).href);
      const flagged = demo.getByRole('tab', { name: 'Flagged', exact: true });
      const selected = demo.getByRole('tab', { name: 'Flagged', exact: true, selected: true });
      const messages = demo.getByRole('list', { name: 'Flagged messages' });
      const scroller = demo.locator('[data-mail-list="flagged"]');
      const actions = demo.getByRole('group', { name: 'Flagged actions' });
      const unread = actions.getByRole('button', { name: 'Open first unread' });
      const sort = actions.getByRole('button', { name: 'Oldest first' });
      const more = actions.getByRole('button', { name: 'More commands' });
      const markRead = actions.getByRole('button', { name: 'Mark folder as read' });
      const bar = demo.locator('#mail-commands');
      const titles = () => scroller.locator('.message-subject').allTextContents();
      const unreadCount = () => scroller.locator('[data-unread]').count();

      await flagged.click();
      await selected.waitFor();
      await messages.waitFor();
      const before = await titles();
      const initiallyUnread = await unread.isEnabled() && await unreadCount() > 0;
      await expectPlacement(demo, false);
      await demo.setViewportSize(landscape);
      await expectPlacement(demo, true);
      const rotatedList = await titles();
      const landscapeFolder = await selected.isVisible() && await messages.isVisible();

      await more.click();
      await markRead.waitFor();
      const overflowFocused = await focused(markRead);
      const [menuBox, railBox] = await Promise.all([markRead.boundingBox(), bar.boundingBox()]);
      const overflowBesideRail = menuBox && railBox && menuBox.x + menuBox.width <= railBox.x + 1;
      await demo.keyboard.press('Escape');
      await markRead.waitFor({ state: 'hidden' });
      const overflowReturnedFocus = await focused(more);
      await more.click();
      await markRead.click();
      const marked = demo.getByText('Flagged marked as read.', { exact: true });
      await marked.waitFor();
      const appliedMarkRead = await unread.isDisabled() && await unreadCount() === 0;

      const inactiveCopy = demo.locator('[data-mail-list="inbox"] [data-message-id="field-lunch"]');
      const inactiveIsHidden = await inactiveCopy.evaluate(link => link.getClientRects().length === 0);
      const item = messages.getByRole('link', { name: /Lunch pickup/ });
      await item.waitFor();
      await item.evaluate(link => link.scrollIntoView({ block: 'center' }));
      const savedOffset = await scroller.evaluate(element => element.scrollTop);
      await item.click();
      const title = demo.getByRole('heading', { name: 'Lunch pickup', exact: true });
      await title.waitFor();
      const detailFocused = await focused(title);
      const body = await demo.locator('#message-body').textContent();
      const message = new URL(demo.url()).searchParams.get('message');

      await demo.setViewportSize(portrait);
      await demo.waitForFunction(() => document.querySelector('#mail-commands').orientation === 'horizontal');
      const detailPreserved = await title.isVisible() && await focused(title);
      await demo.getByRole('button', { name: '← Back to mail' }).click();
      await demo.waitForURL(url => url.search === '?folder=flagged');
      await selected.waitFor();
      await messages.waitFor();
      await expectPlacement(demo, false);
      await demo.waitForFunction(() => document.activeElement?.dataset.messageId === 'field-lunch');
      await demo.waitForFunction(saved =>
        Math.abs(document.querySelector('[data-mail-list="flagged"]').scrollTop - saved) <= 1, savedOffset);
      const returnedRow = await item.evaluate(link => {
        const row = link.getBoundingClientRect();
        const viewport = link.closest('.message-scroll').getBoundingClientRect();
        return link === document.activeElement && row.bottom > viewport.top && row.top < viewport.bottom;
      });
      const restoredReadState = await unreadCount() === 0;
      await sort.click();
      await demo.getByText('Oldest messages first.', { exact: true }).waitFor();
      const sorted = await titles();
      return {
        count: before.length,
        first: before[0],
        initiallyUnread,
        landscapeFolder,
        listPreserved: rotatedList.every((title, index) => title === before[index]) && rotatedList.length === before.length,
        overflowFocused,
        overflowBesideRail,
        overflowReturnedFocus,
        appliedMarkRead,
        inactiveIsHidden,
        detailFocused,
        body,
        message,
        detailPreserved,
        returnedFolder: new URL(demo.url()).searchParams.get('folder'),
        restoredScroll: savedOffset > 0,
        returnedRow,
        restoredReadState,
        sorted: sorted.length === before.length && sorted.every((title, index) => title === before.at(-index - 1)),
      };
    } finally {
      await demo.close();
    }
  },
};
