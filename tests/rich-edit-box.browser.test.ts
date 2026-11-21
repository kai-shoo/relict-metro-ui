import { afterEach, describe, expect, test } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/rich-edit-box.js';
import type { MetroRichClipboardResultDetail } from '../src/rich-edit-box.js';

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

async function selectStart(characters: number) {
  await userEvent.keyboard(`{Home}{Shift>}${'{ArrowRight}'.repeat(characters)}{/Shift}`);
}

function paste(editor: Element, formats: Readonly<Record<string, string>>) {
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => formats[type] ?? '' },
  });
  editor.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
}

describe('Metro rich edit box', () => {
  test.each([
    { theme: 'light', background: '#00000026', text: '#000000de' },
    { theme: 'dark', background: '#ffffffbf', text: '#000' },
  ])('uses the Phone input brushes in the $theme theme', async ({ theme, background, text }) => {
    const container = mount(`
      <metro-rich-edit-box data-metro-theme="${theme}" label="Draft" value="Readable note"></metro-rich-edit-box>
      <span style="background-color:${background}; color:${text}"></span>
    `);
    const editor = page.getByRole('textbox', { name: 'Draft' });
    await expect.element(editor).toBeVisible();
    const reference = getComputedStyle(container.querySelector('span')!);
    const styles = getComputedStyle(editor.element());
    expect(styles.backgroundColor).toBe(reference.backgroundColor);
    expect(styles.color).toBe(reference.color);
  });

  test.each(['ltr', 'rtl'])('keeps localized toolbar actions and text inside a narrow %s editor at double text size', async direction => {
    const label = 'ZwischenablageBearbeitungsaktionen'.repeat(2);
    const content = '0123456789'.repeat(12);
    const root = document.documentElement;
    const originalSize = root.style.fontSize;
    const container = mount(`
      <button type="button">Before editor</button>
      <metro-rich-edit-box dir="${direction}" label="Draft" value="${content}"
        clipboard-label="${label}"></metro-rich-edit-box>
    `);
    root.style.fontSize = '200%';
    container.style.inlineSize = '320px';
    try {
      const box = container.querySelector('metro-rich-edit-box')!;
      await box.updateComplete;
      box.clipboard = { readText: async () => 'New text' };
      const trigger = page.getByRole('button', { name: label });
      const editor = page.getByRole('textbox', { name: 'Draft' });
      const bounds = box.getBoundingClientRect();
      const controls = [...box.shadowRoot!.querySelectorAll('button'), editor.element()];
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
        expect(rect.right).toBeLessThanOrEqual(bounds.right);
        expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth + 1);
      }
      container.querySelector('button')!.focus();
      await userEvent.tab();
      expect(box.shadowRoot!.activeElement).toBe(trigger.element());
      await userEvent.keyboard('{Enter}');
      const menu = page.getByRole('menu', { name: label });
      await expect.element(menu).toBeVisible();
      const paste = menu.getByRole('menuitem', { name: 'Paste' }).element();
      expect(paste.getRootNode()).toBeInstanceOf(ShadowRoot);
      expect((paste.getRootNode() as ShadowRoot).activeElement).toBe(paste);
      await userEvent.keyboard('{Escape}');
      await expect.element(menu).not.toBeInTheDocument();
      expect(box.shadowRoot!.activeElement).toBe(trigger.element());
      expect(box.value).toBe(content);
    } finally {
      root.style.fontSize = originalSize;
    }
  });

  test('formats the native selection from the toolbar and supports native undo', async () => {
    const container = mount('<metro-rich-edit-box label="Note" value="hello world"></metro-rich-edit-box>');
    const box = container.querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Note' });
    const input: string[] = [];
    box.addEventListener('input', () => input.push(box.value));
    await userEvent.click(editor);
    await selectStart(5);
    await userEvent.click(page.getByRole('button', { name: 'Bold' }));
    expect(box.runs).toEqual([{ text: 'hello', bold: true }, { text: ' world' }]);
    expect(input).toEqual(['hello world']);
    expect(box.shadowRoot?.activeElement).toBe(editor.element());

    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.runs).toEqual([{ text: 'hello world' }]);
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(box.runs).toEqual([{ text: 'hello', bold: true }, { text: ' world' }]);
  });

  test('uses only plain clipboard text and undoes the entire replacement', async () => {
    const container = mount('<metro-rich-edit-box label="Description" value="old words"></metro-rich-edit-box>');
    const box = container.querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Description' });
    await userEvent.click(editor);
    await selectStart(3);
    paste(editor.element(), { 'text/html': '<strong>Formatted</strong>' });
    expect(box.value).toBe('old words');

    paste(editor.element(), {
      'text/html': '<strong>Formatted</strong>',
      'text/plain': '<em>literal</em>',
    });
    await expect.poll(() => box.value).toBe('<em>literal</em> words');
    expect(editor.element().querySelector('em, strong, b')).toBeNull();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.value).toBe('old words');
  });

  test('restores the selected text for a keyboard-activated toolbar button', async () => {
    const container = mount('<metro-rich-edit-box label="Draft" value="chosen text"></metro-rich-edit-box>');
    const box = container.querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Draft' });
    const underline = page.getByRole('button', { name: 'Underline' });
    await userEvent.click(editor);
    await selectStart(6);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(box.shadowRoot?.activeElement).toBe(underline.element());
    await userEvent.keyboard('{Enter}');
    expect(box.runs).toEqual([{ text: 'chosen', underline: true }, { text: ' text' }]);
    expect(box.shadowRoot?.activeElement).toBe(editor.element());
  });

  test('updates plain form text, protects read-only editing, and restores the default document', async () => {
    const container = mount(`
      <form>
        <fieldset>
          <label for="message">Message</label>
          <metro-rich-edit-box id="message" name="message" required></metro-rich-edit-box>
        </fieldset>
      </form>
    `);
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const box = container.querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Message' });
    await expect.element(editor).toBeVisible();
    expect(box.validity.valueMissing).toBe(true);
    await userEvent.click(page.getByText('Message'));
    expect(box.shadowRoot?.activeElement).toBe(editor.element());
    await userEvent.keyboard('first{Enter}second');
    expect(box.value).toBe('first\nsecond');
    expect(new FormData(form).get('message')).toBe('first\nsecond');
    expect(form.checkValidity()).toBe(true);

    box.runs = [{ text: '<img>' }, { text: 'Plain title', bold: true, italic: true }];
    expect(box.value).toBe('<img>Plain title');
    await expect.element(editor).toHaveTextContent('<img>Plain title');
    expect(editor.element().querySelector('img')).toBeNull();
    box.readOnly = true;
    await expect.element(editor).toHaveAttribute('aria-readonly', 'true');
    expect(box.insertText('ignored')).toBe(false);
    expect(new FormData(form).get('message')).toBe('<img>Plain title');

    box.readOnly = false;
    fieldset.disabled = true;
    await expect.element(page.getByRole('button', { name: 'Bold' })).toBeDisabled();
    expect(new FormData(form).has('message')).toBe(false);
    fieldset.disabled = false;
    box.defaultValue = 'Reset line';
    form.reset();
    await expect.element(editor).toHaveTextContent('Reset line');
    expect(box.runs).toEqual([{ text: 'Reset line' }]);
  });

  test.skipIf(server.browser !== 'chromium')('supports browser IME composition in the native editing surface', async () => {
    const container = mount('<metro-rich-edit-box label="Translation"></metro-rich-edit-box>');
    const box = container.querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Translation' });
    const input: [string, boolean][] = [];
    box.addEventListener('input', event => input.push([box.value, (event as InputEvent).isComposing]));
    await userEvent.click(editor);
    const session = cdp();
    await session.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    expect(input).toContainEqual(['に', true]);
    await session.send('Input.insertText', { text: '日本' });
    expect(box.value).toBe('日本');
  });
});

