import { sql } from '@/app/lib/db/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import AuroraClimbingClient from '@/app/lib/api-wrappers/aurora-rest-client/aurora-rest-client';
import { BoardOnlyRouteParameters } from '@/app/lib/types';
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';
import { Session, BoardName as AuroraBoardName } from '@/app/lib/api-wrappers/aurora-rest-client/types';
import { getSession } from '@/app/lib/session';

// Input validation schema
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Performs login for a specific climbing board
 * @param board - The name of the climbing board
 * @param username - User's username
 * @param password - User's password
 * @returns Login response from the board's API
 */
async function login(boardName: AuroraBoardName, username: string, password: string): Promise<Session> {
  const auroraClient = new AuroraClimbingClient({ boardName: boardName });
  const loginResponse = await auroraClient.signIn(username, password);

  if (!loginResponse.token || !loginResponse.user_id) {
    throw new Error('Invalid login response: missing token or user_id');
  }

  if (loginResponse.user_id) {
    const tableName = boardName === 'tension' || boardName === 'kilter' ? `${boardName}_users` : 'users';

    // Insert/update user in our database - handle missing user object
    const createdAt = loginResponse.user?.created_at ? new Date(loginResponse.user.created_at) : new Date(); // Fallback to current time if not available

    await sql`
      INSERT INTO ${sql.unsafe(tableName)} (id, username, created_at)
      VALUES (${loginResponse.user_id}, ${loginResponse.username || username}, ${createdAt})
      ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username
      `;

    // If it's a new user, perform full sync
    try {
      await syncUserData(boardName, loginResponse.token, loginResponse.user_id);
    } catch (error) {
      console.error('Initial sync error:', error);
      // We don't throw here as login was successful
    }
  }

  // Convert LoginResponse to Session
  return {
    token: loginResponse.token,
    user_id: loginResponse.user_id,
  };
}

/**
 * Route handler for login POST requests
 * @param request - Incoming HTTP request
 * @param props - Route parameters
 * @returns NextResponse with login results or error
 */
export async function POST(request: Request, props: { params: Promise<BoardOnlyRouteParameters> }) {
  const params = await props.params;

  // MoonBoard doesn't use Aurora APIs
  if (params.board_name === 'moonboard') {
    return NextResponse.json({ error: 'MoonBoard does not support this endpoint' }, { status: 400 });
  }

  const board_name = params.board_name as AuroraBoardName;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Call the board API
    const loginResponse = await login(board_name, validatedData.username, validatedData.password);

    const response = NextResponse.json(loginResponse);

    const session = await getSession(response.cookies, board_name);
    session.token = loginResponse.token;
    session.username = validatedData.username;
    session.password = validatedData.password;
    session.userId = loginResponse.user_id;
    await session.save();

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    // Handle fetch errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      if (error.message.includes('403')) {
        return NextResponse.json({ error: 'Access forbidden' }, { status: 403 });
      }
      if (error.message.startsWith('HTTP error!')) {
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
      }
    }

    // Generic error
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
