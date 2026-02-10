/**
 * Cursor encoding/decoding for feed pagination.
 *
 * Two cursor modes:
 * - **Keyset** (sort=new): uses (created_at, id) for stable, gap-free pagination.
 * - **Offset** (sort=top/controversial/hot): uses numeric offset because vote-based
 *   sort order is inherently unstable (scores change between requests).
 */

interface KeysetCursorData {
  /** ISO timestamp string */
  t: string;
  /** feed_items.id */
  i: number;
}

interface OffsetCursorData {
  /** numeric offset */
  o: number;
}

export function encodeCursor(createdAt: string | Date, id: number): string {
  const data: KeysetCursorData = {
    t: typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
    i: id,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: string; id: number } | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data: KeysetCursorData = JSON.parse(json);
    if (!data.t || typeof data.i !== 'number') return null;
    return { createdAt: data.t, id: data.i };
  } catch {
    return null;
  }
}

export function encodeOffsetCursor(offset: number): string {
  const data: OffsetCursorData = { o: offset };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeOffsetCursor(cursor: string): number | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data: OffsetCursorData = JSON.parse(json);
    if (typeof data.o !== 'number' || data.o < 0) return null;
    return data.o;
  } catch {
    return null;
  }
}
