import { afterEach, expect, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '../src/pivot.js';
import '../src/dialog.js';

afterEach(() => { document.body.replaceChildren(); });

test('RTL arrows keep the logical tab and dialog draft through 200% text, resize and a theme change', async () => {
  const root = document.createElement('section');
  root.dir = 'rtl';
  root.innerHTML = `<metro-pivot value="east" label="Routes">
    <metro-pivot-item value="east" label="East">East routes</metro-pivot-item>
    <metro-pivot-item value="west" label="West"><button id="edit">Edit route</button></metro-pivot-item>
    <metro-pivot-item value="north" label="North">North routes</metro-pivot-item>
  </metro-pivot>
  <metro-dialog label="Edit route"><label>Route name <input value="West"></label>
    <button slot="actions" data-metro-value="done">Done</button>
  </metro-dialog>`;
  document.body.append(root);
  const pivot = root.querySelector('metro-pivot')!;
  const dialog = root.querySelector('metro-dialog')!;
  const changes: string[] = [];
  pivot.addEventListener('metro-change', e => changes.push(e.detail.value));
  await page.getByRole('tab', { name: 'East' }).click();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => pivot.shadowRoot?.activeElement?.textContent?.trim()).toBe('West');
  await userEvent.keyboard('{Enter}');
  const opener = root.querySelector<HTMLButtonElement>('#edit')!;
  opener.onclick = () => dialog.show(opener);
  await userEvent.click(opener);
  const input = root.querySelector('input')!;
  await page.getByRole('textbox', { name: 'Route name' }).fill('West depot');
  input.setSelectionRange(3, 7);
  const initialFontSize = document.documentElement.style.fontSize;
  try {
    document.documentElement.style.fontSize = '200%';
    root.style.inlineSize = '260px';
    root.style.setProperty('--metro-color-scheme', 'dark');
    await commands.setMetroMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await expect.element(page.getByRole('dialog', { name: 'Edit route' })).toBeVisible();
    expect(input.matches(':focus')).toBe(true);
    expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['West depot', 3, 7]);
    expect(pivot.value).toBe('west');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect.element(page.getByRole('button', { name: 'Edit route' })).toHaveFocus();
    expect(changes).toEqual(['west']);
  } finally {
    document.documentElement.style.fontSize = initialFontSize;
    await commands.setMetroMedia({ colorScheme: null, forcedColors: null });
  }
});

test('the phone command rail keeps primary actions visible with its secondary menu disabled', async () => {
  await import('../src/command-bar.js');
  const bar = document.createElement('metro-command-bar');
  bar.style.blockSize = '25rem';
  bar.orientation = 'vertical';
  bar.mode = 'minimal';
  bar.hideSecondary = true;
  bar.commands = [{ id: 'save', label: 'Save', iconName: 'save' }, { id: 'share', label: 'Share', placement: 'secondary' }];
  document.body.append(bar);
  await expect.element(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await page.getByRole('button', { name: 'More commands' }).click();
  await expect.element(page.getByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  bar.hideSecondary = false;
  await expect.element(page.getByRole('button', { name: 'Share' })).toBeVisible();
  await page.getByRole('button', { name: 'Share' }).click();
  await expect.poll(() => bar.open).toBe(false);
});
