import { NextRequest, NextResponse } from 'next/server';
import { dbz } from '@/app/lib/db/db';
import { eq, and, desc } from 'drizzle-orm';
import { BoardName } from '@/app/lib/types';
import { extractUuidFromSlug } from '@/app/lib/url-utils';
import { UNIFIED_TABLES, isValidUnifiedBoardName } from '@/app/lib/db/queries/util/table-select';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_name: string; climb_uuid: string }> },
) {
  const { board_name: boardNameParam, climb_uuid: rawClimbUuid } = await params;
  const board_name = boardNameParam as BoardName;
  const climb_uuid = extractUuidFromSlug(rawClimbUuid);

  if (!isValidUnifiedBoardName(board_name)) {
    return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
  }

  try {
    const { climbStatsHistory } = UNIFIED_TABLES;

    const rows = await dbz
      .select({
        angle: climbStatsHistory.angle,
        ascensionistCount: climbStatsHistory.ascensionistCount,
        qualityAverage: climbStatsHistory.qualityAverage,
        difficultyAverage: climbStatsHistory.difficultyAverage,
        displayDifficulty: climbStatsHistory.displayDifficulty,
        createdAt: climbStatsHistory.createdAt,
      })
      .from(climbStatsHistory)
      .where(
        and(
          eq(climbStatsHistory.boardType, board_name),
          eq(climbStatsHistory.climbUuid, climb_uuid),
        ),
      )
      .orderBy(desc(climbStatsHistory.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching climb stats history:', error);
    return NextResponse.json({ error: 'Failed to fetch climb stats history' }, { status: 500 });
  }
}
