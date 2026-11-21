import { expect, test } from 'vitest';
import { commands, server } from 'vitest/browser';

test.skipIf(server.browser !== 'chromium')('multipart Share Target navigation stages an import and acknowledges a deferred entry only once', async () => {
  const result = await commands.shareTargetExample();
  expect(result.delivery).toEqual({ status: 303, worker: true, multipart: true });
  expect(result.manifest.share_target).toMatchObject({ action: './incoming-share', method: 'POST', enctype: 'multipart/form-data' });
  expect(result.manifest.file_handlers).toEqual([{ action: './', accept: { 'text/plain': ['.txt'], 'text/markdown': ['.md'] } }]);
  expect(new URL(result.href).searchParams.get('incoming')).toMatch(/^[0-9a-f-]+$/);
  expect(result).toMatchObject({ hadNoReceiver: true, safePreview: true, deferred: true, cleared: true,
    originalDestination: 1, otherDestination: 0, parsedManifest: true, previewRemoved: true });
});

test('the launch consumer and native local picker stage files for the same review without silently importing', async () => {
  await expect(commands.launchFileImportExample()).resolves.toEqual({ viaPicker: true, launchStillPending: true, pickerAcknowledged: true });
});

test.skipIf(server.browser !== 'chromium')('an unsupported real multipart share leaves the import and pending stores empty', async () => {
  await expect(commands.invalidShareTargetExample()).resolves.toEqual({ delivery: { status: 303, worker: true, multipart: true },
    empty: true, emptyReceipts: true });
});
