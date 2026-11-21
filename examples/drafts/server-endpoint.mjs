import { createHash } from 'node:crypto';

const base = '/examples/drafts/api/submissions/';
const keyPattern = /^(?:[\da-f]{32}|[\da-f-]{36})\.([a-z\d-]{1,64}):([1-9]\d{0,14})$/i;
const bodyLimit = 256 * 1024;
const fileLimit = 128 * 1024;
const receipts = new Map();

function respond(response, status, value, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  }).end(JSON.stringify(value));
}

async function readPayload(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > bodyLimit) {
      request.resume();
      return { status: 413 };
    }
    chunks.push(chunk);
  }
  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    return { status: 400 };
  }
}

function validate(data, id, version) {
  if (data?.id !== id || data.version !== version || typeof data.summary !== 'string'
    || !data.summary || data.summary.length > 100 || typeof data.notes !== 'string'
    || data.notes.length > 8000 || typeof data.due !== 'string' || !/^(?:\d{4}-\d{2}-\d{2})?$/.test(data.due)) return null;
  let file = null;
  if (data.file !== null) {
    const input = data.file;
    if (!input || typeof input.name !== 'string' || input.name.length > 255
      || typeof input.type !== 'string' || input.type.length > 255 || typeof input.data !== 'string'
      || input.data.length % 4 || !/^[a-z\d+/]*={0,2}$/i.test(input.data)
      || Buffer.byteLength(input.data, 'base64') > fileLimit) return null;
    file = { name: input.name, type: input.type, data: input.data };
  }
  return { id, version, summary: data.summary, notes: data.notes, due: data.due, file };
}

export async function handleDraftsRequest(request, response, url) {
  if (!url.pathname.startsWith(base)) return false;
  let key;
  try {
    key = decodeURIComponent(url.pathname.slice(base.length));
  } catch {
    respond(response, 400, { error: 'Invalid key' });
    return true;
  }
  const match = keyPattern.exec(key);
  if (!match) {
    respond(response, 400, { error: 'Invalid key' });
  } else if (request.method === 'GET') {
    const entry = receipts.get(key);
    respond(response, entry ? 200 : 404, entry?.receipt ?? { error: 'No receipt' });
  } else if (request.method === 'POST') {
    await submit(request, response, key, match[1], Number(match[2]));
  } else {
    respond(response, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  }
  return true;
}

async function submit(request, response, key, id, version) {
  if (request.headers['idempotency-key'] !== key || !/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) {
    request.resume();
    respond(response, 400, { error: 'Expected an idempotency key and a JSON request' });
    return;
  }
  const { data, status } = await readPayload(request);
  const payload = validate(data, id, version);
  if (!payload) {
    respond(response, status ?? 422, { error: 'Invalid revision' });
    return;
  }
  const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const existing = receipts.get(key);
  if (existing) {
    if (existing.digest === digest) respond(response, 200, existing.receipt);
    else respond(response, 409, { error: 'This key already identifies different answers' });
    return;
  }
  const receipt = { idempotencyKey: key, id, version, acceptedAt: new Date().toISOString() };
  receipts.set(key, { digest, receipt });
  respond(response, 201, receipt);
}
