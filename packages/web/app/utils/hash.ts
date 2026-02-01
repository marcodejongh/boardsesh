/**
 * FNV-1a hash algorithm implementation
 * Fast, non-cryptographic hash for state verification
 * Same implementation as backend for consistency
 */
export function fnv1aHash(str: string): string {
  const FNV_PRIME = 0x01000193;
  const FNV_OFFSET_BASIS = 0x811c9dc5;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Convert to unsigned 32-bit integer and hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compute a deterministic hash of queue state
 * Used for periodic verification against server state
 */
export function computeQueueStateHash(
  queue: Array<{ uuid: string } | undefined | null>,
  currentItemUuid: string | null
): string {
  // Sort queue UUIDs for deterministic ordering
  // Filter out any undefined/null items that may have been introduced by state corruption
  const queueUuids = queue.filter((item): item is { uuid: string } => item != null && item.uuid != null).map(item => item.uuid).sort().join(',');
  const currentUuid = currentItemUuid || 'null';

  // Create canonical string representation
  const canonical = `${queueUuids}|${currentUuid}`;

  return fnv1aHash(canonical);
}
