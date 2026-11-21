import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MetroFormViewport, type MetroViewportRect } from '../src/form-viewport.js';

class VisualViewportSource extends EventTarget {
  offsetLeft = 0;
  offsetTop = 0;
  width = 600;
  height = 400;
  scale = 1;
}

class KeyboardSource extends EventTarget {
  boundingRect: MetroViewportRect = { x: 0, y: 0, width: 0, height: 0 };
  hide = vi.fn();

  move(x: number, y: number, width: number, height: number) {
    this.boundingRect = { x, y, width, height };
    this.dispatchEvent(new Event('geometrychange'));
  }
}

let viewport: MetroFormViewport | undefined;
let iframe: HTMLIFrameElement | undefined;

afterEach(() => {
  viewport?.dispose();
  viewport = undefined;
  iframe?.remove();
  iframe = undefined;
});

describe('MetroFormViewport', () => {
  test('reports visible pan and zoom geometry without interpreting it as keyboard state', () => {
    const visual = new VisualViewportSource();
    viewport = new MetroFormViewport({ visualViewport: visual, virtualKeyboard: null });
    const events = vi.fn();
    viewport.addEventListener('change', events);
    expect(viewport.snapshot).toMatchObject({
      layout: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
      keyboard: null,
      scale: 1,
    });

    visual.height = 220;
    visual.width = 300;
    visual.scale = 2;
    visual.dispatchEvent(new Event('resize'));
    visual.offsetLeft = 25;
    visual.offsetTop = 41;
    visual.dispatchEvent(new Event('scroll'));

    expect(viewport.snapshot.visible).toEqual({ x: 25, y: 41, width: 300, height: 220 });
    expect(viewport.snapshot.usable).toBe(viewport.snapshot.visible);
    expect(viewport.snapshot.scale).toBe(2);
    expect(viewport.snapshot.keyboard).toBeNull();
    expect(viewport.handleBack()).toBe(false);
    expect(events).toHaveBeenCalledTimes(2);
    expect(events.mock.calls[1][0].detail).toBe(viewport.snapshot);
    window.dispatchEvent(new Event('resize'));
    expect(events).toHaveBeenCalledTimes(2);
  });

  test('uses the layout viewport as the fallback and stops observing at disposal', () => {
    const keyboard = new KeyboardSource();
    viewport = new MetroFormViewport({ visualViewport: null, virtualKeyboard: keyboard });
    const events = vi.fn();
    viewport.addEventListener('change', events);
    expect(viewport.snapshot.visible).toBe(viewport.snapshot.layout);
    const height = viewport.snapshot.layout.height;
    keyboard.move(0, height - 160, viewport.snapshot.layout.width, 160);
    expect(viewport.snapshot.usable.height).toBe(height - 160);
    const snapshot = viewport.snapshot;

    viewport.dispose();
    keyboard.move(0, 0, 0, 0);
    window.dispatchEvent(new Event('resize'));
    expect(viewport.snapshot).toBe(snapshot);
    expect(viewport.handleBack()).toBe(false);
    expect(events).toHaveBeenCalledOnce();
  });

  test('subtracts a docked overlay once when the visual viewport also resizes', () => {
    const visual = new VisualViewportSource();
    visual.offsetTop = 20;
    visual.height = 380;
    const keyboard = new KeyboardSource();
    viewport = new MetroFormViewport({ visualViewport: visual, virtualKeyboard: keyboard });
    expect(viewport.snapshot.keyboard).toEqual({ bounds: null, visible: false });
    expect(viewport.handleBack()).toBe(false);

    keyboard.move(0, 260, 600, 140);
    expect(viewport.snapshot.usable).toEqual({ x: 0, y: 20, width: 600, height: 240 });
    expect(viewport.snapshot.keyboard?.visible).toBe(true);
    expect(viewport.handleBack()).toBe(true);
    expect(keyboard.hide).toHaveBeenCalledOnce();
    expect(viewport.snapshot.keyboard?.visible).toBe(true);

    visual.height = 240;
    visual.dispatchEvent(new Event('resize'));
    expect(viewport.snapshot.usable).toBe(viewport.snapshot.visible);
    expect(viewport.snapshot.usable.height).toBe(240);
    keyboard.move(0, 0, 0, 0);
    expect(viewport.handleBack()).toBe(false);
    expect(keyboard.hide).toHaveBeenCalledOnce();
  });

  test('exposes floating bounds and lets app Back continue when hiding fails', () => {
    const visual = new VisualViewportSource();
    const keyboard = new KeyboardSource();
    keyboard.hide.mockImplementation(() => { throw new Error('This context cannot hide the keyboard'); });
    viewport = new MetroFormViewport({ visualViewport: visual, virtualKeyboard: keyboard });
    keyboard.move(100, 140, 220, 100);
    expect(viewport.snapshot.keyboard?.bounds).not.toBe(keyboard.boundingRect);
    expect(viewport.snapshot.keyboard?.bounds).toEqual({ x: 100, y: 140, width: 220, height: 100 });
    expect(viewport.snapshot.usable).toBe(viewport.snapshot.visible);
    expect(viewport.handleBack()).toBe(false);
  });
});

