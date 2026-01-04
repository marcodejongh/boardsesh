import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

/**
 * API endpoint to get a WebSocket authentication token.
 * Returns the Stack Auth access token that can be passed to the WebSocket backend.
 */
export async function GET() {
  try {
    // Get the current user from Stack Auth
    const user = await stackServerApp.getUser();

    if (!user) {
      // User is not authenticated - this is OK, just return null
      return NextResponse.json({ token: null, authenticated: false });
    }

    // Get the access token for the current user session
    // Stack Auth stores session tokens in cookies
    const accessToken = await user.getAuthJson().then(auth => auth.accessToken);

    return NextResponse.json({
      token: accessToken || user.id, // Fall back to user ID if no access token
      authenticated: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('[ws-auth] Error getting token:', error);
    return NextResponse.json({ token: null, authenticated: false, error: 'Failed to get token' }, { status: 500 });
  }
}
