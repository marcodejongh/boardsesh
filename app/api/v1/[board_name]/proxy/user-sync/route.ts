// API Route handler for Next.js (app/api/sync/route.ts)
import { syncUserData } from '@/app/lib/api-wrappers/aurora/syncAllUserData';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { board, token, userId } = await req.json();

    if (!board || !token || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const results = await syncUserData(board, token, userId);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync user data' }, { status: 500 });
  }
}
