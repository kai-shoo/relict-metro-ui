# Survey drafts

From the repository root, run `npm run build`. Then run `npm run serve`. Open `http://127.0.0.1:4173/examples/drafts/`.

**Save on this device** saves the current revision and its attachment. **Queue for later** saves a separate copy of that revision in the outbox. **Send queued revisions** starts delivery. If the page is open when the connection returns, it resumes attempts made offline. If a revision fails to send, select **Retry** for that revision. **Cancel** stops the local attempt. If the server accepted the revision before the connection ended, its receipt can still exist.

The service worker caches the page and its assets on the first successful visit. Later visits can use the cached copy offline. Delivery runs while the page is open.

To copy the example, keep the relative path to the browser bundle or update the import in `drafts.js`. Point the sender at your own endpoint or supply an object with `find(entry, signal)` and `send(entry, signal)`. Each entry includes its `idempotencyKey`, record `id`, `version`, answers and optional Base64 attachment. The existing HTTP adapter checks a receipt with GET and sends the same revision and key with POST.

The included `server-endpoint.mjs` is a loopback demo handler. It stores receipts in the server process for the lifetime of that process. POST with the same key and answers returns the existing receipt. POST with the same key and different answers returns 409. A receipt records the matching key, record ID, revision and acceptance time.

When you deploy updated HTML, scripts, or styles, change the shell cache version in `draft-worker.js`. This lets returning clients load the matching files.
