import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { MetroSpeechCandidate } from '../src/speech-text-box.js';
import type {} from '../src/frame.js';

let frame: HTMLIFrameElement | undefined;

afterEach(() => frame?.remove());

function mount(query = '') {
  frame = document.createElement('iframe');
  frame.title = 'Survey locations example';
  frame.src = `/examples/speech/${query}`;
  frame.style.cssText = 'width: 700px; height: 725px; border: 0';
  document.body.append(frame);
  return page.frameLocator(page.getByTitle(frame.title));
}

const documentInDemo = () => frame!.contentDocument!;
const readFrame = () => documentInDemo().querySelector('metro-frame')!;
const readSpeech = () => documentInDemo().querySelector('metro-speech-text-box')!;

function deferredRecognition() {
  const requests: Array<{
    signal: AbortSignal;
    processing: () => void;
    result: PromiseWithResolvers<readonly MetroSpeechCandidate[]>;
  }> = [];
  readSpeech().speechAdapter = ({ signal, onProcessing }) => {
    const result = Promise.withResolvers<readonly MetroSpeechCandidate[]>();
    requests.push({ signal, processing: onProcessing, result });
    return result.promise;
  };
  return requests;
}

const northDetail = 'Check the loading gate and confirm the marked delivery lanes.';
const westDetail = 'Review the equipment register before the next stock count.';

test('shares one destination between a visible command, confirmed speech and typed input', async () => {
  const demo = mount();
  const direct = demo.getByRole('region', { name: 'Destinations' }).getByRole('button', { name: 'North depot' });
  const back = demo.getByRole('button', { name: 'Back' });
  await userEvent.click(direct);
  await expect.element(demo.getByText(northDetail)).toBeVisible();
  const visibleVisit = readFrame().visit;
  expect(visibleVisit?.params).toBe('north');
  await userEvent.click(back);
  await expect.poll(() => documentInDemo().activeElement).toBe(direct.element());

  const recognition = deferredRecognition();
  await userEvent.click(demo.getByRole('button', { name: 'Speak' }));
  await expect.element(demo.getByText('Listening…')).toBeVisible();
  recognition[0].processing();
  await expect.element(demo.getByText('Processing speech…')).toBeVisible();
  recognition[0].result.resolve([{ text: 'Open North depot' }]);
  await userEvent.click(demo.getByRole('button', { name: 'Run voice command' }));
  await expect.element(demo.getByText(northDetail)).toBeVisible();
  expect(readFrame().visit).toEqual(visibleVisit);
  await userEvent.click(back);

  await userEvent.fill(demo.getByRole('textbox', { name: 'Place name' }), 'Open West depot');
  await userEvent.click(demo.getByRole('button', { name: 'Find destination' }));
  await expect.element(demo.getByText(westDetail)).toBeVisible();
  expect(readFrame().visit?.params).toBe('west');
});

test('combines ambiguous speech with explicit choice, discards a cancelled request and offers another attempt', async () => {
  const demo = mount();
  const editor = demo.getByRole('textbox', { name: 'Place name' });
  await expect.element(editor).toBeVisible();
  const requests = deferredRecognition();
  const speak = demo.getByRole('button', { name: 'Speak' });
  const back = demo.getByRole('button', { name: 'Back' });
  await userEvent.click(speak);
  await userEvent.click(back);
  expect(requests[0].signal.aborted).toBe(true);
  expect(readSpeech().shadowRoot?.activeElement).toBe(speak.element());
  requests[0].result.resolve([{ text: 'Open North depot' }]);
  await expect.element(demo.getByText('Speech recognition stopped.')).toBeVisible();
  expect(readFrame().value).toBe('locations');

  await userEvent.click(speak);
  requests[1].result.reject(new Error('Permission denied'));
  await expect.element(demo.getByText('No speech result. Try again or type your text.')).toBeVisible();
  await expect.element(speak).toBeEnabled();
  await userEvent.click(speak);
  requests[2].result.resolve([{ text: 'Open depot' }]);
  await userEvent.click(demo.getByRole('button', { name: 'Run voice command' }));
  const matches = demo.getByRole('region', { name: 'Choose a matching place' });
  await expect.element(matches).toBeVisible();
  expect(readFrame().value).toBe('locations');
  expect(readFrame().canGoBack).toBe(false);
  await userEvent.click(matches.getByRole('button', { name: 'West depot' }));
  await expect.element(demo.getByText(westDetail)).toBeVisible();
  await userEvent.click(back);
  await expect.poll(() => readSpeech().shadowRoot?.activeElement).toBe(editor.element());
});

