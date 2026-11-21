import { afterEach, describe, expect, test, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import '../src/camera-capture.js';
import type {
  MetroCameraCaptureDetail, MetroCameraOpenOptions, MetroCameraRequestDetail, MetroCameraSession,
} from '../src/camera-capture.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture.querySelector('metro-camera-capture')!;
}

function imageCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 16;
  const brush = canvas.getContext('2d')!;
  brush.fillStyle = '#0050ef';
  brush.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function picture() {
  return new Promise<Blob>((resolve, reject) => {
    imageCanvas().toBlob(value => value ? resolve(value) : reject(new Error('Cannot create a test image')));
  });
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
  vi.restoreAllMocks();
});

describe('Metro camera capture', () => {
  test('aligns the camera and file commands at phone width and when enlarged text wraps them', async () => {
    const camera = mount('<metro-camera-capture file-fallback style="inline-size:318px"></metro-camera-capture>');
    camera.cameraAdapter = { open: async () => ({ capture: picture }) };
    const start = page.getByRole('button', { name: 'Start camera' });
    await expect.element(start).toBeVisible();
    const picker = camera.shadowRoot!.querySelector('metro-file-picker')!;
    const fileButton = picker.shadowRoot!.querySelector('[part="button"]')!;
    const cameraButton = start.element();
    const startBounds = cameraButton.getBoundingClientRect();
    const fileBounds = fileButton.getBoundingClientRect();
    expect(fileBounds.top).toBeCloseTo(startBounds.top);
    expect(fileBounds.height).toBeCloseTo(startBounds.height);
    expect(fileBounds.left).toBeGreaterThan(startBounds.right);

    const originalFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '200%';
    try {
      const enlargedStart = cameraButton.getBoundingClientRect();
      const enlargedFile = fileButton.getBoundingClientRect();
      expect(enlargedFile.left).toBeCloseTo(enlargedStart.left);
      expect(enlargedFile.top).toBeGreaterThan(enlargedStart.bottom);
      expect(enlargedFile.right).toBeLessThanOrEqual(camera.getBoundingClientRect().right);
    } finally {
      document.documentElement.style.fontSize = originalFontSize;
    }
  });

  test.skipIf(server.browser !== 'chromium')('retake and confirmation stay visible under the full preview', async () => {
    await commands.setMetroMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    try {
      const camera = mount(`<metro-camera-capture label="Camera attachment"
        style="inline-size:320px;padding:12px;background:#111;--metro-font:Arial,sans-serif;--metro-camera-height:144px"
        data-metro-theme="dark"></metro-camera-capture>`);
      const image = await picture();
      camera.cameraAdapter = { open: async () => ({ capture: async () => image }) };
      await userEvent.click(page.getByRole('button', { name: 'Start camera' }));
      await userEvent.click(page.getByRole('button', { name: 'Take photo' }));
      await expect.element(page.getByRole('button', { name: 'Use photo' })).toBeEnabled();
      await expect.element(page.getByRole('region', { name: 'Camera attachment' })).toMatchScreenshot('camera-confirmation');
    } finally {
      await commands.setMetroMedia({ colorScheme: null, reducedMotion: null });
    }
  });

  test('stages a frame, supports retake, and emits a File only after confirmation', async () => {
    const camera = mount('<metro-camera-capture context-key="report" file-name="inspection.png" facing-mode="user"></metro-camera-capture>');
    const photo = await picture();
    const captured: MetroCameraCaptureDetail[] = [];
    const cancelled: MetroCameraRequestDetail[] = [];
    const close = vi.fn();
    const capture = vi.fn(async () => photo);
    const open = vi.fn(async (_options: MetroCameraOpenOptions) => ({ capture, close }));
    camera.cameraAdapter = { open };
    camera.addEventListener('metro-camera-capture', event => captured.push(event.detail));
    camera.addEventListener('metro-camera-cancel', event => cancelled.push(event.detail));
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const start = page.getByRole('button', { name: 'Start camera' });
    const take = page.getByRole('button', { name: 'Take photo' });
    const use = page.getByRole('button', { name: 'Use photo' });
    const preview = page.getByRole('img', { name: 'Photo preview' });

    await expect.element(start).toBeEnabled();
    (start.element() as HTMLButtonElement).click();
    expect(open).not.toHaveBeenCalled();
    await userEvent.click(start);
    expect(open.mock.calls[0][0].facingMode).toBe('user');
    await userEvent.click(take);
    await expect.element(use).toBeEnabled();
    const firstUrl = preview.element().getAttribute('src');
    expect(captured).toEqual([]);
    await userEvent.click(page.getByRole('button', { name: 'Retake' }));
    await expect.element(take).toBeEnabled();
    expect(revoke).toHaveBeenCalledWith(firstUrl);
    expect(captured).toEqual([]);

    await userEvent.click(take);
    await userEvent.click(use);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ requestId: 1, contextKey: 'report', source: 'camera' });
    expect(captured[0].file).toBeInstanceOf(File);
    expect(captured[0].file.name).toBe('inspection.png');
    expect(captured[0].file.type).toBe('image/png');
    expect(captured[0].file.size).toBe(photo.size);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(close).not.toHaveBeenCalled();
    await expect.poll(() => camera.shadowRoot?.activeElement).toBe(take.element());

    await userEvent.keyboard('{Escape}');
    expect(cancelled).toEqual([{ requestId: 1, contextKey: 'report' }]);
    expect(close).toHaveBeenCalledOnce();
    await expect.poll(() => camera.shadowRoot?.activeElement).toBe(start.element());
  });

  test('releases late permission results and discards an in-flight snapshot after the context changes', async () => {
    const camera = mount('<metro-camera-capture context-key="before"></metro-camera-capture>');
    const operations: { options: MetroCameraOpenOptions; resolve: (session: MetroCameraSession) => void }[] = [];
    camera.cameraAdapter = { open: options => new Promise(resolve => operations.push({ options, resolve })) };
    const start = page.getByRole('button', { name: 'Start camera' });
    const take = page.getByRole('button', { name: 'Take photo' });
    await userEvent.click(start);
    await expect.element(page.getByRole('status')).toHaveTextContent('Starting the camera…');
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    expect(operations[0].options.signal.aborted).toBe(true);
    await userEvent.click(start);
    const lateClose = vi.fn();
    operations[0].resolve({ capture: picture, close: lateClose });
    await expect.poll(() => lateClose.mock.calls.length).toBe(1);
    expect(camera.cameraState).toBe('starting');

    let resolveCapture: (photo: Blob) => void = () => {};
    const close = vi.fn();
    const captured: MetroCameraCaptureDetail[] = [];
    camera.addEventListener('metro-camera-capture', event => captured.push(event.detail));
    operations[1].resolve({
      capture: () => new Promise(resolve => { resolveCapture = resolve; }),
      close,
    });
    await userEvent.click(take);
    camera.contextKey = 'elsewhere';
    camera.contextKey = 'before';
    resolveCapture(await picture());
    expect(operations[1].options.signal.aborted).toBe(true);
    await expect.element(start).toBeEnabled();
    expect(close).toHaveBeenCalledOnce();
    expect(captured).toEqual([]);
    await expect.element(page.getByRole('img', { name: 'Photo preview' })).not.toBeInTheDocument();
  });

  test('uses an explicit file fallback and passes only the confirmed selection to the app', async () => {
    const camera = mount('<metro-camera-capture file-fallback context-key="local"></metro-camera-capture>');
    camera.cameraAdapter = null;
    const photo = await picture();
    const input = page.getByLabelText('Choose a photo');
    const use = page.getByRole('button', { name: 'Use photo' });
    const selections: MetroCameraCaptureDetail[] = [];
    const drafts: Event[] = [];
    camera.addEventListener('metro-camera-capture', event => selections.push(event.detail));
    for (const type of ['input', 'change', 'metro-file-select']) camera.addEventListener(type, event => drafts.push(event));
    const upload = (name: string) => userEvent.upload(input, new File([photo], name, { type: 'image/png' }));
    await expect.element(input).toHaveAttribute('accept', 'image/*');
    await expect.element(input).toHaveAttribute('capture', 'environment');

    await upload('discard.png');
    await expect.element(use).toBeEnabled();
    expect(selections).toEqual([]);
    await userEvent.click(page.getByRole('button', { name: 'Retake' }));
    await upload('approved.png');
    await userEvent.click(use);
    expect(selections).toHaveLength(1);
    expect(selections[0]).toMatchObject({ requestId: 2, contextKey: 'local', source: 'file' });
    expect(selections[0].file.name).toBe('approved.png');
    expect(drafts).toEqual([]);
    await expect.element(input).toHaveAttribute('type', 'file');
  });

  test('reports a denied camera while keeping the file option available', async () => {
    const camera = mount('<metro-camera-capture file-fallback></metro-camera-capture>');
    camera.cameraAdapter = { open: async () => { throw new DOMException('Denied', 'NotAllowedError'); } };
    await userEvent.click(page.getByRole('button', { name: 'Start camera' }));
    expect(camera.cameraState).toBe('error');
    await expect.element(page.getByText('The camera or photo could not be opened. Try again.')).toBeVisible();
    await expect.element(page.getByLabelText('Choose a photo')).toBeEnabled();
  });

  test('keeps focus explicitly assigned by the app when a fallback photo is confirmed', async () => {
    const camera = mount(`<metro-camera-capture file-fallback context-key="report"></metro-camera-capture>
      <button type="button">Continue with report</button>`);
    camera.cameraAdapter = null;
    const next = fixture!.querySelector('button')!;
    camera.addEventListener('metro-camera-capture', () => next.focus());
    const photo = new File([await picture()], 'report.png', { type: 'image/png' });
    await userEvent.upload(page.getByLabelText('Choose a photo'), photo);
    const use = page.getByRole('button', { name: 'Use photo' });
    await expect.element(use).toBeEnabled();
    await use.click();
    await expect.element(page.getByLabelText('Choose a photo')).toBeVisible();
    await camera.shadowRoot!.querySelector('metro-file-picker')!.updateComplete;
    expect(document.activeElement).toBe(next);
  });

  test.skipIf(server.browser !== 'chromium')('renders and snapshots a synthetic video stream through the native adapter', async () => {
    const source = imageCanvas();
    const stream = source.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const native = vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(stream);
    const timer = window.setInterval(() => track.requestFrame(), 25);
    try {
      const camera = mount('<metro-camera-capture></metro-camera-capture>');
      const committed: MetroCameraCaptureDetail[] = [];
      camera.addEventListener('metro-camera-capture', event => committed.push(event.detail));
      await userEvent.click(page.getByRole('button', { name: 'Start camera' }));
      expect(native).toHaveBeenCalledExactlyOnceWith({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      const video = camera.shadowRoot!.querySelector('video')!;
      await expect.poll(() => video.videoWidth).toBe(24);
      const take = page.getByRole('button', { name: 'Take photo' });
      await userEvent.click(take);
      const preview = page.getByRole('img', { name: 'Photo preview' });
      await expect.poll(() => (preview.element() as HTMLImageElement).naturalWidth).toBe(24);
      await userEvent.click(page.getByRole('button', { name: 'Use photo' }));
      expect(committed[0].file.type).toBe('image/jpeg');
      expect(committed[0].file.name).toBe('photo.jpg');
      expect(track.readyState).toBe('live');
      camera.remove();
      expect(track.readyState).toBe('ended');
      expect(video.srcObject).toBeNull();
    } finally {
      window.clearInterval(timer);
      track.stop();
    }
  });
});

test('direct camera capture emits once per shutter action and keeps the session ready', async () => {
  const camera = mount('<metro-camera-capture direct context-key="inspection"></metro-camera-capture>');
  camera.cameraAdapter = { open: async () => ({ capture: picture }) };
  const captures: MetroCameraCaptureDetail[] = [];
  camera.addEventListener('metro-camera-capture', event => captures.push(event.detail));
  await userEvent.click(page.getByRole('button', { name: 'Start camera' }));
  const shutter = page.getByRole('button', { name: 'Take photo' });
  for (const count of [1, 2]) {
    await userEvent.click(shutter);
    await expect.poll(() => captures.length).toBe(count);
    await expect.element(shutter).toBeEnabled();
    await expect.element(page.getByRole('button', { name: 'Use photo' })).not.toBeInTheDocument();
  }
  expect(captures.every(detail => detail.contextKey === 'inspection' && detail.file.type === 'image/png')).toBe(true);
});
