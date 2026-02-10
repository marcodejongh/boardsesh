import { fetch } from 'undici';
import { SyncData } from '../sync-api-types';
import { WEB_HOSTS, AuroraBoardName, LastSyncData, UserSyncData, SHARED_SYNC_TABLES } from './types';

interface AuroraSyncParams {
  board: AuroraBoardName;
  token: string;
  sharedSyncs?: LastSyncData[];
  userSyncs?: UserSyncData[];
  /**
   * When true, uses SHARED_SYNC_TABLES ordering and fills missing timestamps
   * with epoch. Used for shared sync to match Android app's table order.
   */
  useOrderedSharedTables?: boolean;
}

/**
 * Unified Aurora sync function that handles both shared and user syncs.
 * Previously split across sharedSync.ts and userSync.ts.
 */
export async function auroraSync({
  board,
  token,
  sharedSyncs = [],
  userSyncs = [],
  useOrderedSharedTables = false,
}: AuroraSyncParams): Promise<SyncData> {
  const searchParams = new URLSearchParams();

  if (useOrderedSharedTables) {
    // For shared sync: use ordered table list with epoch defaults
    const syncMap = new Map(sharedSyncs.map((s) => [s.table_name, s.last_synchronized_at]));
    SHARED_SYNC_TABLES.forEach((tableName) => {
      const timestamp = syncMap.get(tableName) || '1970-01-01 00:00:00.000000';
      searchParams.append(tableName, timestamp);
    });
  } else {
    // For user sync: append timestamps in order received
    sharedSyncs.forEach((sync) => {
      searchParams.append(sync.table_name, sync.last_synchronized_at);
    });
    userSyncs.forEach((sync) => {
      searchParams.append(sync.table_name, sync.last_synchronized_at);
    });
  }

  const requestBody = searchParams.toString();
  const webUrl = `${WEB_HOSTS[board]}/sync`;
  const hostName = new URL(webUrl).hostname;

  const headers = {
    Host: hostName,
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    Connection: 'keep-alive',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Kilter Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
    Cookie: `token=${token}`,
  };

  const response = await fetch(webUrl, {
    method: 'POST',
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Aurora sync failed for ${board}: ${response.status}`, errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<SyncData>;
}