describe('Rich edit clipboard', () => {
  test('opens text actions from the keyboard, restores focus and uses native undo for Cut and Paste', async () => {
    const box = mount('<metro-rich-edit-box label="Clipboard note" value="old words"></metro-rich-edit-box>')
      .querySelector('metro-rich-edit-box')!;
    const writes: string[] = [];
    const results: MetroRichClipboardResultDetail[] = [];
    box.clipboard = {
      readText: async () => '<b>literal</b>',
      writeText: async text => { writes.push(text); },
    };
    box.addEventListener('metro-clipboard-result', event => results.push(event.detail));
    const editor = page.getByRole('textbox', { name: 'Clipboard note' });
    const menu = page.getByRole('menu', { name: 'Text actions' });
    const trigger = page.getByRole('button', { name: 'Text actions' });

    await userEvent.click(editor);
    await selectStart(3);
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await expect.element(menu.getByRole('menuitem', { name: 'Copy' })).toBeEnabled();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect.element(menu).not.toBeInTheDocument();
    expect(box.shadowRoot?.activeElement).toBe(editor.element());

    await userEvent.click(trigger);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.poll(() => box.value).toBe(' words');
    expect(writes).toEqual(['old']);
    expect(box.shadowRoot?.activeElement).toBe(editor.element());
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.value).toBe('old words');

    await selectStart(3);
    await userEvent.click(trigger);
    await userEvent.keyboard('{End}{Enter}');
    await expect.poll(() => box.value).toBe('<b>literal</b> words');
    expect(editor.element().querySelector('b')).toBeNull();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.value).toBe('old words');
    expect(results).toEqual([{ action: 'cut', status: 'complete' }, { action: 'paste', status: 'complete' }]);

    await editor.click({ button: 'right', position: { x: 16, y: 16 } });
    await expect.element(menu).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(box.shadowRoot?.activeElement).toBe(editor.element());
  });

  test('shares text insertion with clipboard events and keeps native paste when the async path is disabled', async () => {
    const box = mount('<metro-rich-edit-box label="Note" value="old words"></metro-rich-edit-box>')
      .querySelector('metro-rich-edit-box')!;
    const results: MetroRichClipboardResultDetail[] = [];
    box.addEventListener('metro-clipboard-result', event => results.push(event.detail));
    box.clipboard = null;
    const editor = page.getByRole('textbox', { name: 'Note' });
    await userEvent.click(editor);
    await selectStart(3);
    expect(await box.clipboardAction('paste')).toBe(false);
    const contextMenu = new MouseEvent('contextmenu', { button: 2, bubbles: true, cancelable: true });
    editor.element().dispatchEvent(contextMenu);
    expect(contextMenu.defaultPrevented).toBe(false);
    paste(editor.element(), { 'text/html': '<b>unused</b>' });
    paste(editor.element(), { 'text/plain': 'new' });
    expect(box.value).toBe('new words');
    const nativeCopy = new ClipboardEvent('copy', { bubbles: true, cancelable: true, composed: true });
    let copied = '';
    Object.defineProperty(nativeCopy, 'clipboardData', { value: { setData: (type: string, data: string) => {
      expect(type).toBe('text/plain');
      copied = data;
    } } });
    await selectStart(3);
    editor.element().dispatchEvent(nativeCopy);
    expect(copied).toBe('new');
    expect(nativeCopy.defaultPrevented).toBe(true);
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.value).toBe('old words');
    expect(results).toEqual([
      { action: 'paste', status: 'unavailable' }, { action: 'paste', status: 'empty' },
      { action: 'paste', status: 'complete' }, { action: 'copy', status: 'complete' },
    ]);
  });

  test('invalidates pending text on selection, content, or document changes', async () => {
    const box = mount('<metro-rich-edit-box label="Draft" document-key="north" value="old words"></metro-rich-edit-box>')
      .querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Draft' });
    const results: MetroRichClipboardResultDetail[] = [];
    box.addEventListener('metro-clipboard-result', event => results.push(event.detail));
    await userEvent.click(editor);
    await selectStart(3);

    function begin() {
      const response = Promise.withResolvers<string>();
      let signal: AbortSignal | undefined;
      box.clipboard = { readText: requestSignal => {
        signal = requestSignal;
        return response.promise;
      } };
      const result = box.clipboardAction('paste');
      expect(signal?.aborted).toBe(false);
      return { response, result, signal };
    }

    const selection = begin();
    await userEvent.keyboard('{ArrowRight}');
    expect(selection.signal?.aborted).toBe(true);
    expect(await selection.result).toBe(false);
    selection.response.resolve('Stale selection');
    expect(box.value).toBe('old words');

    const content = begin();
    await userEvent.keyboard('!');
    expect(content.signal?.aborted).toBe(true);
    expect(await content.result).toBe(false);
    content.response.resolve('Stale content');
    expect(box.value).toBe('old! words');

    const document = begin();
    box.documentKey = 'west';
    expect(document.signal?.aborted).toBe(true);
    expect(await document.result).toBe(false);
    document.response.resolve('Stale document');
    expect(box.value).toBe('old! words');
    await box.updateComplete;
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(box.value).toBe('old! words');
    expect(results).toEqual(Array.from({ length: 3 }, () => ({ action: 'paste', status: 'stale' })));
  });

  test('cuts only after the write succeeds and respects read-only text actions', async () => {
    const box = mount('<metro-rich-edit-box label="Note" value="old words"></metro-rich-edit-box>')
      .querySelector('metro-rich-edit-box')!;
    const editor = page.getByRole('textbox', { name: 'Note' });
    const trigger = page.getByRole('button', { name: 'Text actions' });
    const menu = page.getByRole('menu', { name: 'Text actions' });
    const response = Promise.withResolvers<void>();
    let written = '';
    box.clipboard = { writeText: text => { written = text; return response.promise; }, readText: async () => 'ignored' };
    await userEvent.click(editor);
    await selectStart(3);
    const failedCut = box.clipboardAction('cut');
    expect(written).toBe('old');
    expect(box.value).toBe('old words');
    response.reject(new DOMException('Denied', 'NotAllowedError'));
    expect(await failedCut).toBe(false);
    expect(box.value).toBe('old words');

    const delayed = Promise.withResolvers<void>();
    box.clipboard = { writeText: () => delayed.promise };
    const staleCut = box.clipboardAction('cut');
    await userEvent.keyboard('{ArrowRight}');
    delayed.resolve();
    expect(await staleCut).toBe(false);
    expect(box.value).toBe('old words');

    box.readOnly = true;
    await userEvent.click(trigger);
    await expect.element(menu.getByRole('menuitem', { name: 'Copy' })).toBeVisible();
    await expect.element(menu.getByRole('menuitem', { name: 'Cut' })).not.toBeInTheDocument();
    await expect.element(menu.getByRole('menuitem', { name: 'Paste' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(await box.clipboardAction('paste')).toBe(false);
    expect(box.value).toBe('old words');
  });
});
