// app/api/[board]/sync/route.ts
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';

export async function POST(request: Request) {
  const { token, userId, board_name } = await request.json();

  try {
    await syncUserData(board_name, token, userId);
    return new Response(JSON.stringify({ success: true, message: 'All tables synced' }), { status: 200 });
  } catch (err) {
    console.error('Failed to sync with Aurora:', err);
    //@ts-expect-error Eh cant be bothered fixing this now
    return new Response(JSON.stringify({ error: 'Sync failed', details: err.message }), { status: 500 });
  }
}
