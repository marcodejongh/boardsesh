// app/api/v1/[board_name]/proxy/saveClimb/route.ts
import { saveClimb } from '@/app/lib/api-wrappers/aurora/saveClimb';
import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const saveClimbSchema = z.object({
  token: z.string().min(1),
  options: z
    .object({
      layout_id: z.number(),
      setter_id: z.number(),
      name: z.string().min(1),
      description: z.string(),
      is_draft: z.boolean(),
      frames: z.string(),
      frames_count: z.number().optional().default(1),
      frames_pace: z.number().optional().default(0),
      angle: z.number(),
    })
    .strict(),
});

export async function POST(request: Request, props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;
  const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  let validatedData: z.infer<typeof saveClimbSchema> | null = null;

  try {
    const body = await request.json();
    validatedData = saveClimbSchema.parse(body);

    const response = await saveClimb(board_name, validatedData.token, validatedData.options);
    return NextResponse.json(response);
  } catch (error) {
    console.error('SaveClimb error details:', {
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
