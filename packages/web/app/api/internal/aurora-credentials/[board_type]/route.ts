import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth/auth-options";
import { decrypt } from "@/app/lib/crypto";

interface RouteParams {
  params: Promise<{ board_type: string }>;
}

/**
 * GET - Get Aurora credentials for a specific board (for BoardProvider)
 * Returns the decrypted token and user info needed for Aurora API calls
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { board_type } = await params;

    if (!["kilter", "tension"].includes(board_type)) {
      return NextResponse.json({ error: "Invalid board type" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        token: null,
        user_id: null,
        username: null,
      });
    }

    const db = getDb();

    const credentials = await db
      .select()
      .from(schema.auroraCredentials)
      .where(
        and(
          eq(schema.auroraCredentials.userId, session.user.id),
          eq(schema.auroraCredentials.boardType, board_type)
        )
      )
      .limit(1);

    if (credentials.length === 0) {
      return NextResponse.json({
        authenticated: true,
        token: null,
        user_id: null,
        username: null,
      });
    }

    const credential = credentials[0];

    // If the sync status is error or expired, the token might not be valid
    // But we'll still return it and let the API calls fail gracefully

    return NextResponse.json({
      authenticated: true,
      token: credential.auroraToken ? decrypt(credential.auroraToken) : null,
      user_id: credential.auroraUserId,
      username: decrypt(credential.encryptedUsername),
      syncStatus: credential.syncStatus,
    });
  } catch (error) {
    console.error("Failed to get Aurora credentials:", error);
    return NextResponse.json({ error: "Failed to get credentials" }, { status: 500 });
  }
}
