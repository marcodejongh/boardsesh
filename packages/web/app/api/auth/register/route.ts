import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/app/lib/auth/rate-limiter";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per IP for registration
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(`register:${clientIp}`, 10, 60_000);

    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;
    const db = getDb();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // Check if user has credentials (email/password auth)
      const existingCredentials = await db
        .select()
        .from(schema.userCredentials)
        .where(eq(schema.userCredentials.userId, existingUser[0].id))
        .limit(1);

      if (existingCredentials.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      // User exists but has no credentials (e.g., OAuth user)
      // They can add a password to their existing account
      // OAuth users are pre-verified by their provider, so no email verification needed
      const passwordHash = await bcrypt.hash(password, 12);

      await db.transaction(async (tx) => {
        await tx.insert(schema.userCredentials).values({
          userId: existingUser[0].id,
          passwordHash,
        });

        // Ensure user is marked as verified (OAuth provider already verified their email)
        if (!existingUser[0].emailVerified) {
          await tx
            .update(schema.users)
            .set({ emailVerified: new Date() })
            .where(eq(schema.users.id, existingUser[0].id));
        }
      });

      return NextResponse.json(
        { message: "Password added to existing account" },
        { status: 200 }
      );
    }

    // Create new user
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    // Use transaction to ensure user, credentials, profile, and token are created atomically
    // If any insert fails, all changes are rolled back
    try {
      await db.transaction(async (tx) => {
        // Insert user (auto-verified - email verification temporarily disabled until Fastmail auth is set up)
        await tx.insert(schema.users).values({
          id: userId,
          email,
          name: name || email.split("@")[0],
          emailVerified: new Date(),
        });

        // Insert credentials
        await tx.insert(schema.userCredentials).values({
          userId,
          passwordHash,
        });

        // Create empty profile (user can customize later)
        await tx.insert(schema.userProfiles).values({
          userId,
        });

        // Email verification temporarily disabled - skip verification token creation
      });
    } catch (insertError) {
      // Handle race condition: another request created this user between our check and insert
      // PostgreSQL unique constraint violation code is '23505'
      if (insertError && typeof insertError === 'object' && 'code' in insertError && insertError.code === '23505') {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // Email verification temporarily disabled - skip sending verification email

    return NextResponse.json(
      {
        message: "Account created. You can now log in.",
        requiresVerification: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
