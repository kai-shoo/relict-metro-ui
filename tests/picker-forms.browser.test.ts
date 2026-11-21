import { afterEach, describe, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/list-picker.js';
import '../src/recurring-days-picker.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro list picker', () => {
  test('opens five options inline, previews with arrows and restores focus on cancel', async () => {
    const container = mount(`
      <form>
        <metro-list-picker label="Folder" name="folder" value="inbox" required>
          <metro-option value="inbox">Inbox</metro-option>
          <metro-option value="drafts" disabled>Drafts</metro-option>
          <metro-option value="sent">Sent</metro-option>
          <metro-option value="flagged">Flagged</metro-option>
          <metro-option value="trash">Trash</metro-option>
        </metro-list-picker>
      </form>
    `);
    const form = container.querySelector('form')!;
    const picker = container.querySelector('metro-list-picker')!;
    const trigger = page.getByRole('button', { name: /Folder/ });
    const list = page.getByRole('listbox', { name: 'Folder' });
    const events: [string, string][] = [];
    for (const name of ['input', 'change']) {
      form.addEventListener(name, event => events.push([event.type, picker.value]));
    }

    await userEvent.click(trigger);
    await expect.element(list).toBeVisible();
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(page.getByRole('option', { name: 'Drafts' })).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}');
    const sent = page.getByRole('option', { name: 'Sent' });
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(sent.element());
    expect(new FormData(form).get('folder')).toBe('inbox');
    expect(events).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}{Enter}');
    expect(new FormData(form).get('folder')).toBe('trash');
    expect(events).toEqual([['input', 'trash'], ['change', 'trash']]);
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
    picker.value = 'sent';
    expect(new FormData(form).get('folder')).toBe('sent');
    form.reset();
    expect(picker.value).toBe('inbox');
    expect(events).toHaveLength(2);
  });

  test('opens six or more choices in a full-height dialog and handles removed keys', async () => {
    const choices = Array.from({ length: 12 }, (_, index) =>
      `<metro-option value="folder-${index}">Folder ${index}</metro-option>`,
    ).join('');
    const container = mount(`
      <form>
        <metro-list-picker label="Archive" name="archive" value="folder-11" required>${choices}</metro-list-picker>
      </form>
    `);
    const picker = container.querySelector('metro-list-picker')!;
    const form = container.querySelector('form')!;
    const trigger = page.getByRole('button', { name: /Archive/ });
    const modal = page.getByRole('dialog', { name: 'Archive' });
    const chosen = page.getByRole('option', { name: 'Folder 11' });
    await userEvent.click(trigger);
    await expect.element(modal).toBeVisible();
    const bounds = modal.element().getBoundingClientRect();
    expect(bounds.height).toBeGreaterThan(window.innerHeight * .85);
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(chosen.element());
    expect(picker.shadowRoot!.querySelector('.list')!.scrollTop).toBeGreaterThan(0);

    picker.querySelector('[value="folder-11"]')!.remove();
    await expect.element(page.getByRole('status')).toHaveTextContent('A selected option is no longer available.');
    expect(form.checkValidity()).toBe(false);
    expect(new FormData(form).has('archive')).toBe(false);
    await userEvent.keyboard('{End}{Enter}');
    expect(picker.value).toBe('folder-10');
    expect(form.checkValidity()).toBe(true);
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  });

  test('a programmatic selection replaces an open draft and Apply stays silent', async () => {
    const container = mount(`<form>
      <metro-list-picker label="Categories" name="category" value="archive" multiple>
        <metro-option value="archive">Archive</metro-option>
        <metro-option value="news">News</metro-option>
        <metro-option value="work">Work</metro-option>
      </metro-list-picker>
    </form>`);
    const picker = container.querySelector('metro-list-picker')!;
    const form = container.querySelector('form')!;
    const trigger = page.getByRole('button', { name: /Categories/ });
    const events: string[] = [];
    for (const type of ['input', 'change']) picker.addEventListener(type, () => events.push(type));
    await trigger.click();
    await page.getByRole('option', { name: 'News' }).click();
    expect(new FormData(form).getAll('category')).toEqual(['archive']);
    picker.selectedValues = ['work'];
    await expect.element(page.getByRole('option', { name: 'Work' })).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('option', { name: 'News' })).toHaveAttribute('aria-selected', 'false');
    await page.getByRole('button', { name: 'Apply' }).click();
    expect(new FormData(form).getAll('category')).toEqual(['work']);
    expect(events).toEqual([]);
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  });

  test('an open inline ListPicker gives the first available option focus after an empty result', async () => {
    const container = mount('<metro-list-picker label="Folders"></metro-list-picker>');
    const picker = container.querySelector('metro-list-picker')!;
    await page.getByRole('button', { name: /Folders/ }).click();
    const list = page.getByRole('listbox', { name: 'Folders' });
    await expect.element(page.getByRole('status')).toBeVisible();
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(list.element());

    picker.innerHTML = `<metro-option value="disabled" disabled>Unavailable</metro-option>
      <metro-option value="archive">Archive</metro-option><metro-option value="news">News</metro-option>` +
      Array.from({ length: 3 }, (_, index) => `<metro-option value="extra-${index}">Extra ${index}</metro-option>`).join('');
    const archive = page.getByRole('option', { name: 'Archive' });
    await expect.element(archive).toBeVisible();
    const dialog = page.getByRole('dialog', { name: 'Folders' });
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(archive.element());
    await userEvent.keyboard('{Enter}');
    expect(picker.value).toBe('archive');
    expect(picker.open).toBe(false);
    await page.getByRole('button', { name: /Folders/ }).click();
    await expect.element(dialog).toBeVisible();
    await expect.poll(() => picker.shadowRoot?.activeElement).toBe(archive.element());
  });

  test.each([760, 120])('stages options and submits repeated names after Apply at %s px', async height => {
    const result = await commands.listPickerApply(height === 120);
    expect(result).toEqual({
      viewportHeight: height,
      multiselect: 'true',
      emptyApplyDisabled: true,
      emptyDraftFormValues: ['archive'],
      committedBeforeApply: ['archive'],
      committed: ['notes', 'work'],
      submitted: ['notes', 'work'],
      restoredFocus: true,
      reset: ['archive'],
    });
  });
});

