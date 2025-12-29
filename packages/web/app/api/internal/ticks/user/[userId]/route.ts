import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

// GET: Get ticks for a specific user (public for profile pages)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get("boardType");

    if (!boardType || !["kilter", "tension"].includes(boardType)) {
      return NextResponse.json({ error: "Invalid board type" }, { status: 400 });
    }

    const db = getDb();

    // Fetch ticks for this user (publicly accessible for profile pages)
    const conditions = [
      eq(schema.boardseshTicks.userId, userId),
      eq(schema.boardseshTicks.boardType, boardType),
    ];

    const ticks = await db
      .select({
        uuid: schema.boardseshTicks.uuid,
        climbUuid: schema.boardseshTicks.climbUuid,
        angle: schema.boardseshTicks.angle,
        status: schema.boardseshTicks.status,
        attemptCount: schema.boardseshTicks.attemptCount,
        quality: schema.boardseshTicks.quality,
        difficulty: schema.boardseshTicks.difficulty,
        isBenchmark: schema.boardseshTicks.isBenchmark,
        climbedAt: schema.boardseshTicks.climbedAt,
      })
      .from(schema.boardseshTicks)
      .where(and(...conditions))
      .orderBy(desc(schema.boardseshTicks.climbedAt));

    // Transform to the format expected by the profile page
    const entries = ticks.map((tick) => ({
      climbed_at: tick.climbedAt,
      difficulty: tick.difficulty,
      tries: tick.attemptCount,
      angle: tick.angle,
      // Additional fields for potential use
      uuid: tick.uuid,
      climb_uuid: tick.climbUuid,
      quality: tick.quality,
      is_benchmark: tick.isBenchmark,
      is_ascent: tick.status === "flash" || tick.status === "send",
      status: tick.status,
    }));

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to get user ticks:", error);
    return NextResponse.json({ error: "Failed to get ticks" }, { status: 500 });
  }
}
