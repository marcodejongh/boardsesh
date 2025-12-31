/**
 * Recursively sort object keys for consistent JSON serialization in cache keys
 * This ensures that objects with the same properties in different orders
 * produce the same cache key string
 */
export function sortObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as T;
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }

  return sortedObj as T;
}
