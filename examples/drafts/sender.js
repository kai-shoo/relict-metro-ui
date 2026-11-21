async function checkReceipt(response, entry) {
  let receipt;
  try {
    receipt = await response.json();
  } catch {
    throw new Error('Incomplete or invalid receipt');
  }
  if (receipt?.idempotencyKey !== entry.idempotencyKey || receipt?.id !== entry.id
    || receipt?.version !== entry.version || typeof receipt.acceptedAt !== 'string') {
    throw new Error('The sender returned a receipt for a different revision.');
  }
  return receipt;
}

export function createDraftSender(endpoint) {
  const urlFor = entry => new URL(encodeURIComponent(entry.idempotencyKey), endpoint);
  return {
    async find(entry, signal) {
      const response = await fetch(urlFor(entry), { signal, cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Could not check the receipt (HTTP ${response.status}).`);
      return checkReceipt(response, entry);
    },
    async send(entry, signal) {
      const { id, version, summary, notes, due, file } = entry;
      const response = await fetch(urlFor(entry), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': entry.idempotencyKey },
        body: JSON.stringify({ id, version, summary, notes, due, file }),
        signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Could not send the revision (HTTP ${response.status}).`);
      return checkReceipt(response, entry);
    },
  };
}
