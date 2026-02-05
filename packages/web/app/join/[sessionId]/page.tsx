import { redirect, notFound } from 'next/navigation';
import { dbz } from '@/app/lib/db/db';
import { boardSessions } from '@/app/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SessionIdSchema } from '@/app/lib/validation/session';
import InvalidSessionError from './invalid-session-error';

interface JoinPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { sessionId } = await params;

  // Validate session ID format using Zod
  const validationResult = SessionIdSchema.safeParse(sessionId);

  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues[0]?.message || 'Invalid session ID format';
    return <InvalidSessionError sessionId={sessionId} errorMessage={errorMessage} />;
  }

  const validatedSessionId = validationResult.data;

  // Look up the session in the database
  const session = await dbz
    .select({
      id: boardSessions.id,
      boardPath: boardSessions.boardPath,
      status: boardSessions.status,
    })
    .from(boardSessions)
    .where(eq(boardSessions.id, validatedSessionId))
    .limit(1);

  if (session.length === 0) {
    notFound();
  }

  const { boardPath } = session[0];

  // Redirect to the board path with session query parameter
  // boardPath format: {board_name}/{layout_id}/{size_id}/{set_ids}/{angle}
  // Strip leading slashes to avoid creating protocol-relative URLs (//kilter/... → kilter as host)
  const cleanPath = boardPath.replace(/^\/+/, '');
  redirect(`/${cleanPath}?session=${validatedSessionId}`);
}
