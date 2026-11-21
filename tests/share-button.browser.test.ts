import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/share-button.js';
import type { MetroShareData, MetroShareOutcome, MetroShareResultDetail } from '../src/share-button.js';

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

describe('Metro share button', () => {
  test('starts only from a trusted activation, shares one snapshot and reports its result', async () => {
    const container = mount('<metro-share-button context-key="message">Send excerpt</metro-share-button>');
    const share = container.querySelector('metro-share-button')!;
    const button = page.getByRole('button', { name: 'Send excerpt' });
    const shared = new File(['draft'], 'note.txt', { type: 'text/plain' });
    let finish: (outcome: MetroShareOutcome) => void = () => {};
    const adapter = vi.fn((data: MetroShareData) => new Promise<MetroShareOutcome>(resolve => { finish = resolve; }));
    share.shareAdapter = { share: adapter };
    share.data = { title: 'Note', url: 'https://example.test/note', files: [shared] };
    const results: MetroShareResultDetail[] = [];
    container.addEventListener('metro-share-result', event => results.push(event.detail));
    await expect.element(button).toBeEnabled();
    (button.element() as HTMLButtonElement).click();
    expect(adapter).not.toHaveBeenCalled();

    await userEvent.click(button);
    expect(adapter).toHaveBeenCalledExactlyOnceWith({ title: 'Note', url: 'https://example.test/note', files: [shared] });
    expect(share.shareStatus).toBe('pending');
    await userEvent.keyboard('{Enter}');
    expect(adapter).toHaveBeenCalledTimes(1);
    finish('shared');
    await expect.element(page.getByRole('status')).toHaveTextContent('Shared.');
    expect(results).toEqual([{ method: 'share', status: 'shared', requestId: 1, contextKey: 'message' }]);
    expect(share.shadowRoot?.activeElement).toBe(button.element());
  });

  test('offers opt-in clipboard fallback as a separate action', async () => {
    const container = mount('<metro-share-button url="https://example.test/ticket" copy-fallback></metro-share-button>');
    const share = container.querySelector('metro-share-button')!;
    share.shareAdapter = null;
    const copy = vi.fn(async () => {});
    share.copyAdapter = copy;
    const results: MetroShareResultDetail[] = [];
    share.addEventListener('metro-share-result', event => results.push(event.detail));
    const status = page.getByRole('status');
    expect(share.shareAvailable).toBe(false);
    expect(share.copyAvailable).toBe(true);
    await userEvent.click(page.getByRole('button', { name: 'Share' }));
    await expect.element(status).toHaveTextContent('This share action is unavailable.');
    expect(copy).not.toHaveBeenCalled();
    await userEvent.click(page.getByRole('button', { name: 'Copy link' }));
    await expect.element(status).toHaveTextContent('Copied to clipboard.');
    expect(copy).toHaveBeenCalledExactlyOnceWith('https://example.test/ticket');
    expect(results.map(result => [result.method, result.status])).toEqual([['share', 'unsupported'], ['copy', 'copied']]);
    share.copyFallback = false;
    await expect.element(page.getByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  test('returns focus to Share when the copy action disappears and preserves explicit app focus', async () => {
    const container = mount(`
      <metro-share-button text="Route summary" copy-fallback></metro-share-button>
      <button type="button">Return to the list</button>
    `);
    const share = container.querySelector('metro-share-button')!;
    const copy = page.getByRole('button', { name: 'Copy text', exact: true });
    const main = page.getByRole('button', { name: 'Share', exact: true });
    const next = page.getByRole('button', { name: 'Return to the list' });
    share.copyAdapter = async () => {};
    await expect.element(copy).toBeVisible();
    (copy.element() as HTMLButtonElement).focus();
    share.copyFallback = false;
    await expect.element(copy).not.toBeInTheDocument();
    expect(share.shadowRoot?.activeElement).toBe(main.element());
    await userEvent.keyboard('{Tab}');
    await expect.element(next).toHaveFocus();

    share.copyFallback = true;
    await expect.element(copy).toBeVisible();
    share.addEventListener('metro-share-result', () => {
      share.copyAdapter = null;
      (next.element() as HTMLButtonElement).focus();
    }, { once: true });
    (copy.element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(copy).not.toBeInTheDocument();
    expect(share.shareStatus).toBe('copied');
    await expect.element(next).toHaveFocus();
  });

  test('maps native capability and abort/error without opening the actual OS share surface', async () => {
    const previousShare = Object.getOwnPropertyDescriptor(navigator, 'share');
    const previousCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');
    const native = vi.fn()
      .mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'))
      .mockRejectedValueOnce(new DOMException('failed', 'NotAllowedError'));
    const canShare = vi.fn(() => true);
    Object.defineProperties(navigator, {
      canShare: { value: canShare, configurable: true },
      share: { value: native, configurable: true },
    });
    try {
      const container = mount('<metro-share-button text="Selected passage"></metro-share-button>');
      const share = container.querySelector('metro-share-button')!;
      const button = page.getByRole('button', { name: 'Share' });
      const status = page.getByRole('status');
      expect(share.shareAvailable).toBe(true);
      await userEvent.click(button);
      await expect.element(status).toHaveTextContent('Sharing cancelled.');
      await userEvent.click(button);
      await expect.element(status).toHaveTextContent('The action failed. You can try again.');
      expect(native).toHaveBeenCalledTimes(2);
      expect(native.mock.calls[0][0].text).toBe('Selected passage');
    } finally {
      if (previousShare) Object.defineProperty(navigator, 'share', previousShare);
      else Reflect.deleteProperty(navigator, 'share');
      if (previousCanShare) Object.defineProperty(navigator, 'canShare', previousCanShare);
      else Reflect.deleteProperty(navigator, 'canShare');
    }
  });

  test('ignores a late share result from an earlier route context', async () => {
    const container = mount('<metro-share-button text="Old draft" context-key="old"></metro-share-button>');
    const share = container.querySelector('metro-share-button')!;
    let finish: (outcome: MetroShareOutcome) => void = () => {};
    share.shareAdapter = { share: () => new Promise(resolve => { finish = resolve; }) };
    const results: MetroShareResultDetail[] = [];
    share.addEventListener('metro-share-result', event => results.push(event.detail));
    await userEvent.click(page.getByRole('button', { name: 'Share' }));
    expect(share.shareStatus).toBe('pending');
    share.contextKey = 'different';
    share.contextKey = 'old';
    finish('shared');
    await Promise.resolve();
    expect(share.shareStatus).toBe('idle');
    expect(results).toEqual([]);
  });
});
