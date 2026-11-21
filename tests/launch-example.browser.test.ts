import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

const storageKey = 'metro-example-launch:v1:visit';
let frame: HTMLIFrameElement;

beforeEach(() => localStorage.removeItem(storageKey));

afterEach(() => {
  frame?.remove();
  localStorage.removeItem(storageKey);
});

function mount(query = '') {
  frame = document.createElement('iframe');
  frame.title = 'Launch example';
  frame.src = `/examples/launch/${query}`;
  frame.style.cssText = 'width: 720px; height: 590px; border: 0';
  document.body.append(frame);
  return page.frameLocator(page.getByTitle('Launch example'));
}

function save(id: string) {
  localStorage.setItem(storageKey, JSON.stringify({ route: 'record', id }));
}

describe('Survey library launch example', () => {
  test('ignores a stale saved route and keeps the splash outside Frame history', async () => {
    save('removed-record');
    const example = mount();
    await expect.element(example.getByRole('link', { name: 'North depot' })).toBeVisible();
    const doc = frame.contentDocument!;
    const navigation = doc.querySelector('metro-frame')!;
    expect(navigation.canGoBack).toBe(false);
    expect(doc.querySelector<HTMLDivElement>('#splash')?.hidden).toBe(true);
    expect([...navigation.children].map(element => element.getAttribute('value'))).toEqual(['library', 'record']);
    expect(doc.querySelector('#splash')?.getAttribute('role')).toBe('status');
  });

  test('restores a verified saved route and goes Back to the library', async () => {
    save('west');
    const example = mount();
    await expect.element(example.getByText('Review the equipment register before the next stock count.')).toBeVisible();
    await userEvent.click(example.getByRole('button', { name: 'Back to library' }));
    await expect.element(example.getByRole('link', { name: 'West depot' })).toBeVisible();
    expect(frame.contentWindow!.location.search).toBe('');
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ route: 'library' });
  });

  test('gives an explicit link priority and offers Back for an unavailable record', async () => {
    save('west');
    const example = mount('?record=north');
    await expect.element(example.getByText('Check the loading gate and confirm the marked delivery lanes.')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ route: 'record', id: 'north' });

    frame.src = '/examples/launch/?record=gone';
    await expect.element(example.getByText('This record is unavailable. Return to the library to choose another.')).toBeVisible();
    await expect.element(example.getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await userEvent.click(example.getByRole('button', { name: 'Back to library' }));
    await expect.element(example.getByRole('link', { name: 'North depot' })).toBeVisible();
  });

  test('keeps Back available during loading, aborts the stale fetch and retries a load error', async () => {
    const example = mount();
    const north = example.getByRole('link', { name: 'North depot' });
    const west = example.getByRole('link', { name: 'West depot' });
    await expect.element(north).toBeVisible();
    const view = frame.contentWindow!;
    const fetchOriginal = view.fetch.bind(view);
    let signal: AbortSignal | undefined;
    let finish: (response: Response) => void = () => {};
    view.fetch = (_url, options) => {
      signal = options?.signal ?? undefined;
      return new Promise(resolve => { finish = resolve; });
    };

    (north.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(example.getByText('Loading the record…')).toBeVisible();
    await expect.element(example.getByRole('progressbar', { name: 'Loading the record' })).toBeVisible();
    const back = example.getByRole('button', { name: 'Back to library' });
    await expect.element(back).toBeEnabled();
    await userEvent.click(back);
    expect(signal?.aborted).toBe(true);
    finish(new Response(JSON.stringify({ north: 'Stale result' })));
    await expect.element(north).toBeVisible();
    await expect.poll(() => frame.contentDocument?.activeElement).toBe(north.element());
    await expect.element(example.getByText('Stale result')).not.toBeInTheDocument();

    view.fetch = async () => new Response(null, { status: 503 });
    await userEvent.click(west);
    await expect.element(example.getByText('The record could not be loaded.')).toBeVisible();
    view.fetch = fetchOriginal;
    await userEvent.click(example.getByRole('button', { name: 'Retry' }));
    await expect.element(example.getByText('Review the equipment register before the next stock count.')).toBeVisible();
  });
});
