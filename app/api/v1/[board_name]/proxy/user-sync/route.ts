// app/api/[board]/sync/route.ts
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';
import { getSession } from '@/app/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { board_name } = await request.json();

  try {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore, board_name);
    if (!session) {
      throw new Error('401: Unauthorized');
    }
    const { token, userId, username } = session;
    await syncUserData(board_name, token, userId);
    return new Response(JSON.stringify({ success: true, message: 'All tables synced' }), { status: 200 });
  } catch (err) {
    console.error('Failed to sync with Aurora:', err);
    //@ts-expect-error Eh cant be bothered fixing this now
    return new Response(JSON.stringify({ error: 'Sync failed', details: err.message }), { status: 500 });
  }
}
