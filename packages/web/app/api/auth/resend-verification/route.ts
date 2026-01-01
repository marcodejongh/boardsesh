import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "@/app/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user exists and is unverified
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    // Don't reveal user status - return same message for all cases
    const genericMessage = "If an account exists and needs verification, a verification email will be sent";

    if (user.length === 0 || user[0].emailVerified) {
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

    return NextResponse.json(
      { message: "Verification email sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
