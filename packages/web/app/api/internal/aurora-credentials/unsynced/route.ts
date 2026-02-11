import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import { auroraCredentials, boardseshTicks, boardClimbs } from "@/app/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth/auth-options";

export interface UnsyncedCounts {
  kilter: {
    ascents: number;
    climbs: number;
  };
  tension: {
    ascents: number;
    climbs: number;
  };
}

/**
 * GET - Get count of unsynced items for the logged-in user's Aurora accounts
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get user's Aurora account user IDs from credentials
    const credentials = await db
      .select({
        boardType: auroraCredentials.boardType,
        auroraUserId: auroraCredentials.auroraUserId,
      })
      .from(auroraCredentials)
      .where(eq(auroraCredentials.userId, session.user.id));

    const counts: UnsyncedCounts = {
      kilter: { ascents: 0, climbs: 0 },
      tension: { ascents: 0, climbs: 0 },
    };

    for (const cred of credentials) {
      if (!cred.auroraUserId) continue;

      const boardType = cred.boardType as 'kilter' | 'tension';

      // Count unsynced ticks (ascents/bids) for this user from boardsesh_ticks
      // Note: boardsesh_ticks uses NextAuth userId, not Aurora user_id
      // Unsynced ticks are those without an auroraId
      const [ascentResult] = await db
        .select({ count: count() })
        .from(boardseshTicks)
        .where(
          and(
            eq(boardseshTicks.userId, session.user.id),
            eq(boardseshTicks.boardType, boardType),
            isNull(boardseshTicks.auroraId),
          ),
        );

      // Count unsynced climbs for this user
      const [climbResult] = await db
        .select({ count: count() })
        .from(boardClimbs)
        .where(
          and(
            eq(boardClimbs.boardType, boardType),
            eq(boardClimbs.setterId, cred.auroraUserId),
            eq(boardClimbs.synced, false),
          ),
        );

      if (boardType === 'kilter') {
        counts.kilter.ascents = ascentResult?.count ?? 0;
        counts.kilter.climbs = climbResult?.count ?? 0;
      } else if (boardType === 'tension') {
        counts.tension.ascents = ascentResult?.count ?? 0;
        counts.tension.climbs = climbResult?.count ?? 0;
      }
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Failed to get unsynced counts:", error);
    return NextResponse.json({ error: "Failed to get unsynced counts" }, { status: 500 });
  }
}
