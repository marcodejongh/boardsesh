// app/api/v1/[board_name]/proxy/saveClimb/route.ts
import { saveClimb } from '@/app/lib/api-wrappers/aurora/saveClimb';
import { AuroraBoardName } from '@/app/lib/api-wrappers/aurora/types';
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

export async function POST(request: Request, props: { params: Promise<{ board_name: string }> }) {
  const params = await props.params;

  // MoonBoard doesn't use Aurora APIs
  if (params.board_name === 'moonboard') {
    return NextResponse.json({ error: 'MoonBoard does not support this endpoint' }, { status: 400 });
  }

  const board_name = params.board_name as AuroraBoardName;

  try {
    const body = await request.json();
    const validatedData = saveClimbSchema.parse(body);

    // saveClimb now handles Aurora failures gracefully and always saves locally
    // It will never throw for Aurora API failures - only for validation/db errors
    const response = await saveClimb(board_name, validatedData.token, validatedData.options);
    return NextResponse.json(response);
  } catch (error) {
    console.error('SaveClimb error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      board_name,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    // Only database errors should reach here now
    return NextResponse.json({ error: 'Failed to save climb' }, { status: 500 });
  }
}
