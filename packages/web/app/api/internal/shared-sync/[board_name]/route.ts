// app/api/cron/sync-shared-data/route.ts
import { NextResponse } from 'next/server';
import { syncSharedData as syncSharedDataFunction, type NewClimbInfo } from '@/lib/data-sync/aurora/shared-sync';
import { BoardName as AuroraBoardName } from '@/app/lib/api-wrappers/aurora-rest-client/types';
import { AURORA_BOARD_NAMES } from '@/app/lib/board-constants';
import { getDb } from '@/app/lib/db/db';
import { setterFollows, notifications, userBoardMappings, userFollows } from '@boardsesh/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// This is a simple way to secure the endpoint, should be replaced with a better solution
const CRON_SECRET = process.env.CRON_SECRET;

type SharedSyncRouteParams = {
  board_name: string;
};

type MergedSyncResult = {
  results: Record<string, { synced: number; complete: boolean }>;
  complete: boolean;
  newClimbs: NewClimbInfo[];
};

const internalSyncSharedData = async (
  board_name: AuroraBoardName,
  token: string,
  previousResults: MergedSyncResult = {
    results: {},
    complete: false,
    newClimbs: [],
  },
  recursionCount = 0,
): Promise<MergedSyncResult> => {
  console.log(`Recursion count: ${recursionCount}`);
  if (recursionCount >= 100) {
    console.warn('Maximum recursion depth reached for shared sync');
    return { ...previousResults, complete: true };
  }

  const currentResult = await syncSharedDataFunction(board_name, token);

  // Deep merge the results, adding up synced counts
  const mergedResults: MergedSyncResult = {
    results: {},
    complete: false,
    newClimbs: [...previousResults.newClimbs, ...currentResult.newClimbs],
  };
  const categories = new Set([...Object.keys(previousResults.results), ...Object.keys(currentResult.results)]);

  for (const category of categories) {
    if (category === 'complete') {
      mergedResults.complete = currentResult.complete;
      continue;
    }

    const prev = previousResults.results[category] || { synced: 0, complete: false };
    const curr = currentResult.results[category] || { synced: 0, complete: false };

    mergedResults.results[category] = {
      synced: prev.synced + curr.synced,
      complete: curr.complete,
    };
  }

  if (!currentResult.complete) {
    console.log(`Sync not complete, recursing. Current recursion count: ${recursionCount}`);
    return internalSyncSharedData(board_name, token, mergedResults, recursionCount + 1);
  }

  console.log(`Sync complete. Returning merged results.`, currentResult);
  return mergedResults;
};

/**
 * Create batched notifications for setter followers when new climbs are synced.
 */
async function createSetterSyncNotifications(
  boardName: AuroraBoardName,
  newClimbs: NewClimbInfo[],
): Promise<void> {
  if (newClimbs.length === 0) return;

  try {
    const db = getDb();

    // Group new climbs by setter_username
    const climbsBySetter = new Map<string, NewClimbInfo[]>();
    for (const climb of newClimbs) {
      if (!climb.setterUsername) continue;
      const existing = climbsBySetter.get(climb.setterUsername) ?? [];
      existing.push(climb);
      climbsBySetter.set(climb.setterUsername, existing);
    }

    if (climbsBySetter.size === 0) return;

    const setterUsernames = Array.from(climbsBySetter.keys());

    // Get all followers for these setters
    const followers = await db
      .select({
        followerId: setterFollows.followerId,
        setterUsername: setterFollows.setterUsername,
      })
      .from(setterFollows)
      .where(inArray(setterFollows.setterUsername, setterUsernames));

    if (followers.length === 0) return;

    // Also check user_follows for linked accounts
    const linkedMappings = await db
      .select({
        userId: userBoardMappings.userId,
        boardUsername: userBoardMappings.boardUsername,
      })
      .from(userBoardMappings)
      .where(inArray(userBoardMappings.boardUsername, setterUsernames));

    const linkedUsernameToUserId = new Map<string, string>();
    for (const m of linkedMappings) {
      if (m.boardUsername) {
        linkedUsernameToUserId.set(m.boardUsername, m.userId);
      }
    }

    // Get user_follows for linked accounts
    const linkedUserIds = Array.from(linkedUsernameToUserId.values());
    let userFollowsList: Array<{ followerId: string; followingId: string }> = [];
    if (linkedUserIds.length > 0) {
      userFollowsList = await db
        .select({
          followerId: userFollows.followerId,
          followingId: userFollows.followingId,
        })
        .from(userFollows)
        .where(inArray(userFollows.followingId, linkedUserIds));
    }

    // Build recipient set per setter
    for (const [setterUsername, climbs] of climbsBySetter) {
      const recipientIds = new Set<string>();

      // Add setter_follows followers
      for (const f of followers) {
        if (f.setterUsername === setterUsername) {
          recipientIds.add(f.followerId);
        }
      }

      // Add user_follows followers for linked accounts
      const linkedUserId = linkedUsernameToUserId.get(setterUsername);
      if (linkedUserId) {
        for (const f of userFollowsList) {
          if (f.followingId === linkedUserId) {
            recipientIds.add(f.followerId);
          }
        }
      }

      if (recipientIds.size === 0) continue;

      // Create one notification per recipient per setter
      const firstClimbUuid = climbs[0].uuid;
      const notificationValues = Array.from(recipientIds).map((recipientId) => ({
        uuid: crypto.randomUUID(),
        recipientId,
        actorId: linkedUserId ?? null,
        type: 'new_climbs_synced' as const,
        entityType: 'climb' as const,
        entityId: firstClimbUuid,
      }));

      if (notificationValues.length > 0) {
        await db.insert(notifications).values(notificationValues);
        console.log(
          `[SharedSync] Created ${notificationValues.length} notifications for setter "${setterUsername}" (${climbs.length} new climbs on ${boardName})`,
        );
      }
    }
  } catch (error) {
    console.error('[SharedSync] Failed to create setter sync notifications:', error);
  }
}

export async function GET(request: Request, props: { params: Promise<SharedSyncRouteParams> }) {
  const params = await props.params;
  try {
    const { board_name: boardNameParam } = params;

    // Validate board_name is a valid AuroraBoardName
    if (!AURORA_BOARD_NAMES.includes(boardNameParam as AuroraBoardName)) {
      return NextResponse.json({ error: `Invalid board name: ${boardNameParam}` }, { status: 400 });
    }
    const board_name = boardNameParam as AuroraBoardName;

    console.log(`Starting shared sync for ${board_name}`);

    // Auth check - always require valid CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const AURORA_TOKENS: Record<string, string | undefined> = {
      kilter: process.env.KILTER_SYNC_TOKEN,
      tension: process.env.TENSION_SYNC_TOKEN,
    };
    // Get the token for this board
    const token = AURORA_TOKENS && AURORA_TOKENS[board_name];
    if (!token) {
      console.error(
        `No sync token configured for ${board_name}. Set ${board_name.toUpperCase()}_SYNC_TOKEN env variable.`,
      );
      return NextResponse.json({ error: `No sync token configured for ${board_name}` }, { status: 500 });
    }

    const result = await internalSyncSharedData(board_name, token);

    // Create notifications for setter followers about new climbs
    if (result.newClimbs.length > 0) {
      await createSetterSyncNotifications(board_name, result.newClimbs);
    }

    return NextResponse.json({
      success: true,
      results: { results: result.results, complete: result.complete },
      complete: result.complete,
      newClimbsCount: result.newClimbs.length,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
