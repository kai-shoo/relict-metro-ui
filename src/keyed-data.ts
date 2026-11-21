export function uniqueByKey<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const keys = new Set<string>();
  return items.filter(item => {
    const key = keyOf(item);
    if (!key || keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}
