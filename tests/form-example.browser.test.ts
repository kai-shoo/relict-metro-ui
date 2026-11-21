import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type {} from '../src/index.js';

type SaveAttempt = {
  value: { summary: string; date: string };
  resolve(): void;
  reject(error: Error): void;
};
let frame: HTMLIFrameElement | undefined;

afterEach(() => frame?.remove());

async function mount(defer = true) {
  frame = document.createElement('iframe');
  frame.title = 'Inspection form example';
  frame.style.cssText = 'width: 680px; height: 690px; border: 0';
  if (defer) {
    const html = await fetch('/examples/form/index.html').then(response => response.text());
    frame.srcdoc = html.replace('<head>', `<head><base href="/examples/form/"><script>
      window.saveAttempts = [];
      window.demoStore = {
        load: async () => null,
        save: value => new Promise((resolve, reject) => window.saveAttempts.push({ value, resolve, reject })),
      };
    </script>`).replace(/<script type="module" src="[^"]*start\.js[^"]*"><\/script>/,
      '<script type="module">import { mountSurveyForm } from "./form.js"; mountSurveyForm(window.demoStore);</script>');
  } else {
    frame.src = '/examples/form/';
  }
  document.body.append(frame);
  const demo = page.frameLocator(page.getByTitle(frame.title));
  await userEvent.click(demo.getByRole('button', { name: 'Open inspection report' }));
  return demo;
}

const readFrame = () => frame!.contentDocument!.querySelector('metro-frame')!;
const attempts = () => (frame!.contentWindow as Window & { saveAttempts: SaveAttempt[] }).saveAttempts;
const back = () => userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');

test('the enlarged narrow inspection form opens the date picker with a pointer click', async () => {
  const demo = await mount();
  frame!.style.width = '320px';
  frame!.style.height = '460px';
  const doc = frame!.contentDocument!;
  doc.documentElement.style.fontSize = '200%';
  const trigger = demo.getByRole('button', { name: 'Inspection date' });
  const dialog = demo.getByRole('dialog', { name: 'Inspection date' });
  const date = doc.querySelector('metro-date-picker')!;
  await expect.element(trigger).toBeVisible();
  const actions = doc.querySelector('.commands')!;
  const bounds = actions.getBoundingClientRect();
  for (const button of actions.querySelectorAll('button')) {
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right + 1);
  }
  expect(trigger.element().getBoundingClientRect().right).toBeCloseTo(bounds.right, 0);
  await trigger.click();
  await expect.element(dialog).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  expect(date.shadowRoot?.activeElement).toBe(trigger.element());
  expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
});

