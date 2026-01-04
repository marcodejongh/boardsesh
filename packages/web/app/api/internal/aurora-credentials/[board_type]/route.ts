import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import { decrypt } from "@boardsesh/crypto";

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

    const user = await stackServerApp.getUser();

    if (!user) {
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
          eq(schema.auroraCredentials.userId, user.id),
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

    // Decrypt credentials with error handling
    let token: string | null = null;
    let username: string | null = null;

    try {
      token = credential.auroraToken ? decrypt(credential.auroraToken) : null;
      username = decrypt(credential.encryptedUsername);
    } catch (decryptError) {
      console.error("Failed to decrypt Aurora credentials - encryption secret may have changed:", decryptError);
      // Return null values - frontend will handle gracefully
      return NextResponse.json({
        authenticated: true,
        token: null,
        user_id: null,
        username: null,
        syncStatus: 'error',
        error: 'Failed to decrypt credentials',
      });
    }

    return NextResponse.json({
      authenticated: true,
      token,
      user_id: credential.auroraUserId,
      username,
      syncStatus: credential.syncStatus,
    });
  } catch (error) {
    console.error("Failed to get Aurora credentials:", error);
    return NextResponse.json({ error: "Failed to get credentials" }, { status: 500 });
  }
}
