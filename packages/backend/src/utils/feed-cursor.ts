/**
 * Cursor encoding/decoding for keyset pagination on feed_items.
 * Uses (created_at, id) compound key for stable, gap-free pagination.
 */

interface CursorData {
  /** ISO timestamp string */
  t: string;
  /** feed_items.id */
  i: number;
}

export function encodeCursor(createdAt: string | Date, id: number): string {
  const data: CursorData = {
    t: typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
    i: id,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: string; id: number } | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data: CursorData = JSON.parse(json);
    if (!data.t || typeof data.i !== 'number') return null;
    return { createdAt: data.t, id: data.i };
  } catch {
    return null;
  }
}
