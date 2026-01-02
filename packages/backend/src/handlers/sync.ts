import type { IncomingMessage, ServerResponse } from 'http';
import { SyncRunner } from '@boardsesh/aurora-sync/runner';
import { applyCorsHeaders } from './cors.js';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Handle sync cron endpoint
 * Triggered by external cron service to sync all users
 */
export async function handleSyncCron(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Apply CORS headers
  if (!applyCorsHeaders(req, res)) return;

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Auth check - require CRON_SECRET in Authorization header
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  console.log('[Sync] Starting sync cron job...');

  const runner = new SyncRunner({
    onLog: (msg) => console.log(`[Sync] ${msg}`),
    onError: (error, context) => {
      console.error(`[Sync] Error for ${context.userId}/${context.board}:`, error.message);
    },
  });

  try {
    const result = await runner.syncAllUsers();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        results: {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
        },
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }),
    );

    console.log(`[Sync] Completed: ${result.successful}/${result.total} users synced successfully`);
  } catch (error) {
    console.error('[Sync] Cron job failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  } finally {
    await runner.close();
  }
}
