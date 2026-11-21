const databaseName = 'metro-example-imports-v1';
const pendingStore = 'pending';
const importStore = 'imports';
const origins = ['share', 'launch', 'picker'];
const maxFiles = 4;
const maxFileBytes = 256 * 1024;

export const destinations = Object.freeze({ notebook: 'Notebook', archive: 'Archive' });

let database;

function openDatabase() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(pendingStore, { keyPath: 'id' });
      request.result.createObjectStore(importStore, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const connection = request.result;
      connection.onversionchange = () => { connection.close(); database = undefined; };
      resolve(connection);
    };
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}

function acceptsFile(file) {
  return file instanceof File && Boolean(file.name) && file.size <= maxFileBytes &&
    /\.(txt|md)$/i.test(file.name) && ['', 'text/plain', 'text/markdown', 'application/octet-stream'].includes(file.type);
}

export async function stageImport({ source, title = '', text = '', url = '', files = [] }) {
  if (!origins.includes(source) || typeof title !== 'string' || typeof text !== 'string' || typeof url !== 'string' ||
      title.length > 300 || text.length > 10000 || url.length > 3000 || files.length > maxFiles || !files.every(acceptsFile) ||
      !(title.trim() || text.trim() || url.trim() || files.length)) throw new TypeError('Unsupported import content');
  const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)),
    value => value.toString(16).padStart(8, '0')).join('');
  const snapshots = await Promise.all(files.map(async file => ({
    name: file.name, type: file.type, lastModified: file.lastModified, data: await file.arrayBuffer(),
  })));
  const record = { id, source, title: title.trim(), text, url: url.trim(), files: snapshots, created: Date.now() };
  const connection = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction(pendingStore, 'readwrite');
    const store = transaction.objectStore(pendingStore);
    const count = store.count();
    count.onsuccess = () => {
      if (count.result < 20) store.add(record);
    };
    transaction.oncomplete = () => count.result < 20 ? resolve(record.id) : reject(new RangeError('Pending imports are full'));
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function readImports() {
  const connection = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction([pendingStore, importStore], 'readonly');
    const pending = transaction.objectStore(pendingStore).getAll();
    const imports = transaction.objectStore(importStore).getAll();
    transaction.oncomplete = () => resolve({ pending: pending.result.sort((a, b) => b.created - a.created),
      imports: imports.result.sort((a, b) => b.accepted - a.accepted) });
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Saves the import and acknowledges its pending ID in the same transaction. */
export async function acknowledgeImport(id, destination) {
  if (!Object.hasOwn(destinations, destination)) throw new TypeError('Unknown import destination');
  const connection = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction([pendingStore, importStore], 'readwrite');
    const pending = transaction.objectStore(pendingStore);
    const request = pending.get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      transaction.objectStore(importStore).add({ ...request.result, destination, accepted: Date.now() });
      pending.delete(id);
    };
    transaction.oncomplete = () => resolve(Boolean(request.result));
    transaction.onabort = () => reject(transaction.error);
  });
}
