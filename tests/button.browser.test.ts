import { afterEach, beforeEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/button.js';
import '../src/hyperlink.js';
import '../src/icon.js';

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement('section');
  document.body.append(fixture);
});
afterEach(() => fixture.remove());

test('keyboard activation submits a validated form with the activated button value', async () => {
  fixture.innerHTML = `
    <form>
      <input aria-label="Title" name="title" required>
      <metro-button name="action" value="save" type="submit">Save</metro-button>
    </form>`;
  const form = fixture.querySelector('form')!;
  const submissions: Record<string, FormDataEntryValue>[] = [];
  form.addEventListener('submit', event => {
    event.preventDefault();
    submissions.push(Object.fromEntries(new FormData(form, event.submitter)));
  });

  let invalid = false;
  form.addEventListener('invalid', () => { invalid = true; }, true);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => invalid).toBe(true);
  expect(submissions).toEqual([]);

  await page.getByRole('textbox', { name: 'Title' }).fill('Trail report');
  (page.getByRole('button', { name: 'Save' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => submissions).toEqual([{ title: 'Trail report', action: 'save' }]);
});

test('a disabled fieldset suppresses clicks and a reset button restores native inputs', async () => {
  fixture.innerHTML = `
    <form>
      <fieldset disabled>
        <metro-button type="reset">Restore</metro-button>
      </fieldset>
      <input aria-label="Draft" value="original">
    </form>`;
  const reset = page.getByRole('button', { name: 'Restore' });
  const draft = page.getByRole('textbox', { name: 'Draft' });

  await expect.element(reset).toBeDisabled();
  fixture.querySelector('fieldset')!.disabled = false;
  await draft.fill('edited');
  await reset.click();
  await expect.element(draft).toHaveValue('original');
});

test('changing disabled on a form-associated button can re-enable its native control', async () => {
  fixture.innerHTML = '<form><metro-button>Transfer</metro-button></form>';
  const control = fixture.querySelector('metro-button')!;
  const button = page.getByRole('button', { name: 'Transfer' });
  await expect.element(button).toBeEnabled();
  control.disabled = true;
  await expect.element(button).toBeDisabled();
  control.disabled = false;
  await expect.element(button).toBeEnabled();
});

test('hyperlink retains a native anchor and declarative navigation attributes', async () => {
  fixture.innerHTML = '<metro-hyperlink href="/examples/start/" target="_blank" rel="noopener">Start screen</metro-hyperlink>';
  const link = page.getByRole('link', { name: 'Start screen' });
  await expect.element(link).toHaveAttribute('href', '/examples/start/');
  await expect.element(link).toHaveAttribute('target', '_blank');
  await expect.element(link).toHaveAttribute('rel', 'noopener');
  expect(link.element().tagName).toBe('A');
});

test('inline link icons follow the capital height of their label', async () => {
  fixture.innerHTML = `<metro-hyperlink href="/examples/mail/"><metro-icon name="mail"></metro-icon> Почта<span
    aria-hidden="true" style="display:inline-block;height:1cap;width:0"></span></metro-hyperlink>`;
  await expect.element(page.getByRole('link', { name: 'Почта' })).toBeVisible();
  const link = fixture.querySelector('metro-hyperlink')!;
  const icon = link.querySelector('metro-icon')!;
  const cap = link.querySelector('span')!;
  const centerY = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  };
  for (const [font, size] of [['16px', '1.25em'], ['20px', '1.25em'], ['32px', '1.5em']]) {
    link.style.fontSize = font;
    link.style.setProperty('--metro-icon-size', size);
    expect(Math.abs(centerY(icon) - centerY(cap))).toBeLessThan(1);
  }
});
