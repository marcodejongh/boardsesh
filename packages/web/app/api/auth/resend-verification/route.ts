import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendVerificationEmail } from "@/app/lib/email/email-service";
import { checkRateLimit, getClientIp } from "@/app/lib/auth/rate-limiter";

// Zod schema for email validation
const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Helper to introduce consistent delay to prevent timing attacks
async function consistentDelay(startTime: number, minDurationMs: number = 200): Promise<void> {
  const elapsed = Date.now() - startTime;
  const remaining = minDurationMs - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const genericMessage = "If an account exists and needs verification, a verification email will be sent";

  try {
    // Rate limiting - 5 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(`resend-verification:${clientIp}`, 5, 60_000);

    if (rateLimitResult.limited) {
      await consistentDelay(startTime);
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

    // Validate input with Zod
    const validationResult = resendVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      await consistentDelay(startTime);
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const db = getDb();

    // Check if user exists and is unverified
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    // Don't reveal user status - return same message for all cases
    // But still perform the same operations to prevent timing attacks
    if (user.length === 0 || user[0].emailVerified) {
      // Still wait the same amount of time as sending an email would take
      await consistentDelay(startTime, 500);
      return NextResponse.json(
        { message: genericMessage },
        { status: 200 }
      );
    }

    // Delete any existing tokens for this email
    await db
      .delete(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, email));

    // Generate new token
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(schema.verificationTokens).values({
      identifier: email,
      token,
      expires,
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await sendVerificationEmail(email, token, baseUrl);

    await consistentDelay(startTime);
    return NextResponse.json(
      { message: genericMessage },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    await consistentDelay(startTime);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
