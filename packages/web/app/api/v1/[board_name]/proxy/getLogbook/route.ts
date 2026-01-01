// app/api/login/route.ts
import { getLogbook } from '@/app/lib/data/get-logbook';
import { getSession } from '@/app/lib/session';
import { BoardOnlyRouteParameters, BoardName } from '@/app/lib/types';
import { AuroraBoardName } from '@/app/lib/api-wrappers/aurora/types';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: Request, props: { params: Promise<BoardOnlyRouteParameters> }) {
  const params = await props.params;
  const board_name = params.board_name as AuroraBoardName;
  try {
    // Parse and validate request body
    const validatedData = await request.json();
    // Call the board API
    const cookieStore = await cookies();
    const session = await getSession(cookieStore, board_name);

    const { token, userId } = session;

    if (!token || !userId) {
      throw new Error('401: Unauthorized');
    }

    const response = await getLogbook(board_name, validatedData.userId, validatedData.climbUuids);

    return NextResponse.json(response);
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
