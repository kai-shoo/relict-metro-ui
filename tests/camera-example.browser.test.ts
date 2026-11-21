import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

let frame: HTMLIFrameElement | undefined;

afterEach(() => {
  frame?.remove();
  frame = undefined;
});

function photo(name: string) {
  const pixel = atob('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
  const bytes = Uint8Array.from(pixel, character => character.charCodeAt(0));
  return new File([bytes], name, { type: 'image/gif' });
}

test('the bundled camera example attaches only confirmed photos to the selected destination', async () => {
  frame = document.createElement('iframe');
  frame.title = 'Camera example';
  frame.src = '/examples/camera/';
  frame.style.cssText = 'width: 350px; height: 680px; border: 0';
  document.body.append(frame);
  const example = page.frameLocator(page.getByTitle('Camera example'));
  const nativeFile = example.getByLabelText('Choose a photo');
  const destination = example.getByRole('combobox', { name: 'Attach to' });
  const preview = example.getByRole('img', { name: 'Photo preview' });
  const download = example.getByRole('link', { name: 'Download photo' });
  const direct = example.getByRole('checkbox', { name: 'Save camera shots immediately' });
  await expect.element(direct).not.toBeChecked();
  expect(direct.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  (direct.element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(direct).toBeChecked();
  expect(frame.contentDocument!.querySelector('metro-camera-capture')?.direct).toBe(true);

  await userEvent.upload(nativeFile, photo('discarded.gif'));
  await expect.element(preview).toBeVisible();
  await expect.element(download).not.toBeInTheDocument();
  await userEvent.click(example.getByRole('button', { name: 'Retake' }));
  await userEvent.upload(nativeFile, photo('inspection.gif'));
  await userEvent.click(example.getByRole('button', { name: 'Use photo' }));
  await expect.element(example.getByText('inspection.gif attached to Inspection report.')).toBeVisible();
  await expect.element(download).toHaveAttribute('download', 'inspection.gif');

  await userEvent.upload(nativeFile, photo('stale.gif'));
  await expect.element(preview).toBeVisible();
  await userEvent.selectOptions(destination, 'inventory');
  await expect.element(preview).not.toBeInTheDocument();
  await expect.element(download).not.toBeInTheDocument();
  await userEvent.selectOptions(destination, 'inspection');
  await expect.element(download).toHaveAttribute('download', 'inspection.gif');
});

test('reopens a captured image by URL, saves rotated pixels as a separate photo and returns to its source', async () => {
  frame = document.createElement('iframe');
  frame.title = 'Edit camera photo';
  frame.src = '/examples/camera/?context=inventory';
  frame.style.cssText = 'width: 650px; height: 680px; border: 0';
  document.body.append(frame);
  const example = page.frameLocator(page.getByTitle(frame.title));
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 3;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 4, 3);
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(bytes => resolve(bytes!)));
  await userEvent.upload(example.getByLabelText('Choose a photo'), new File([blob], 'landscape.png', { type: 'image/png' }));
  await userEvent.click(example.getByRole('button', { name: 'Use photo' }));
  const edit = example.getByRole('link', { name: 'Edit photo' });
  await expect.element(edit).toBeVisible();
  const doc = () => frame!.contentDocument!;
  const originalHref = doc().querySelector<HTMLAnchorElement>('#edit-photo')!.href;
  await userEvent.click(edit);
  const rotate = example.getByRole('button', { name: 'Rotate clockwise' });
  const save = example.getByRole('button', { name: 'Save a copy' });
  await expect.element(rotate).toBeEnabled();
  await expect.element(save).toBeDisabled();
  const reloaded = new Promise<void>(resolve => frame!.addEventListener('load', () => resolve(), { once: true }));
  frame.contentWindow!.location.reload();
  await reloaded;
  await expect.element(example.getByText('landscape.png', { exact: true })).toBeVisible();
  await expect.element(rotate).toBeEnabled();
  await userEvent.click(rotate);
  await userEvent.click(save);
  await expect.element(example.getByText('Saved landscape-copy.png.')).toBeVisible();
  await expect.element(save).toBeDisabled();
  const copyHref = doc().querySelector<HTMLAnchorElement>('#saved-copy')!.href;
  expect(copyHref).not.toBe(originalHref);
  expect(frame.contentWindow!.location.href).toBe(originalHref);
  await userEvent.click(example.getByRole('link', { name: 'Back to camera' }));
  await expect.element(edit).toHaveFocus();
  expect(doc().querySelector<HTMLAnchorElement>('#edit-photo')!.href).toBe(originalHref);
  frame.src = copyHref;
  await expect.element(example.getByText('landscape-copy.png', { exact: true })).toBeVisible();
  const preview = doc().querySelector<HTMLImageElement>('#edit-preview')!;
  expect([preview.naturalWidth, preview.naturalHeight]).toEqual([3, 8]);
  const brush = document.createElement('canvas').getContext('2d')!;
  brush.drawImage(preview, 0, 0);
  expect([...brush.getImageData(1, 1, 1, 1).data]).toEqual([255, 0, 0, 255]);
  expect(brush.getImageData(1, 6, 1, 1).data[3]).toBe(0);
  const url = new URL(originalHref);
  url.searchParams.set('photo', 'removed');
  frame.src = url.href;
  await expect.element(example.getByText('This photo is no longer available.')).toBeVisible();
  await expect.element(save).toBeDisabled();
  await userEvent.click(example.getByRole('link', { name: 'Back to camera' }));
  await expect.element(edit).toBeVisible();
});
