import { sql } from '@/app/lib/db/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import AuroraClimbingClient from '@/app/lib/api-wrappers/aurora-rest-client/aurora-rest-client';
import { BoardName, BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';
import { Session } from '@/app/lib/api-wrappers/aurora-rest-client/types';

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
async function login(boardName: BoardName, username: string, password: string): Promise<Session> {
  const auroraClient = new AuroraClimbingClient({ boardName: boardName });
  const loginResponse = await auroraClient.signIn(username, password);

  if (loginResponse.user_id) {
    const tableName = boardName === 'tension' || boardName === 'kilter' ? `${boardName}_users` : 'users';

    // Insert/update user in our database
    await sql.query(
      `
      INSERT INTO ${tableName} (id, username, created_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username
      `,
      [loginResponse.user_id, loginResponse.username, new Date(loginResponse.user.created_at)],
    );

    // If it's a new user, perform full sync
    try {
      await syncUserData(
        boardName,
        loginResponse.token,
        loginResponse.user_id.toString(),
        (loginResponse.username ?? '').toString(),
      );
    } catch (error) {
      console.error('Initial sync error:', error);
      // We don't throw here as login was successful
    }
  }

  return loginResponse;
}

/**
 * Route handler for login POST requests
 * @param request - Incoming HTTP request
 * @param props - Route parameters
 * @returns NextResponse with login results or error
 */
export async function POST(request: Request, props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;
  const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Call the board API
    const loginResponse = await login(board_name, validatedData.username, validatedData.password);

    const response = NextResponse.json(loginResponse);
    response.cookies.set(`${board_name}_token`, loginResponse.token, { secure: true, httpOnly: true });
    response.cookies.set(`${board_name}_username`, validatedData.username, { secure: true, httpOnly: true });
    response.cookies.set(`${board_name}_password`, validatedData.password, { secure: true, httpOnly: true });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
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
