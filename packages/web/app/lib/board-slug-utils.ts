import { cache } from 'react';
import { ParsedBoardRouteParameters, BoardName } from '@/app/lib/types';

export type ResolvedBoard = {
  uuid: string;
  slug: string;
  boardType: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  name: string;
  description?: string | null;
  locationName?: string | null;
  isPublic: boolean;
  isOwned: boolean;
  ownerId: string;
};

/**
 * Get the HTTP GraphQL endpoint URL from NEXT_PUBLIC_WS_URL.
 * Matches the pattern used in server-cached-client.ts and client.ts.
 */
function getGraphQLHttpUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsUrl) {
    throw new Error('NEXT_PUBLIC_WS_URL environment variable is not set');
  }
  return wsUrl.replace(/^ws(s?):\/\//, 'http$1://');
}

/**
 * Resolve a board entity by its slug.
 * Uses React cache() to deduplicate within a single server request.
 */
export const resolveBoardBySlug = cache(async (slug: string): Promise<ResolvedBoard | null> => {
  const url = getGraphQLHttpUrl();
  const query = `
    query BoardBySlug($slug: String!) {
      boardBySlug(slug: $slug) {
        uuid
        slug
        ownerId
        boardType
        layoutId
        sizeId
        setIds
        name
        description
        locationName
        isPublic
        isOwned
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { slug } }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.data?.boardBySlug ?? null;
  } catch (error) {
    console.error('[resolveBoardBySlug] Failed to fetch board by slug:', error);
    return null;
  }
});

/**
 * Convert a resolved board entity to ParsedBoardRouteParameters.
 */
export function boardToRouteParams(board: ResolvedBoard, angle: number): ParsedBoardRouteParameters {
  return {
    board_name: board.boardType as BoardName,
    layout_id: board.layoutId,
    size_id: board.sizeId,
    set_ids: board.setIds.split(',').map(Number),
    angle,
  };
}