describe('Metro recurring days picker', () => {
  test('keeps the focused day visible at double text size and Escape rolls back a keyboard draft', async () => {
    expect(await commands.recurringDaysAtLargeText()).toEqual({
      fullyVisible: true, actionsFit: true, value: 'mon', restoredFocus: true,
    });
  });

  test('changes locale and visual order without changing ISO-order form values', async () => {
    const container = mount(`
      <form>
        <metro-recurring-days-picker label="Répéter" dialog-label="Jours" cancel-label="Annuler"
          apply-label="Valider" name="repeat" locale="fr-FR" value="fri mon"></metro-recurring-days-picker>
      </form>
    `);
    const picker = container.querySelector('metro-recurring-days-picker')!;
    const form = container.querySelector('form')!;
    const trigger = page.getByRole('button', { name: /Répéter/ });
    const values: string[] = [];
    picker.addEventListener('change', () => values.push(picker.value));
    await userEvent.click(trigger);
    await expect.element(page.getByRole('dialog', { name: 'Jours' })).toBeVisible();
    const firstKey = () => picker.shadowRoot?.querySelector<HTMLButtonElement>('[data-choice]')?.dataset.choice;
    await expect.poll(firstKey).toBe('mon');
    expect(picker.value).toBe('mon fri');
    expect(new FormData(form).getAll('repeat')).toEqual(['mon', 'fri']);
    await userEvent.click(page.getByRole('option', { name: 'mercredi' }));
    await expect.element(page.getByRole('option', { name: 'mercredi', selected: true })).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Annuler' }));
    expect(picker.selectedDays).toEqual(['mon', 'fri']);
    expect(values).toEqual([]);

    await userEvent.click(trigger);
    const focusedKey = () => (picker.shadowRoot?.activeElement as HTMLElement | null)?.dataset.choice;
    await expect.poll(focusedKey).toBe('mon');
    picker.locale = 'en-US';
    await expect.poll(firstKey).toBe('sun');
    await expect.poll(focusedKey).toBe('mon');
    await expect.element(page.getByRole('option', { name: 'Monday', selected: true })).toBeVisible();
    await userEvent.click(page.getByRole('option', { name: 'Sunday' }));
    await userEvent.click(page.getByRole('button', { name: 'Valider' }));
    expect(values).toEqual(['mon fri sun']);
    expect(new FormData(form).getAll('repeat')).toEqual(['mon', 'fri', 'sun']);
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());
  });

  test('supports required validation, external labels, reset and disabled fieldsets', async () => {
    const container = mount(`
      <form>
        <fieldset>
          <label for="days">Notify on</label>
          <metro-recurring-days-picker id="days" name="days" required first-day-of-week="6"></metro-recurring-days-picker>
        </fieldset>
      </form>
    `);
    const picker = container.querySelector('metro-recurring-days-picker')!;
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const trigger = page.getByRole('button', { name: /Notify on/ });
    await expect.element(trigger).toBeVisible();
    expect(picker.validity.valueMissing).toBe(true);
    expect(new FormData(form).has('days')).toBe(false);
    await userEvent.click(page.getByText('Notify on'));
    expect(picker.shadowRoot?.activeElement).toBe(trigger.element());

    picker.selectedDays = ['sun', 'mon', 'sun'];
    expect(new FormData(form).getAll('days')).toEqual(['mon', 'sun']);
    expect(form.checkValidity()).toBe(true);
    picker.showPicker();
    await expect.element(page.getByRole('dialog')).toBeVisible();
    expect(picker.shadowRoot?.querySelector<HTMLButtonElement>('[data-choice]')?.dataset.choice).toBe('sat');
    fieldset.disabled = true;
    await expect.element(trigger).toBeDisabled();
    expect(picker.open).toBe(false);
    expect(new FormData(form).has('days')).toBe(false);
    fieldset.disabled = false;
    form.reset();
    expect(picker.selectedDays).toEqual([]);
    expect(picker.checkValidity()).toBe(false);
  });
});
