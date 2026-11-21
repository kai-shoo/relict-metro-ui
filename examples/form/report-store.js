const databaseName = 'metro-inspection-form';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('reports');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction(mode, query) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('reports', mode);
      const request = query(transaction.objectStore('reports'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('The transaction was cancelled.'));
    });
  } finally {
    database.close();
  }
}

export const reportStore = {
  load: () => runTransaction('readonly', reports => reports.get('inspection')),
  save: value => runTransaction('readwrite', reports => reports.put(value, 'inspection')),
};
