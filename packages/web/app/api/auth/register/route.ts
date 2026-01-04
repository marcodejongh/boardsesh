import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendVerificationEmail } from "@/app/lib/email/email-service";
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
      const passwordHash = await bcrypt.hash(password, 12);
      await db.insert(schema.userCredentials).values({
        userId: existingUser[0].id,
        passwordHash,
      });

      return NextResponse.json(
        { message: "Password added to existing account" },
        { status: 200 }
      );
    }

    // Create new user
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user (emailVerified is null for unverified accounts)
    await db.insert(schema.users).values({
      id: userId,
      email,
      name: name || email.split("@")[0],
      emailVerified: null,
    });

    // Insert credentials
    await db.insert(schema.userCredentials).values({
      userId,
      passwordHash,
    });

    // Create empty profile (user can customize later)
    await db.insert(schema.userProfiles).values({
      userId,
    });

    // Generate verification token
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(schema.verificationTokens).values({
      identifier: email,
      token,
      expires,
    });

    // Send verification email (don't fail registration if email fails)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let emailSent = false;
    try {
      await sendVerificationEmail(email, token, baseUrl);
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // User is created, they can use resend functionality
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Account created. Please check your email to verify your account."
          : "Account created. Please request a new verification email.",
        requiresVerification: true,
        emailSent,
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
