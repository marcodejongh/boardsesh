import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth/auth-options";
import { getUserBoardMappings } from "@/app/lib/auth/user-board-mappings";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    const isOwnProfile = session?.user?.id === userId;

    const db = getDb();

    // Get user profile
    const profiles = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);

    // Get base user data
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];
    const profile = profiles.length > 0 ? profiles[0] : null;

    // Get board mappings for this user
    const mappings = await getUserBoardMappings(userId);

    // Transform mappings to credential format
    const credentials = mappings.map((m) => ({
      boardType: m.boardType,
      auroraUsername: m.boardUsername || '',
      auroraUserId: m.boardUserId,
    }));

    return NextResponse.json({
      id: user.id,
      // Only include email if viewing own profile
      email: isOwnProfile ? user.email : undefined,
      name: user.name,
      image: user.image,
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            instagramUrl: profile.instagramUrl,
          }
        : null,
      credentials,
      isOwnProfile,
    });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}
