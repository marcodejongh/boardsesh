// app/api/v1/[board_name]/proxy/saveAscent/route.ts
import { saveAscent } from '@/app/lib/api-wrappers/aurora/saveAscent';
import { AuroraBoardName } from '@/app/lib/api-wrappers/aurora/types';
import { BoardOnlyRouteParameters } from '@/app/lib/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth/auth-options';

const saveAscentSchema = z.object({
  token: z.string().min(1),
  options: z
    .object({
      uuid: z.string(),
      user_id: z.number(), // Legacy Aurora user_id (not used for storage anymore)
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

  // MoonBoard doesn't use Aurora APIs
  if (params.board_name === 'moonboard') {
    return NextResponse.json({ error: 'MoonBoard does not support this endpoint' }, { status: 400 });
  }

  const board_name = params.board_name as AuroraBoardName;

  // Get NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = saveAscentSchema.parse(body);

    // saveAscent now writes to boardsesh_ticks using NextAuth userId
    const response = await saveAscent(board_name, validatedData.token, validatedData.options, session.user.id);
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
