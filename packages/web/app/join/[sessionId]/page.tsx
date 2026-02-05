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

// Default angle to use when boardPath doesn't include one (for backward compatibility)
const DEFAULT_ANGLE = 40;

/**
 * Ensures the board path ends with a view segment (/list, /play/uuid, /view/slug, /create)
 * If not, appends /list to provide a good landing page for joined users.
 *
 * Handles three cases:
 * 1. Path already has view segment: /board/.../40/list → use as-is
 * 2. Path has angle but no view: /board/.../40 → append /list
 * 3. Old format without angle: /board/.../sets → append default angle and /list
 */
function ensureViewSegment(path: string): string {
  // Check if path already ends with a view segment
  if (/\/(list|create)$/.test(path) || /\/(play|view)\/[^/]+$/.test(path)) {
    return path;
  }

  // Check if path ends with an angle (a number)
  if (/\/\d+$/.test(path)) {
    // Has angle, just append /list
    return `${path}/list`;
  }

  // Old format without angle - append default angle and /list
  return `${path}/${DEFAULT_ANGLE}/list`;
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
  // boardPath format: {board_name}/{layout_id}/{size_id}/{set_ids}[/{angle}][/list|/play/uuid]
  // Strip leading slashes to avoid creating protocol-relative URLs (//kilter/... → kilter as host)
  const cleanPath = boardPath.replace(/^\/+/, '');

  // Ensure the path ends with a view segment (/list) for a good user experience
  const redirectPath = ensureViewSegment(cleanPath);

  redirect(`/${redirectPath}?session=${validatedSessionId}`);
}