test('Back and Escape each close the tentative date without dirtying the form', async () => {
  const demo = await mount();
  const date = frame!.contentDocument!.querySelector('metro-date-picker')!;
  const trigger = demo.getByRole('button', { name: 'Inspection date' });
  const dialog = demo.getByRole('dialog', { name: 'Inspection date' });
  const day = demo.getByRole('spinbutton', { name: 'Day' });
  for (const dismiss of [() => userEvent.keyboard('{Escape}'), back]) {
    await userEvent.click(trigger);
    await expect.element(dialog).toBeVisible();
    (day.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(day).toHaveAttribute('aria-valuenow', '28');
    expect(date.value).toBe('2028-02-29');
    await dismiss();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.poll(() => date.shadowRoot?.activeElement).toBe(trigger.element());
    expect(readFrame().value).toBe('editor');
    expect(date.value).toBe('2028-02-29');
  }

  await userEvent.click(demo.getByRole('button', { name: 'Back', exact: true }));
  await expect.element(demo.getByRole('button', { name: 'Open inspection report' })).toBeVisible();
  expect(attempts()).toEqual([]);
});

test('keeps the focused title, its label and inline error visible in the enlarged narrow form', async () => {
  const demo = await mount();
  frame!.style.width = '320px';
  frame!.style.height = '460px';
  const doc = frame!.contentDocument!;
  doc.documentElement.style.fontSize = '200%';
  const title = demo.getByRole('textbox', { name: 'Report title' });
  const summary = doc.querySelector('metro-text-box')!;
  const error = doc.querySelector('#summary-error')!;
  await userEvent.fill(title, '  ');
  await userEvent.click(demo.getByRole('button', { name: 'Save', exact: true }));
  await expect.element(demo.locator('#summary-error')).toBeVisible();
  await expect.poll(() => summary.shadowRoot?.activeElement).toBe(title.element());
  const label = summary.shadowRoot!.querySelector('label')!;
  expect(label.getBoundingClientRect().top).toBeGreaterThanOrEqual(-1);
  expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(doc.documentElement.clientHeight + 1);
  await expect.element(title).toHaveAccessibleDescription('Enter a title for the report. Use a short title for the inspection.');
  await userEvent.click(demo.getByRole('button', { name: 'Back', exact: true }));
  const confirm = demo.getByRole('dialog', { name: 'Leave the report?' });
  await expect.element(confirm).toBeVisible();
  await userEvent.click(demo.getByRole('button', { name: 'Save and leave' }));
  await expect.element(confirm).not.toBeInTheDocument();
  await expect.poll(() => summary.shadowRoot?.activeElement).toBe(title.element());
  expect(readFrame().value).toBe('editor');
  expect(label.getBoundingClientRect().top).toBeGreaterThanOrEqual(-1);
  expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(doc.documentElement.clientHeight + 1);
  expect(attempts()).toEqual([]);
  await userEvent.fill(title, 'Revised title');
  await expect.element(title).not.toHaveAttribute('aria-invalid');
  await expect.element(title).toHaveAccessibleDescription('Use a short title for the inspection.');
  await expect.element(demo.locator('#summary-error')).not.toBeVisible();
});

test('holds the original Back through a failed save, retries once and restores the report entry focus', async () => {
  const demo = await mount();
  const title = demo.getByRole('textbox', { name: 'Report title' });
  const report = readFrame();
  let backCommits = 0;
  report.addEventListener('metro-navigate', event => {
    if (event.detail.direction === 'back') backCommits++;
  });
  const date = frame!.contentDocument!.querySelector('metro-date-picker')!;
  await userEvent.fill(title, 'Updated report');
  await userEvent.click(demo.getByRole('button', { name: 'Inspection date' }));
  const calendarDay = demo.getByRole('spinbutton', { name: 'Day' });
  await expect.element(calendarDay).toBeVisible();
  (calendarDay.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.click(demo.getByRole('button', { name: 'Done' }));
  expect(date.value).toBe('2028-02-28');

  const backButton = demo.getByRole('button', { name: 'Back', exact: true });
  await userEvent.click(backButton);
  const confirm = demo.getByRole('dialog', { name: 'Leave the report?' });
  await expect.element(confirm).toBeVisible();
  await back();
  await expect.element(confirm).not.toBeInTheDocument();
  await expect.element(title).toHaveValue('Updated report');
  await userEvent.click(backButton);
  await userEvent.click(demo.getByRole('button', { name: 'Save and leave' }));
  await expect.element(demo.locator('#leave-progress').getByRole('progressbar', { name: 'Saving inspection report' })).toBeVisible();
  await expect.element(demo.getByRole('button', { name: 'Save and leave' })).toBeDisabled();
  await back();
  await userEvent.keyboard('{Escape}');
  await expect.element(confirm).toBeVisible();
  expect(attempts()).toHaveLength(1);
  expect(backCommits).toBe(0);

  attempts()[0].reject(new Error('Storage unavailable'));
  await expect.element(demo.locator('#leave-error')).toHaveTextContent('Save failed. Your changes are still here.');
  expect(frame!.contentDocument!.querySelector('metro-text-box')!.value).toBe('Updated report');
  expect(date.value).toBe('2028-02-28');
  await userEvent.click(demo.getByRole('button', { name: 'Retry save and leave' }));
  expect(attempts()).toHaveLength(2);
  expect(attempts()[1].value).toEqual({ summary: 'Updated report', date: '2028-02-28' });
  attempts()[1].resolve();
  const open = demo.getByRole('button', { name: 'Open inspection report' });
  await expect.element(open).toBeVisible();
  await expect.poll(() => frame!.contentDocument!.activeElement).toBe(open.element());
  expect(backCommits).toBe(1);
  expect(report.canGoBack).toBe(false);
  await userEvent.click(open);
  await expect.element(title).toHaveValue('Updated report');
  expect(date.value).toBe('2028-02-28');
});

test('validates the editable field and persists a normal IndexedDB save across page reload', async () => {
  const demo = await mount(false);
  const title = demo.getByRole('textbox', { name: 'Report title' });
  await userEvent.fill(title, '  ');
  await userEvent.click(demo.getByRole('button', { name: 'Save', exact: true }));
  await expect.element(demo.getByText('Enter a title for the report.')).toBeVisible();
  await expect.element(title).toHaveAttribute('aria-invalid', 'true');
  const value = 'Saved inspection title';
  await userEvent.fill(title, value);
  await expect.element(title).not.toHaveAttribute('aria-invalid');
  await userEvent.click(demo.getByRole('button', { name: 'Save', exact: true }));
  await expect.element(demo.locator('#form-status')).toHaveTextContent('Report saved on this device.');
  const loaded = new Promise(resolve => frame!.addEventListener('load', resolve, { once: true }));
  frame!.src = '/examples/form/?reopened';
  await loaded;
  await userEvent.click(demo.getByRole('button', { name: 'Open inspection report' }));
  await expect.element(title).toHaveValue(value);
});
