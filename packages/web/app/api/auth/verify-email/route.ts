import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(
      new URL("/auth/verify-request?error=InvalidToken", request.url)
    );
  }

  const db = getDb();

  // Find the verification token
  const verificationToken = await db
    .select()
    .from(schema.verificationTokens)
    .where(
      and(
        eq(schema.verificationTokens.identifier, email),
        eq(schema.verificationTokens.token, token)
      )
    )
    .limit(1);

  if (verificationToken.length === 0) {
    return NextResponse.redirect(
      new URL("/auth/verify-request?error=InvalidToken", request.url)
    );
  }

  const tokenData = verificationToken[0];

  // Check if token has expired
  if (new Date() > tokenData.expires) {
    // Delete expired token
    await db
      .delete(schema.verificationTokens)
      .where(
        and(
          eq(schema.verificationTokens.identifier, email),
          eq(schema.verificationTokens.token, token)
        )
      );

    return NextResponse.redirect(
      new URL("/auth/verify-request?error=TokenExpired", request.url)
    );
  }

  // Update user emailVerified
  await db
    .update(schema.users)
    .set({ emailVerified: new Date() })
    .where(eq(schema.users.email, email));

  // Delete the used token
  await db
    .delete(schema.verificationTokens)
    .where(
      and(
        eq(schema.verificationTokens.identifier, email),
        eq(schema.verificationTokens.token, token)
      )
    );

  // Redirect to login with success message
  return NextResponse.redirect(
    new URL("/auth/login?verified=true", request.url)
  );
}