test('fits speech choices and their confirmation controls at 200% text', async () => {
  const demo = mount();
  frame!.style.cssText = 'width:305px;height:460px;border:0';
  const speak = demo.getByRole('button', { name: 'Speak' });
  await expect.element(speak).toBeVisible();
  const doc = documentInDemo();
  doc.documentElement.style.fontSize = '200%';
  const requests = deferredRecognition();
  await expect.element(speak).toBeEnabled();
  (speak.element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => requests.length).toBe(1);
  requests[0].result.resolve([{ text: 'Open North depot' }, { text: 'Open West depot' }]);
  const north = demo.getByRole('radio', { name: 'Open North depot' });
  const west = demo.getByRole('radio', { name: 'Open West depot' });
  await expect.element(north).toBeChecked();
  await userEvent.keyboard('{Tab}{ArrowDown}');
  await expect.element(west).toBeChecked();
  expect(readSpeech().value).toBe('');
  await userEvent.keyboard('{Tab}{Tab}');

  const confirm = demo.getByRole('button', { name: 'Run voice command' });
  const root = readSpeech().shadowRoot!;
  expect(root.activeElement).toBe(confirm.element());
  const actions = root.querySelector('[part="actions"]')!.getBoundingClientRect();
  const bounds = confirm.element().getBoundingClientRect();
  expect(bounds.left).toBeGreaterThanOrEqual(actions.left - 1);
  expect(bounds.right).toBeLessThanOrEqual(actions.right + 1);
  expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
  await userEvent.keyboard('{Enter}');
  await expect.element(demo.getByText(westDetail)).toBeVisible();
  expect(demo.getByRole('heading', { name: 'West depot', level: 1, exact: true }).elements()).toHaveLength(1);
});

test('retries lookup errors and drops an outdated destination after Back or a newer command', async () => {
  const demo = mount();
  const north = demo.getByRole('button', { name: 'North depot' });
  await expect.element(north).toBeVisible();
  await expect.poll(() => documentInDemo().readyState).toBe('complete');
  const window = frame!.contentWindow!;
  const originalFetch = window.fetch.bind(window);
  const requests: Array<{ signal: AbortSignal | null | undefined; result: PromiseWithResolvers<Response> }> = [];
  window.fetch = (url, init) => {
    if (!String(url).endsWith('records.json')) return originalFetch(url, init);
    const result = Promise.withResolvers<Response>();
    requests.push({ signal: init?.signal, result });
    return result.promise;
  };
  const records = () => new Response(JSON.stringify({
    north: { title: 'North depot', description: northDetail },
    west: { title: 'West depot', description: westDetail },
  }));

  await userEvent.click(north);
  await expect.poll(() => requests.length).toBe(1);
  requests[0].result.resolve(new Response(null, { status: 503 }));
  await expect.element(demo.getByText('The location could not be opened.')).toBeVisible();
  await userEvent.click(demo.getByRole('button', { name: 'Retry opening' }));
  await expect.poll(() => requests.length).toBe(2);
  await userEvent.click(demo.getByRole('button', { name: 'Back' }));
  expect(requests[1].signal?.aborted).toBe(true);
  requests[1].result.resolve(records());
  await expect.element(north).toBeVisible();
  expect(readFrame().value).toBe('locations');

  await userEvent.click(north);
  await expect.poll(() => requests.length).toBe(3);
  await userEvent.click(demo.getByRole('button', { name: 'West depot' }));
  await expect.poll(() => requests.length).toBe(4);
  expect(requests[2].signal?.aborted).toBe(true);
  requests[3].result.resolve(records());
  await expect.element(demo.getByText(westDetail)).toBeVisible();
  requests[2].result.resolve(records());
  expect(readFrame().visit?.params).toBe('west');
  expect(new URL(window.location.href).searchParams.get('record')).toBe('west');
});

test('resolves a copied URL through the same place identity', async () => {
  const demo = mount('?record=west');
  await expect.element(demo.getByText(westDetail)).toBeVisible();
  expect(readFrame().visit?.params).toBe('west');
  await userEvent.click(demo.getByRole('button', { name: 'Back' }));
  await expect.element(demo.getByRole('button', { name: 'West depot' })).toBeVisible();
  expect(frame!.contentWindow!.location.search).toBe('');
});
