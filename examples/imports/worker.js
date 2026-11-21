import { stageImport } from './storage.js';

const scope = self.registration.scope;
const action = new URL('incoming-share', scope);

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.origin === action.origin && url.pathname === action.pathname) {
    event.respondWith(receiveShare(event.request));
  }
});

function redirect(key, value) {
  const url = new URL(scope);
  url.searchParams.set(key, value);
  return Response.redirect(url.href, 303);
}

async function receiveShare(request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== 'null' && origin !== action.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return new Response('The import request must come from this app.', { status: 403 });
  }
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;') ||
      Number(request.headers.get('content-length')) > 1_100_000) return redirect('import-error', 'content');

  try {
    const data = await request.formData();
    const id = await stageImport({ source: 'share', title: data.get('title') ?? '', text: data.get('text') ?? '',
      url: data.get('url') ?? '', files: data.getAll('files').filter(file => !(file instanceof File && file.name === '')) });
    return redirect('incoming', id);
  } catch (error) {
    return redirect('import-error', error instanceof TypeError ? 'content' : 'storage');
  }
}