const fakeKeyboardScript = `
  <script>
    const keyboard = new EventTarget();
    keyboard.boundingRect = { x: 0, y: 0, width: 0, height: 0 };
    keyboard.showAt = top => {
      keyboard.boundingRect = { x: 0, y: top, width: innerWidth, height: innerHeight - top };
      keyboard.dispatchEvent(new Event('geometrychange'));
    };
    keyboard.hide = () => {
      keyboard.focusedWhenHidden = document.activeElement?.id;
      keyboard.boundingRect = { x: 0, y: 0, width: 0, height: 0 };
      keyboard.dispatchEvent(new Event('geometrychange'));
    };
    Object.defineProperty(navigator, 'virtualKeyboard', { value: keyboard });
  </script>
`;

async function mountEditor(injectKeyboard = false) {
  iframe = document.createElement('iframe');
  iframe.title = 'Contact editor example';
  iframe.style.cssText = 'width: 650px; height: 420px; border: 0';
  if (injectKeyboard) {
    const html = await fetch('/examples/keyboard/index.html').then(response => response.text());
    iframe.srcdoc = html.replace('<head>', `<head><base href="/examples/keyboard/">${fakeKeyboardScript}`);
  } else {
    iframe.src = '/examples/keyboard/';
  }
  const loaded = new Promise<void>(resolve => iframe!.addEventListener('load', () => resolve(), { once: true }));
  document.body.append(iframe);
  await loaded;
  const editor = page.frameLocator(page.getByTitle(iframe.title));
  await userEvent.click(editor.getByRole('button', { name: 'Edit contact' }));
  return editor;
}

