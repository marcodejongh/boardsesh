import type { UserBoard } from '@boardsesh/shared-schema';

export type BoardConfig = { boardType: string; layoutId: number; sizeId: number };

/**
 * Find a UserBoard matching by slug, board config, or both.
 * Returns null if no match is found or if boards is empty/nullish.
 */
export function findMatchingBoard(
  boards: UserBoard[] | null | undefined,
  boardSlug?: string,
  boardConfig?: BoardConfig,
): UserBoard | null {
  if (!boards || boards.length === 0) return null;
  if (boardSlug) {
    return boards.find((b) => b.slug === boardSlug) ?? null;
  }
  if (boardConfig) {
    return boards.find((b) =>
      b.boardType === boardConfig.boardType &&
      b.layoutId === boardConfig.layoutId &&
      b.sizeId === boardConfig.sizeId,
    ) ?? null;
  }
  return null;
}
