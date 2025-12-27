import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * API endpoint to get a WebSocket authentication token.
 * Returns the NextAuth JWT token that can be passed to the WebSocket backend.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the NextAuth JWT token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      raw: true, // Get the raw encoded JWT string
    });

    if (!token) {
      // User is not authenticated - this is OK, just return null
      return NextResponse.json({ token: null, authenticated: false });
    }

    return NextResponse.json({
      token,
      authenticated: true,
    });
  } catch (error) {
    console.error('[ws-auth] Error getting token:', error);
    return NextResponse.json({ token: null, authenticated: false, error: 'Failed to get token' }, { status: 500 });
  }
}
