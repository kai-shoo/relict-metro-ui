import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { MetroRichClipboardResultDetail } from '../src/rich-edit-box.js';

let frame: HTMLIFrameElement | undefined;
afterEach(() => frame?.remove());

test('clipboard example preserves both documents when a permission-delayed read loses its target', async () => {
  frame = document.createElement('iframe');
  frame.title = 'Survey notes example';
  frame.src = '/examples/clipboard/';
  frame.style.cssText = 'width: 720px; height: 560px; border: 0';
  document.body.append(frame);
  const demo = page.frameLocator(page.getByTitle(frame.title));
  const editor = demo.getByRole('textbox', { name: 'Note contents' });
  const documents = demo.getByLabelText('Document');
  const north = 'Check the loading gate.\nConfirm the marked delivery lanes.';
  const west = 'Review the equipment register.\nCheck the next stock count.';
  await expect.poll(() => frame?.contentDocument?.querySelector('metro-rich-edit-box')?.value).toBe(north);
  await expect.element(editor).toBeVisible();
  const box = frame.contentDocument!.querySelector('metro-rich-edit-box')!;
  const started = Promise.withResolvers<AbortSignal>();
  const result = Promise.withResolvers<MetroRichClipboardResultDetail>();
  const response = Promise.withResolvers<string>();
  box.clipboard = { readText: signal => {
    started.resolve(signal);
    return response.promise;
  } };
  box.addEventListener('metro-clipboard-result', event => result.resolve(event.detail), { once: true });

  await userEvent.click(editor);
  await userEvent.keyboard('{Home}{Shift>}{End}{/Shift}');
  await userEvent.click(demo.getByRole('button', { name: 'Text actions' }));
  await userEvent.click(demo.getByRole('menuitem', { name: 'Paste' }));
  const signal = await started.promise;
  expect(box.shadowRoot?.activeElement).toBe(editor.element());
  await userEvent.selectOptions(documents, 'west');
  expect(signal.aborted).toBe(true);
  response.resolve('Late text');
  expect(await result.promise).toEqual({ action: 'paste', status: 'stale' });
  await expect.poll(() => box.value).toBe(west);
  await userEvent.selectOptions(documents, 'north');
  await expect.poll(() => box.value).toBe(north);
});
