import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db/db";
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

    // Get user's Aurora account user IDs from credentials
    const credentials = await sql`
      SELECT board_type, aurora_user_id
      FROM aurora_credentials
      WHERE user_id = ${session.user.id} AND aurora_user_id IS NOT NULL
    `;

    const counts: UnsyncedCounts = {
      kilter: { ascents: 0, climbs: 0 },
      tension: { ascents: 0, climbs: 0 },
    };

    for (const cred of credentials) {
      const boardType = cred.board_type as 'kilter' | 'tension';
      const auroraUserId = cred.aurora_user_id;

      // Count unsynced ticks (ascents/bids) for this user from boardsesh_ticks
      // Note: boardsesh_ticks uses NextAuth userId, not Aurora user_id
      // Unsynced ticks are those without an auroraId
      const ascentResult = await sql`
        SELECT COUNT(*) as count FROM boardsesh_ticks
        WHERE user_id = ${session.user.id}
          AND board_type = ${boardType}
          AND aurora_id IS NULL
      `;

      // Count unsynced climbs for this user
      const climbResult = await sql`
        SELECT COUNT(*) as count FROM board_climbs
        WHERE board_type = ${boardType}
          AND setter_id = ${auroraUserId}
          AND synced = false
      `;

      if (boardType === 'kilter') {
        counts.kilter.ascents = Number(ascentResult[0]?.count || 0);
        counts.kilter.climbs = Number(climbResult[0]?.count || 0);
      } else if (boardType === 'tension') {
        counts.tension.ascents = Number(ascentResult[0]?.count || 0);
        counts.tension.climbs = Number(climbResult[0]?.count || 0);
      }
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Failed to get unsynced counts:", error);
    return NextResponse.json({ error: "Failed to get unsynced counts" }, { status: 500 });
  }
}
