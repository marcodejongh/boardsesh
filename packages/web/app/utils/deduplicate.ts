/**
 * Deduplicate an array of items by a key extracted from each item.
 * Later duplicates overwrite earlier ones (last-write-wins).
 */
export function deduplicateBy<T>(items: readonly T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}
