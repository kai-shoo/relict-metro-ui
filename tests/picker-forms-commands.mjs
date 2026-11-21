export const pickerFormCommands = {
  async recurringDaysAtLargeText({ context, page }) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 320, height: 460 });
      await demo.emulateMedia({ reducedMotion: 'reduce' });
      const url = new URL('/__metro-test/recurring-days', page.url()).href;
      await demo.route(url, route => route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html style="font-size:200%" lang="ru">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="module" src="/src/recurring-days-picker.ts"></script>
          <metro-recurring-days-picker label="Повтор" dialog-label="Дни недели" value="mon" locale="ru"
            cancel-label="Отмена" apply-label="Применить">
          </metro-recurring-days-picker>`,
      }));
      await demo.goto(url);
      const trigger = demo.getByRole('button', { name: /Повтор/ });
      const list = demo.getByRole('listbox', { name: 'Дни недели' });
      await trigger.click();
      await demo.getByRole('option', { name: 'понедельник' }).waitFor();
      await demo.keyboard.press('End');
      const sunday = demo.getByRole('option', { name: 'воскресенье' });
      const bounds = await list.boundingBox();
      const focused = await sunday.boundingBox();
      const apply = await demo.getByRole('button', { name: 'Применить', exact: true }).boundingBox();
      const fullyVisible = focused.y >= bounds.y - 1 &&
        focused.y + focused.height <= Math.min(bounds.y + bounds.height + 1, apply.y);
      const actionsFit = apply.y >= 0 && apply.y + apply.height <= 460;
      await demo.keyboard.press('Space');
      await demo.getByRole('option', { name: 'воскресенье', selected: true }).waitFor();
      await demo.keyboard.press('Escape');
      const picker = demo.locator('metro-recurring-days-picker');
      return {
        fullyVisible, actionsFit,
        value: await picker.evaluate(element => element.value),
        restoredFocus: await trigger.evaluate(element => element.getRootNode().activeElement === element),
      };
    } finally {
      await demo.close();
    }
  },
  async listPickerApply({ context, page }, shortViewport) {
    const demo = await context.newPage();
    try {
      demo.setDefaultTimeout(5000);
      await demo.setViewportSize({ width: 980, height: 760 });
      const url = new URL('/__metro-test/picker-forms-apply', page.url()).href;
      await demo.route(url, route => route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html>
          <html lang="en">
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Picker form</title>
            <script type="module" src="/src/list-picker.ts"></script>
            <form>
              <metro-list-picker label="Categories" name="category" multiple required>
                <metro-option value="archive" selected>Archive</metro-option>
                <metro-option value="notes">Notes</metro-option>
                <metro-option value="work">Work</metro-option>
              </metro-list-picker>
            </form>
          </html>`,
      }));
      await demo.goto(url);

      const trigger = demo.getByRole('button', { name: /Categories/ });
      const dialog = demo.getByRole('dialog', { name: 'Categories' });
      const list = demo.getByRole('listbox', { name: 'Categories' });
      const apply = demo.getByRole('button', { name: 'Apply', exact: true });
      const form = demo.locator('form');
      const formValues = () => form.evaluate(element => new FormData(element).getAll('category'));
      const picker = demo.locator('metro-list-picker');
      const pickerValues = () => picker.evaluate(element => element.selectedValues);

      await trigger.click();
      await dialog.waitFor();
      await demo.waitForFunction(() =>
        document.querySelector('metro-list-picker').shadowRoot.activeElement?.dataset.choice === 'archive');
      if (shortViewport) await demo.setViewportSize({ width: 390, height: 120 });
      const viewportHeight = await demo.evaluate(() => innerHeight);
      const multiselect = await list.getAttribute('aria-multiselectable');

      await demo.keyboard.press('Space');
      const emptyApplyDisabled = await apply.isDisabled();
      const emptyDraftFormValues = await formValues();

      await demo.keyboard.press('w');
      await demo.keyboard.press('Space');
      await demo.getByRole('option', { name: 'Work', selected: true }).waitFor();
      const committedBeforeApply = await pickerValues();
      await demo.getByRole('option', { name: 'Notes' }).click();
      await demo.getByRole('option', { name: 'Notes', selected: true }).waitFor();
      await apply.click();
      await dialog.waitFor({ state: 'hidden' });
      const committed = await pickerValues();
      const submitted = await formValues();
      const restoredFocus = await trigger.evaluate(element => element.getRootNode().activeElement === element);
      await form.evaluate(element => element.reset());

      return {
        viewportHeight,
        multiselect,
        emptyApplyDisabled,
        emptyDraftFormValues,
        committedBeforeApply,
        committed,
        submitted,
        restoredFocus,
        reset: await pickerValues(),
      };
    } finally {
      await demo.close();
    }
  },
};
