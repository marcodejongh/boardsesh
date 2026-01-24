import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/app/lib/auth/auth-options";

const favoriteSchema = z.object({
  boardName: z.enum(["kilter", "tension", "moonboard"]),
  climbUuid: z.string().min(1),
  angle: z.number().int(),
});

const checkFavoriteSchema = z.object({
  boardName: z.enum(["kilter", "tension", "moonboard"]),
  climbUuids: z.array(z.string().min(1)),
  angle: z.number().int(),
});

// POST: Toggle favorite (add or remove)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = favoriteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { boardName, climbUuid, angle } = validationResult.data;
    const db = getDb();

    // Check if favorite already exists
    const existing = await db
      .select()
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, session.user.id),
          eq(schema.userFavorites.boardName, boardName),
          eq(schema.userFavorites.climbUuid, climbUuid),
          eq(schema.userFavorites.angle, angle)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove favorite
      await db
        .delete(schema.userFavorites)
        .where(
          and(
            eq(schema.userFavorites.userId, session.user.id),
            eq(schema.userFavorites.boardName, boardName),
            eq(schema.userFavorites.climbUuid, climbUuid),
            eq(schema.userFavorites.angle, angle)
          )
        );
      return NextResponse.json({ favorited: false });
    } else {
      // Add favorite
      await db.insert(schema.userFavorites).values({
        userId: session.user.id,
        boardName,
        climbUuid,
        angle,
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}

// GET: Check if climbs are favorited (batch check)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Return empty favorites for non-authenticated users
      return NextResponse.json({ favorites: [] });
    }

    const { searchParams } = new URL(request.url);
    const boardName = searchParams.get("boardName");
    const climbUuidsParam = searchParams.get("climbUuids");
    const angleParam = searchParams.get("angle");

    if (!boardName || !climbUuidsParam || !angleParam) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const climbUuids = climbUuidsParam.split(",");
    const angle = parseInt(angleParam, 10);

    if (isNaN(angle)) {
      return NextResponse.json(
        { error: "Invalid angle parameter" },
        { status: 400 }
      );
    }

    const validationResult = checkFavoriteSchema.safeParse({
      boardName,
      climbUuids,
      angle,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get all favorites for the user matching the given climbs
    const favorites = await db
      .select({ climbUuid: schema.userFavorites.climbUuid })
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, session.user.id),
          eq(schema.userFavorites.boardName, boardName),
          eq(schema.userFavorites.angle, angle)
        )
      );

    // Filter to only the requested climb UUIDs
    const favoritedUuids = favorites
      .map((f) => f.climbUuid)
      .filter((uuid) => climbUuids.includes(uuid));

    return NextResponse.json({ favorites: favoritedUuids });
  } catch (error) {
    console.error("Failed to check favorites:", error);
    return NextResponse.json({ error: "Failed to check favorites" }, { status: 500 });
  }
}
