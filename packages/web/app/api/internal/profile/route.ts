import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { stackServerApp } from "@/stack";

const updateProfileSchema = z.object({
  displayName: z.string().max(100, "Display name must be less than 100 characters").optional().nullable(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
  instagramUrl: z.string().url("Invalid Instagram URL").optional().nullable(),
});

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get user profile
    const profiles = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id))
      .limit(1);

    // Get base user data from Stack Auth
    const profile = profiles.length > 0 ? profiles[0] : null;

    return NextResponse.json({
      id: user.id,
      email: user.primaryEmail,
      name: user.displayName,
      image: user.profileImageUrl,
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            instagramUrl: profile.instagramUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { displayName, avatarUrl, instagramUrl } = validationResult.data;
    const db = getDb();

    // Check if profile exists
    const existingProfile = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id))
      .limit(1);

    const now = new Date();

    if (existingProfile.length > 0) {
      // Update existing profile
      await db
        .update(schema.userProfiles)
        .set({
          displayName: displayName ?? null,
          avatarUrl: avatarUrl ?? null,
          instagramUrl: instagramUrl ?? null,
          updatedAt: now,
        })
        .where(eq(schema.userProfiles.userId, user.id));
    } else {
      // Create new profile
      await db.insert(schema.userProfiles).values({
        userId: user.id,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
        instagramUrl: instagramUrl ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