describe('Contact editor example', () => {
  test('keeps Save and the invalid website field visible at 200% with a docked keyboard', async () => {
    const editor = await mountEditor(true);
    iframe!.style.width = '320px';
    iframe!.style.height = '460px';
    const doc = iframe!.contentDocument!;
    doc.documentElement.style.fontSize = '200%';
    const site = editor.getByRole('textbox', { name: 'Website' });
    const save = editor.getByRole('button', { name: 'Save', exact: true });
    await userEvent.fill(site, 'example.org');
    await userEvent.keyboard('{Enter}');
    await expect.element(site).toHaveAttribute('aria-invalid', 'true');
    const view = iframe!.contentWindow! as Window & {
      navigator: Navigator & { virtualKeyboard: { showAt(top: number): void } };
    };
    view.navigator.virtualKeyboard.showAt(240);
    const fields = doc.querySelector('#fields')!.getBoundingClientRect();
    const field = site.element().closest('.field')!.getBoundingClientRect();
    const saveBounds = save.element().getBoundingClientRect();
    expect(saveBounds.top).toBeGreaterThanOrEqual(fields.bottom - 1);
    expect(saveBounds.bottom).toBeLessThanOrEqual(241);
    expect(field.top).toBeGreaterThanOrEqual(fields.top - 1);
    expect(field.bottom).toBeLessThanOrEqual(fields.bottom + 1);
    expect(doc.activeElement).toBe(site.element());
    const error = doc.querySelector('#website-error')!;
    await expect.element(site).toHaveAccessibleDescription(error.textContent!);
    await userEvent.fill(site, 'https://example.org');
    await userEvent.click(save);
    await expect.element(editor.getByText('Contact saved for this visit.')).toBeVisible();
  });

  test('keeps URL validation, focus and Save in the short visible area', async () => {
    const editor = await mountEditor(true);
    const site = editor.getByRole('textbox', { name: 'Website' });
    const save = editor.getByRole('button', { name: 'Save' });
    await userEvent.fill(site, 'example.org');
    const native = site.element() as HTMLInputElement;
    expect(native.inputMode).toBe('url');
    await userEvent.click(save);
    await expect.element(site).toHaveAttribute('aria-invalid', 'true');

    const view = iframe!.contentWindow! as Window & {
      navigator: Navigator & { virtualKeyboard: { showAt(top: number): void } };
    };
    view.navigator.virtualKeyboard.showAt(228);
    const scrollArea = iframe!.contentDocument!.querySelector('#fields')!.getBoundingClientRect();
    const fieldGroup = native.closest('.field')!.getBoundingClientRect();
    expect(fieldGroup.top).toBeGreaterThanOrEqual(scrollArea.top);
    expect(fieldGroup.bottom).toBeLessThanOrEqual(scrollArea.bottom);
    expect(save.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(228);
    expect(iframe!.contentDocument!.activeElement).toBe(native);

    await userEvent.fill(site, 'https://example.org');
    await expect.element(site).not.toHaveAttribute('aria-invalid');
    await userEvent.keyboard('{Tab}');
    expect(iframe!.contentDocument!.activeElement).toBe(editor.getByRole('textbox', { name: 'Notes' }).element());
    await userEvent.click(save);
    await expect.element(editor.getByText('Contact saved for this visit.')).toBeVisible();
  });

  test('routes Back through explicit keyboard state, then confirms leaving an intact draft', async () => {
    const editor = await mountEditor(true);
    const site = editor.getByRole('textbox', { name: 'Website' });
    const back = editor.getByRole('button', { name: 'Back', exact: true });
    await userEvent.fill(site, 'https://example.org/draft');
    // A native managed keyboard requires an explicitly opted-in editor.
    site.element().setAttribute('virtualkeyboardpolicy', 'manual');
    const view = iframe!.contentWindow! as Window & {
      navigator: Navigator & { virtualKeyboard: { showAt(top: number): void; focusedWhenHidden?: string } };
    };
    view.navigator.virtualKeyboard.showAt(220);

    await userEvent.click(back);
    expect(view.navigator.virtualKeyboard.focusedWhenHidden).toBe('website');
    expect(iframe!.contentDocument!.activeElement).toBe(site.element());
    await expect.element(site).toHaveValue('https://example.org/draft');
    await expect.element(editor.getByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(back);
    await expect.element(editor.getByRole('dialog', { name: 'Leave the editor?' })).toBeVisible();
    await userEvent.click(editor.getByRole('button', { name: 'Keep editing' }));
    await expect.poll(() => iframe!.contentDocument!.activeElement).toBe(site.element());
    await userEvent.click(back);
    await userEvent.click(editor.getByRole('button', { name: 'Leave editor' }));
    await userEvent.click(editor.getByRole('button', { name: 'Edit contact' }));
    await expect.element(site).toHaveValue('https://example.org/draft');
  });

  test('restores the options trigger and keeps draft input through a native viewport resize', async () => {
    const editor = await mountEditor();
    const site = editor.getByRole('textbox', { name: 'Website' });
    const more = editor.getByRole('button', { name: 'Options' });
    await userEvent.fill(site, 'https://example.org');
    await userEvent.click(more);
    await expect.element(editor.getByRole('menuitem', { name: 'Clear website' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => iframe!.contentDocument!.activeElement).toBe(more.element());
    await expect.element(more).toHaveAttribute('aria-expanded', 'false');

    (site.element() as HTMLInputElement).focus();
    iframe!.style.height = '230px';
    const workspace = iframe!.contentDocument!.querySelector('#workspace')!;
    await expect.poll(() => workspace.getBoundingClientRect().height).toBe(230);
    await expect.element(site).toHaveValue('https://example.org');
    expect(iframe!.contentDocument!.activeElement).toBe(site.element());
  });
});
