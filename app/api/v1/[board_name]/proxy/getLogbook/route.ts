// app/api/login/route.ts
import { getLogbook } from '@/app/lib/api-wrappers/aurora/getLogbook';
import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const getLogbookSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: BoardRouteParameters }) {
  const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = getLogbookSchema.parse(body);

    // Call the board API
    const response = await getLogbook(board_name, validatedData.token, validatedData.userId);

    return NextResponse.json(response);
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