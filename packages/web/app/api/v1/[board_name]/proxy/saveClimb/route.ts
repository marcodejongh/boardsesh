// app/api/v1/[board_name]/proxy/saveClimb/route.ts
import { saveClimb } from '@/app/lib/api-wrappers/aurora/saveClimb';
import { AuroraBoardName } from '@/app/lib/api-wrappers/aurora/types';
import { BoardName } from '@/app/lib/types';
import { encodeMoonBoardHoldsToFrames } from '@/app/lib/moonboard-config';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const saveClimbSchema = z.object({
  options: z
    .object({
      layout_id: z.number(),
      user_id: z.string().min(1), // NextAuth user ID (UUID)
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

// Moonboard-specific schema (uses holds instead of frames)
const saveMoonBoardClimbSchema = z.object({
  options: z
    .object({
      layout_id: z.number(),
      user_id: z.string().min(1), // NextAuth user ID (UUID)
      name: z.string().min(1),
      description: z.string(),
      holds: z.object({
        start: z.array(z.string()),
        hand: z.array(z.string()),
        finish: z.array(z.string()),
      }),
      angle: z.number(),
    })
    .strict(),
});

export async function POST(request: Request, props: { params: Promise<{ board_name: string }> }) {
  const params = await props.params;
  const board_name = params.board_name as BoardName;

  try {
    const body = await request.json();

    // Handle Moonboard separately (uses holds instead of frames)
    if (board_name === 'moonboard') {
      const validatedData = saveMoonBoardClimbSchema.parse(body);
      const frames = encodeMoonBoardHoldsToFrames(validatedData.options.holds);

      const response = await saveClimb('moonboard', {
        layout_id: validatedData.options.layout_id,
        user_id: validatedData.options.user_id,
        name: validatedData.options.name,
        description: validatedData.options.description,
        angle: validatedData.options.angle,
        frames,
        is_draft: false,
        frames_count: 1,
        frames_pace: 0,
      });
      return NextResponse.json(response);
    }

    // Aurora boards (kilter, tension)
    const validatedData = saveClimbSchema.parse(body);
    const aurora_board_name = board_name as AuroraBoardName;

    // saveClimb saves to local database only (no Aurora sync)
    const response = await saveClimb(aurora_board_name, validatedData.options);
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
