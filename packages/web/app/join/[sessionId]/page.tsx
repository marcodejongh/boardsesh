import { redirect, notFound } from 'next/navigation';
import { dbz } from '@/app/lib/db/db';
import { boardSessions } from '@/app/lib/db/schema';
import { eq } from 'drizzle-orm';

interface JoinPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { sessionId } = await params;

  // Look up the session in the database
  const session = await dbz
    .select({
      id: boardSessions.id,
      boardPath: boardSessions.boardPath,
      status: boardSessions.status,
    })
    .from(boardSessions)
    .where(eq(boardSessions.id, sessionId))
    .limit(1);

  if (session.length === 0) {
    notFound();
  }

  const { boardPath } = session[0];

  // Redirect to the board path with session query parameter
  // boardPath format: {board_name}/{layout_id}/{size_id}/{set_ids}/{angle}
  // Strip leading slashes to avoid creating protocol-relative URLs (//kilter/... → kilter as host)
  const cleanPath = boardPath.replace(/^\/+/, '');
  redirect(`/${cleanPath}?session=${sessionId}`);
}
