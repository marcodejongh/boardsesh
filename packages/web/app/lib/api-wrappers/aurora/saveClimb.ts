import { BoardName } from '../../types';
import { SaveClimbOptions } from './types';
import { generateUuid } from './util';
import { dbz } from '@/app/lib/db/db';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import { generateHoldsHash } from '@/app/lib/climb-utils/holds-hash';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { and, eq } from 'drizzle-orm';
import dayjs from 'dayjs';

/**
 * Saves a climb to the local database only.
 *
 * Climbs created locally are stored with the NextAuth user ID for attribution.
 * Aurora's setter_id is not used since we don't have Aurora credentials.
 */
export interface SaveClimbResponse {
  uuid: string;
  synced: boolean;
  isDuplicate?: boolean;
  existingClimbUuid?: string;
  existingClimbName?: string;
}

export async function saveClimb(
  board: BoardName,
  options: SaveClimbOptions
): Promise<SaveClimbResponse> {
  const { climbs, climbHolds } = UNIFIED_TABLES;

  // Generate holds hash for duplicate detection
  const holdsHash = generateHoldsHash(options.frames);

  // Check for existing climb with same holds (fast path for common case)
  if (holdsHash) {
    const existingClimb = await dbz
      .select({
        uuid: climbs.uuid,
        name: climbs.name,
      })
      .from(climbs)
      .where(
        and(
          eq(climbs.boardType, board),
          eq(climbs.layoutId, options.layout_id),
          eq(climbs.holdsHash, holdsHash)
        )
      )
      .limit(1);

    if (existingClimb.length > 0) {
      return {
        uuid: existingClimb[0].uuid,
        synced: false,
        isDuplicate: true,
        existingClimbUuid: existingClimb[0].uuid,
        existingClimbName: existingClimb[0].name || undefined,
      };
    }
  }

  // No duplicate found, create new climb
  const uuid = generateUuid();
  const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

  try {
    await dbz
      .insert(climbs)
      .values({
        boardType: board,
        uuid,
        layoutId: options.layout_id,
        userId: options.user_id, // NextAuth user ID
        setterId: null, // No Aurora user ID
        name: options.name,
        description: options.description || '',
        angle: options.angle,
        framesCount: options.frames_count || 1,
        framesPace: options.frames_pace || 0,
        frames: options.frames,
        isDraft: options.is_draft,
        isListed: false,
        createdAt,
        synced: false,
        syncError: null,
        holdsHash,
      })
      .onConflictDoUpdate({
        target: climbs.uuid,
        set: {
          layoutId: options.layout_id,
          userId: options.user_id,
          setterId: null,
          name: options.name,
          description: options.description || '',
          angle: options.angle,
          framesCount: options.frames_count || 1,
          framesPace: options.frames_pace || 0,
          frames: options.frames,
          isDraft: options.is_draft,
          synced: false,
          syncError: null,
          holdsHash,
        },
      });
  } catch (error) {
    // Handle race condition: another request inserted the same holds between our check and insert
    // The unique partial index on (board_type, layout_id, holds_hash) will raise a constraint violation
    if (error instanceof Error && error.message.includes('board_climbs_holds_hash_unique_idx')) {
      // Query for the existing climb that was inserted by the concurrent request
      if (holdsHash) {
        const existingClimb = await dbz
          .select({
            uuid: climbs.uuid,
            name: climbs.name,
          })
          .from(climbs)
          .where(
            and(
              eq(climbs.boardType, board),
              eq(climbs.layoutId, options.layout_id),
              eq(climbs.holdsHash, holdsHash)
            )
          )
          .limit(1);

        if (existingClimb.length > 0) {
          return {
            uuid: existingClimb[0].uuid,
            synced: false,
            isDuplicate: true,
            existingClimbUuid: existingClimb[0].uuid,
            existingClimbName: existingClimb[0].name || undefined,
          };
        }
      }
    }
    // Re-throw other errors
    throw error;
  }

  // Insert holds into board_climb_holds table
  const holdsByFrame = convertLitUpHoldsStringToMap(options.frames, board);
  const holdsToInsert = Object.entries(holdsByFrame).flatMap(([frameNumber, holds]) =>
    Object.entries(holds).map(([holdId, { state }]) => ({
      boardType: board,
      climbUuid: uuid,
      frameNumber: Number(frameNumber),
      holdId: Number(holdId),
      holdState: state,
    }))
  );

  if (holdsToInsert.length > 0) {
    await dbz.insert(climbHolds).values(holdsToInsert).onConflictDoNothing();
  }

  // Return response - always success from client perspective
  return {
    uuid,
    synced: false,
  };
}
