import { afterEach, describe, expect, test, vi } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/file-picker.js';
import type { MetroFileRequestDetail, MetroFileSelectDetail } from '../src/file-picker.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

function file(name: string, text = name) { return new File([text], name, { type: 'text/plain' }); }

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro file picker', () => {
  test('uses native file input options, submits file values and resets silently', async () => {
    const container = mount(`
      <form>
        <label for="attachments">Attachments</label>
        <metro-file-picker id="attachments" name="attachment" accept="text/plain,.txt"
          multiple required capture="environment" context-key="draft-1"></metro-file-picker>
      </form>
    `);
    const picker = container.querySelector('metro-file-picker')!;
    const form = container.querySelector('form')!;
    const input = page.getByLabelText('Attachments');
    await expect.element(input).toHaveAttribute('type', 'file');
    await expect.element(input).toHaveAttribute('accept', 'text/plain,.txt');
    await expect.element(input).toHaveAttribute('multiple');
    await expect.element(input).toHaveAttribute('capture', 'environment');
    expect(picker.pickerAvailable).toBe(true);
    expect(picker.labels.length).toBe(1);
    expect(picker.validity.valueMissing).toBe(true);

    const events: string[] = [];
    for (const type of ['input', 'change']) form.addEventListener(type, event => {
      expect(event.target).toBe(picker);
      events.push(event.type);
    });
    const selected: MetroFileSelectDetail[] = [];
    form.addEventListener('metro-file-select', event => selected.push(event.detail));
    await userEvent.upload(input, [file('one.txt'), file('two.txt', 'test data')]);
    expect(picker.files.map(value => value.name)).toEqual(['one.txt', 'two.txt']);
    expect(form.checkValidity()).toBe(true);
    const values = new FormData(form).getAll('attachment') as File[];
    expect(values.map(value => value.name)).toEqual(['one.txt', 'two.txt']);
    expect(await values[1].text()).toBe('test data');
    expect(selected[0]).toMatchObject({ contextKey: 'draft-1', requestId: 1 });
    expect(selected[0].files).toHaveLength(2);
    expect(events).toEqual(['input', 'change']);
    await expect.element(page.getByRole('status')).toHaveTextContent('one.txt, two.txt');

    form.reset();
    expect(picker.files).toEqual([]);
    expect(new FormData(form).has('attachment')).toBe(false);
    expect(form.checkValidity()).toBe(false);
    expect(events).toEqual(['input', 'change']);
  });

  test('preserves existing files on cancel and ignores stale completion after a context change', async () => {
    const container = mount('<metro-file-picker label="Documents" context-key="draft"></metro-file-picker>');
    const picker = container.querySelector('metro-file-picker')!;
    const control = page.getByLabelText('Documents');
    await userEvent.upload(control, file('keep.txt'));
    const native = control.element() as HTMLInputElement;
    const show = vi.spyOn(native, 'showPicker').mockImplementation(() => {});
    const cancellations: MetroFileRequestDetail[] = [];
    const selections: MetroFileSelectDetail[] = [];
    picker.addEventListener('metro-file-cancel', event => cancellations.push(event.detail));
    picker.addEventListener('metro-file-select', event => selections.push(event.detail));

    expect(picker.showPicker()).toBe(true);
    expect(picker.showPicker()).toBe(false);
    native.dispatchEvent(new Event('cancel', { bubbles: true }));
    expect(picker.files[0].name).toBe('keep.txt');
    expect(cancellations).toEqual([{ contextKey: 'draft', requestId: 2 }]);

    expect(picker.showPicker()).toBe(true);
    picker.contextKey = 'other';
    picker.contextKey = 'draft';
    await userEvent.upload(control, file('stale.txt'));
    expect(picker.files[0].name).toBe('keep.txt');
    expect(selections).toEqual([]);

    picker.contextKey = 'fresh';
    expect(picker.showPicker()).toBe(true);
    await userEvent.upload(control, file('fresh.txt'));
    expect(selections[0]).toMatchObject({ contextKey: 'fresh', requestId: 4 });
    expect(picker.files[0].name).toBe('fresh.txt');
    expect(show).toHaveBeenCalledTimes(3);
    show.mockRestore();
  });

  test('excludes files from disabled fieldsets without clearing the selected data', async () => {
    const container = mount(`
      <form><fieldset><metro-file-picker name="file" label="Attachment" required></metro-file-picker></fieldset></form>
    `);
    const picker = container.querySelector('metro-file-picker')!;
    const fieldset = container.querySelector('fieldset')!;
    const form = container.querySelector('form')!;
    const input = page.getByLabelText('Attachment');
    await userEvent.upload(input, file('attachment.txt'));
    fieldset.disabled = true;
    await expect.element(input).toBeDisabled();
    expect(new FormData(form).has('file')).toBe(false);
    expect(picker.files).toHaveLength(1);
    expect(picker.showPicker()).toBe(false);
    fieldset.disabled = false;
    expect(new FormData(form).has('file')).toBe(true);
    picker.clear();
    expect(picker.files).toEqual([]);
  });

  test.each(['showPicker', 'keyboard'])('keeps a new picker request started by %s separate from a late result on its previous input', async trigger => {
    const container = mount('<metro-file-picker label="Documents" context-key="old"></metro-file-picker>');
    const picker = container.querySelector('metro-file-picker')!;
    const control = page.getByLabelText('Documents');
    await expect.element(control).toBeVisible();
    const previous = control.element() as HTMLInputElement;
    const show = vi.spyOn(HTMLInputElement.prototype, 'showPicker').mockImplementation(() => {});
    const selections: MetroFileSelectDetail[] = [];
    const cancellations: MetroFileRequestDetail[] = [];
    picker.addEventListener('metro-file-select', event => selections.push(event.detail));
    picker.addEventListener('metro-file-cancel', event => cancellations.push(event.detail));
    try {
      picker.focus();
      expect(picker.showPicker()).toBe(true);
      picker.contextKey = 'new';
      if (trigger === 'keyboard') await userEvent.keyboard(' ');
      else expect(picker.showPicker()).toBe(true);
      expect(show).toHaveBeenCalledTimes(2);
      const oldFiles = new DataTransfer();
      oldFiles.items.add(file('late.txt'));
      previous.files = oldFiles.files;
      previous.dispatchEvent(new Event('change', { bubbles: true }));
      previous.dispatchEvent(new Event('cancel', { bubbles: true }));
      expect(selections).toEqual([]);
      expect(cancellations).toEqual([]);
      const current = control.element();
      expect(current).not.toBe(previous);
      expect(picker.shadowRoot?.activeElement).toBe(current);
      expect(picker.showPicker()).toBe(false);
      await userEvent.upload(control, file('current.txt'));
      expect(selections).toHaveLength(1);
      expect(selections[0]).toMatchObject({ requestId: 2, contextKey: 'new' });
      expect(picker.files.map(value => value.name)).toEqual(['current.txt']);
    } finally {
      show.mockRestore();
    }
  });

  test.skipIf(server.browser !== 'chromium')('opens the native file chooser from the keyboard', async () => {
    const container = mount('<metro-file-picker label="Select documents" multiple></metro-file-picker>');
    const picker = container.querySelector('metro-file-picker')!;
    const input = page.getByLabelText('Select documents');
    await expect.element(input).toHaveAttribute('type', 'file');
    const session = cdp();
    await session.send('Page.enable');
    await session.send('Page.setInterceptFileChooserDialog', { enabled: true });
    let mode: string | undefined;
    await session.on('Page.fileChooserOpened', event => { mode = event.mode; });
    try {
      picker.focus();
      await userEvent.keyboard(' ');
      await expect.poll(() => mode).toBe('selectMultiple');
      await userEvent.upload(input, file('native-selection.txt'));
      expect(picker.files[0].name).toBe('native-selection.txt');
    } finally {
      await session.send('Page.setInterceptFileChooserDialog', { enabled: false });
    }
  });
});
