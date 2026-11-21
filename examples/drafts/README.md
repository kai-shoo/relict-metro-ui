# Survey drafts

From the repository root, run `npm run build` and `npm run serve`. Open `http://127.0.0.1:4173/examples/drafts/`.

**Save on this device** saves the current revision and its attachment. **Queue for later** saves an independent copy of that revision in the outbox. **Send queued revisions** starts delivery. Attempts made offline resume when the open page reconnects. A failed attempt exposes Retry for that revision. Cancel stops the local attempt. A server receipt may already exist if the connection ends after the server accepts the revision.

The service worker saves the page and its assets on the first successful visit. Later visits can use that copy offline. Bump the cache version in `draft-worker.js` when replacing the cached assets. Delivery runs while the page is open.

To copy the example, keep the relative path to the browser bundle or update the import in `drafts.js`. Point the sender at your own endpoint or supply an object with `find(entry, signal)` and `send(entry, signal)`. Each entry includes its `idempotencyKey`, record `id`, `version`, answers and optional Base64 attachment. The existing HTTP adapter checks a receipt with GET and sends the same revision and key with POST.

The included `server-endpoint.mjs` is a loopback demo handler. It stores receipts in the server process for the lifetime of that process. POST with the same key and answers returns the existing receipt. POST with the same key and different answers returns 409. A receipt records the matching key, record ID, revision and acceptance time.

When deploying updated HTML, scripts or styles, change the shell-cache version in the service worker so returning clients receive the matching files.
