// Each photograph has a permanent id. Only a new capture updates the attachment for a destination.
let opening;
function openDatabase() {
  return opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('metro-camera-library', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('photos', { keyPath: 'id' });
      request.result.createObjectStore('attachments');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opening = undefined; };
      resolve(db);
    };
    request.onerror = () => { opening = undefined; reject(request.error); };
  });
}

export async function savePhoto(file, context, originalId) {
  const record = {
    id: crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)),
      part => part.toString(16).padStart(8, '0')).join(''),
    context, originalId, name: file.name, type: file.type, bytes: await file.arrayBuffer(),
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['photos', 'attachments'], 'readwrite');
    tx.objectStore('photos').add(record);
    if (!originalId) tx.objectStore('attachments').put(record.id, context);
    tx.oncomplete = () => resolve(record);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getPhoto(key, byDestination = false) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['photos', 'attachments']);
    const photos = tx.objectStore('photos');
    let request;
    if (byDestination) {
      const current = tx.objectStore('attachments').get(key);
      current.onsuccess = () => { if (current.result) request = photos.get(current.result); };
    } else request = photos.get(key);
    tx.oncomplete = () => resolve(request?.result);
    tx.onabort = () => reject(tx.error);
  });
}

export function photoURL(record) {
  return URL.createObjectURL(new Blob([record.bytes], { type: record.type }));
}
