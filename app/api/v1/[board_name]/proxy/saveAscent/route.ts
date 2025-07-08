// app/api/v1/[board_name]/proxy/saveAscent/route.ts
import { saveAscent } from '@/app/lib/api-wrappers/aurora/saveAscent';
import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const saveAscentSchema = z.object({
  token: z.string().min(1),
  options: z
    .object({
      uuid: z.string(),
      user_id: z.number(), // Changed from z.string() to z.number()
      climb_uuid: z.string(),
      angle: z.number(),
      is_mirror: z.boolean(),
      attempt_id: z.number(),
      bid_count: z.number(),
      quality: z.number(),
      difficulty: z.number(),
      is_benchmark: z.boolean(),
      comment: z.string(),
      climbed_at: z.string(),
    })
    .strict(),
});

export async function POST(request: Request, props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;
  const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  let validatedData: any = null;

  try {
    const body = await request.json();
    validatedData = saveAscentSchema.parse(body);

    const response = await saveAscent(board_name, validatedData.token, validatedData.options);
    return NextResponse.json(response);
  } catch (error) {
    // Add detailed error logging
    console.error('SaveAscent error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      board_name,
      options: validatedData?.options,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

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

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
