import { afterEach, expect, test } from 'vitest';
import { cdp, page, server } from 'vitest/browser';
import '../src/text-box.js';
import '../src/password-box.js';
import '../src/list-picker.js';
import '../src/recurring-days-picker.js';

let fixture: HTMLDivElement | undefined;

function mount(markup: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

function disableReflection(element: Element) {
  Object.defineProperty(element, 'ariaDescribedByElements', { configurable: true, value: undefined });
}

afterEach(() => fixture?.remove());

test('keeps own and external descriptions in order and follows dynamic errors on the IDREF fallback', async () => {
  const container = mount(`
    <metro-text-box label="Nickname">
      <span slot="description">Use letters only</span>
    </metro-text-box>
    <p id="nickname-error">Name is unavailable</p>
  `);
  const box = container.querySelector('metro-text-box')!;
  const error = container.querySelector('#nickname-error')!;
  const editor = page.getByRole('textbox', { name: 'Nickname' });
  await expect.element(editor).toHaveAccessibleDescription('Use letters only');
  disableReflection(editor.element());
  box.setAttribute('aria-describedby', 'nickname-error extra nickname-error');
  await expect.element(editor).toHaveAccessibleDescription('Use letters only Name is unavailable');

  (error.firstChild as Text).data = 'Choose a different name';
  const extra = document.createElement('p');
  extra.id = 'extra';
  extra.hidden = true;
  extra.textContent = 'Changes apply on Save';
  container.append(extra);
  await expect.element(editor).toHaveAccessibleDescription('Use letters only Choose a different name Changes apply on Save');
  error.remove();
  await expect.element(editor).toHaveAccessibleDescription('Use letters only Changes apply on Save');

  box.removeAttribute('aria-describedby');
  await expect.element(editor).toHaveAccessibleDescription('Use letters only');
  expect(editor.element().getAttribute('aria-describedby')).toBe('description');
});

test('carries external errors to the password editor and both picker triggers on the IDREF fallback', async () => {
  const container = mount(`
    <metro-password-box label="Passphrase"></metro-password-box>
    <metro-list-picker label="Folder"><metro-option value="inbox">Inbox</metro-option></metro-list-picker>
    <metro-recurring-days-picker label="Repeats"></metro-recurring-days-picker>
    <p id="field-error">Choose a value</p>
  `);
  const password = page.getByLabelText('Passphrase');
  const folder = page.getByRole('button', { name: /Folder/ });
  const days = page.getByRole('button', { name: /Repeats/ });
  for (const [tag, locator] of [
    ['metro-password-box', password], ['metro-list-picker', folder], ['metro-recurring-days-picker', days],
  ] as const) {
    await expect.element(locator).toBeVisible();
    disableReflection(locator.element());
    container.querySelector(tag)!.setAttribute('aria-describedby', 'field-error');
    await expect.element(locator).toHaveAccessibleDescription('Choose a value');
  }

  container.querySelector('#field-error')!.textContent = 'Review the value before submitting';
  await expect.element(password).toHaveAccessibleDescription('Review the value before submitting');
  await expect.element(folder).toHaveAccessibleDescription('Review the value before submitting');
  await expect.element(days).toHaveAccessibleDescription('Review the value before submitting');
  container.querySelector('#field-error')!.remove();
  await expect.element(password).not.toHaveAccessibleDescription();
  await expect.element(folder).not.toHaveAccessibleDescription();
  await expect.element(days).not.toHaveAccessibleDescription();
});

test('uses live element references and follows a replaced description or shadow editor', async () => {
  const container = mount(`
    <metro-text-box label="Summary" description="One paragraph" aria-describedby="record-error"></metro-text-box>
    <p id="record-error">Record is missing</p>
  `);
  const box = container.querySelector('metro-text-box')!;
  const locator = page.getByRole('textbox', { name: 'Summary' });
  await expect.element(locator).toBeVisible();
  const editor = () => locator.element() as HTMLElement;
  const descriptions = () => editor().ariaDescribedByElements;
  const original = container.querySelector('#record-error')!;
  const own = box.shadowRoot!.querySelector('#description')!;
  await expect.poll(descriptions).toEqual([own, original]);

  const replacement = original.cloneNode() as HTMLElement;
  replacement.textContent = 'Try again';
  original.replaceWith(replacement);
  await expect.poll(descriptions).toEqual([own, replacement]);
  box.multiline = true;
  await expect.poll(() => editor().localName).toBe('textarea');
  await expect.poll(descriptions).toEqual([own, replacement]);

  box.removeAttribute('aria-describedby');
  expect(descriptions()).toEqual([own]);
  await expect.element(locator).toHaveAccessibleDescription('One paragraph');
});

test.skipIf(server.browser !== 'chromium')('exposes native cross-shadow descriptions in the browser accessibility tree', async () => {
  const container = mount(`
    <metro-text-box label="AX summary" description="One paragraph" aria-describedby="ax-error"></metro-text-box>
    <metro-list-picker label="AX folder" aria-describedby="ax-error">
      <metro-option value="inbox">Inbox</metro-option>
    </metro-list-picker>
    <p id="ax-error">Choose a different record</p>
  `);
  await expect.element(page.getByRole('textbox', { name: 'AX summary' })).toBeVisible();
  const session = cdp();
  const { frameTree } = await session.send('Page.getFrameTree');
  const frames = [frameTree];
  for (const frame of frames) frames.push(...(frame.childFrames ?? []));
  const frameId = frames.find(entry => entry.frame.url === location.href.split('#')[0])?.frame.id;
  expect(frameId).toBeDefined();
  const read = async () => {
    const { nodes } = await session.send('Accessibility.getFullAXTree', { frameId });
    const summary = nodes.find(node => node.role?.value === 'textbox' && node.name?.value === 'AX summary');
    const folder = nodes.find(node => node.role?.value === 'button' && String(node.name?.value).includes('AX folder'));
    return [summary?.description?.value, folder?.description?.value];
  };
  await expect.poll(read).toEqual(['One paragraph Choose a different record', 'Choose a different record']);

  container.querySelector('#ax-error')!.textContent = 'Try a different folder';
  await expect.poll(read).toEqual(['One paragraph Try a different folder', 'Try a different folder']);
  container.querySelector('metro-text-box')!.removeAttribute('aria-describedby');
  container.querySelector('metro-list-picker')!.removeAttribute('aria-describedby');
  await expect.poll(read).toEqual(['One paragraph', undefined]);
});
