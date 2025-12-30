/**
 * Client-side board configuration operations.
 * These are used for features that must run in the browser,
 * such as Bluetooth LED control.
 */

import { gql } from 'graphql-request';
import { executeGraphQL } from '../client';
import type { LedPlacements } from '@boardsesh/shared-schema';

const LED_PLACEMENTS_QUERY = gql`
  query LedPlacements($boardName: String!, $layoutId: Int!, $sizeId: Int!) {
    ledPlacements(boardName: $boardName, layoutId: $layoutId, sizeId: $sizeId) {
      placements
    }
  }
`;

interface LedPlacementsResponse {
  ledPlacements: LedPlacements | null;
}

/**
 * Get LED placements for Bluetooth board control (client-side).
 * Used by the Bluetooth module to map holds to LED positions.
 */
export const fetchLedPlacements = async (
  boardName: string,
  layoutId: number,
  sizeId: number
): Promise<Record<number, number> | null> => {
  try {
    const result = await executeGraphQL<LedPlacementsResponse>(
      LED_PLACEMENTS_QUERY,
      { boardName, layoutId, sizeId }
    );
    return result.ledPlacements?.placements ?? null;
  } catch (error) {
    console.error('[fetchLedPlacements] Error fetching LED placements:', error);
    return null;
  }
};
