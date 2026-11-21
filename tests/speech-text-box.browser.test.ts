import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/speech-text-box.js';
import type {
  MetroSpeechCandidate, MetroSpeechOptions, MetroSpeechRecognizedDetail, MetroSpeechTextBox,
} from '../src/speech-text-box.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

function installAdapter(box: MetroSpeechTextBox) {
  const requests: {
    options: MetroSpeechOptions;
    resolve: (results: readonly MetroSpeechCandidate[]) => void;
    reject: (error: Error) => void;
  }[] = [];
  box.speechAdapter = options => new Promise((resolve, reject) => requests.push({ options, resolve, reject }));
  return requests;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro speech text box', () => {
  test('leases one recognition request and confirms an alternative before replacing the saved selection', async () => {
    const container = mount(`
      <form><metro-speech-text-box label="Message" language="en-GB" name="note" value="Hello world"></metro-speech-text-box></form>
    `);
    const box = container.querySelector('metro-speech-text-box')!;
    const form = container.querySelector('form')!;
    const requests = installAdapter(box);
    const field = page.getByRole('textbox', { name: 'Message' });
    const microphone = page.getByRole('button', { name: 'Speak' });
    const status = page.getByRole('status');
    const successes: MetroSpeechRecognizedDetail[] = [];
    const inserted: string[] = [];
    form.addEventListener('metro-speech-recognized', event => successes.push(event.detail));
    form.addEventListener('input', () => inserted.push(box.value));

    await userEvent.click(field);
    box.setSelectionRange(6, 11);
    await userEvent.click(microphone);
    expect(requests[0].options.language).toBe('en-GB');
    expect(box.startRecognition()).toBe(false);
    await expect.element(status).toHaveTextContent('Listening…');
    requests[0].options.onProcessing();
    await expect.element(status).toHaveTextContent('Processing speech…');
    requests[0].resolve([{ text: 'Mars', confidence: .75 }, { text: 'Venus', confidence: .65 }]);
    const first = page.getByRole('radio', { name: 'Mars' });
    const alternative = page.getByRole('radio', { name: 'Venus' });
    await expect.element(first).toBeChecked();
    expect(new FormData(form).get('note')).toBe('Hello world');
    await userEvent.click(first);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(alternative).toBeChecked();
    expect(inserted).toEqual([]);
    await userEvent.click(page.getByRole('button', { name: 'Use text' }));
    expect(successes).toEqual([{ text: 'Venus', confidence: .65, requestId: 1 }]);
    expect(inserted).toEqual(['Hello Venus']);
    expect(new FormData(form).get('note')).toBe('Hello Venus');
    await expect.poll(() => box.shadowRoot?.activeElement).toBe(field.element());
  });

  test('discards late results and keeps typed input after failure or cancellation', async () => {
    const container = mount('<metro-speech-text-box label="Note"></metro-speech-text-box>');
    const box = container.querySelector('metro-speech-text-box')!;
    const requests = installAdapter(box);
    const field = page.getByRole('textbox', { name: 'Note' });
    const microphone = page.getByRole('button', { name: 'Speak' });
    const status = page.getByRole('status');
    await userEvent.click(microphone);
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    expect(requests[0].options.signal.aborted).toBe(true);
    await expect.element(status).toHaveTextContent('Speech recognition stopped.');
    expect(box.shadowRoot?.activeElement).toBe(microphone.element());

    await userEvent.click(microphone);
    requests[0].resolve([{ text: 'Late' }]);
    await expect.element(status).toHaveTextContent('Listening…');
    const cancel = page.getByRole('button', { name: 'Cancel' });
    (cancel.element() as HTMLButtonElement).focus();
    requests[1].reject(new Error('unavailable'));
    await expect.element(status).toHaveTextContent('No speech result. Try again or type your text.');
    expect(box.shadowRoot?.activeElement).toBe(microphone.element());

    await userEvent.click(microphone);
    await userEvent.click(field);
    await userEvent.keyboard('typed');
    expect(requests[2].options.signal.aborted).toBe(true);
    requests[2].resolve([{ text: 'Late after edit' }]);
    await expect.element(field).toHaveValue('typed');
    await expect.element(page.getByRole('button', { name: 'Use text' })).not.toBeInTheDocument();
  });

  test('allows an application to veto the result and disables only speech when configured without a provider', async () => {
    const container = mount('<metro-speech-text-box label="Reply" maxlength="5"></metro-speech-text-box>');
    const box = container.querySelector('metro-speech-text-box')!;
    const field = page.getByRole('textbox', { name: 'Reply' });
    const mic = page.getByRole('button', { name: 'Speak' });
    box.speechAdapter = null;
    await expect.element(mic).toBeDisabled();
    expect(box.speechStatus).toBe('unavailable');
    await userEvent.click(field);
    await userEvent.keyboard('Hi ');

    const requests = installAdapter(box);
    await userEvent.click(mic);
    requests[0].resolve([{ text: 'there' }]);
    const use = page.getByRole('button', { name: 'Use text' });
    await expect.element(use).toBeEnabled();
    box.addEventListener('metro-speech-recognized', event => event.preventDefault(), { once: true });
    await userEvent.click(use);
    await expect.element(field).toHaveValue('Hi ');
    await userEvent.click(use);
    await expect.element(field).toHaveValue('Hi th');
  });

  test('connects the native browser capability and forwards start and cancellation without requesting a microphone', async () => {
    let started = 0;
    let aborted = 0;
    class Recognition {
      start() { started++; }
      abort() { aborted++; }
    }
    const previous = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    try {
      const container = mount('<metro-speech-text-box label="Dictation"></metro-speech-text-box>');
      const box = container.querySelector('metro-speech-text-box')!;
      expect(box.speechAvailable).toBe(true);
      await userEvent.click(page.getByRole('button', { name: 'Speak' }));
      expect(started).toBe(1);
      await userEvent.keyboard('{Escape}');
      expect(aborted).toBe(1);
      expect(box.speechStatus).toBe('cancelled');
    } finally {
      if (previous) Object.defineProperty(window, 'SpeechRecognition', previous);
      else Reflect.deleteProperty(window, 'SpeechRecognition');
    }
  });
});
