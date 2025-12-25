// app/api/v1/[board_name]/proxy/saveAscent/route.ts
import { saveAscent } from '@/app/lib/api-wrappers/aurora/saveAscent';
import { BoardName, BoardOnlyRouteParameters } from '@/app/lib/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const saveAscentSchema = z.object({
  token: z.string().min(1),
  options: z
    .object({
      uuid: z.string(),
      user_id: z.number(),
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

export async function POST(request: Request, props: { params: Promise<BoardOnlyRouteParameters> }) {
  const params = await props.params;
  const board_name = params.board_name as BoardName;

  try {
    const body = await request.json();
    const validatedData = saveAscentSchema.parse(body);

    // saveAscent now handles Aurora failures gracefully and always saves locally
    // It will never throw for Aurora API failures - only for validation/db errors
    const response = await saveAscent(board_name, validatedData.token, validatedData.options);
    return NextResponse.json(response);
  } catch (error) {
    console.error('SaveAscent error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      board_name,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    // Only database errors should reach here now
    return NextResponse.json({ error: 'Failed to save ascent' }, { status: 500 });
  }
}
