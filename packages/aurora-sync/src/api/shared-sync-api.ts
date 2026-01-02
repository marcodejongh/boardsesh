import { SyncData } from './sync-api-types.js';
import { WEB_HOSTS, SyncOptions, AuroraBoardName, SHARED_SYNC_TABLES } from './types.js';

export async function sharedSync(
  board: AuroraBoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  token: string,
): Promise<SyncData> {
  const { sharedSyncs = [] } = options;

  // Build URL-encoded form data using URLSearchParams for proper encoding
  // Add shared sync timestamps - matching Android app's table order
  const orderedTables = SHARED_SYNC_TABLES;

  // Create a map for quick lookup
  const syncMap = new Map(sharedSyncs.map((s) => [s.table_name, s.last_synchronized_at]));

  // Add parameters in the same order as Android app
  const searchParams = new URLSearchParams();
  orderedTables.forEach((tableName) => {
    const timestamp = syncMap.get(tableName) || '1970-01-01 00:00:00.000000';
    searchParams.append(tableName, timestamp);
  });

  const requestBody = searchParams.toString();

  const webUrl = `${WEB_HOSTS[board]}/sync`;
  const hostName = new URL(webUrl).hostname;

  // Match headers from AuroraClimbingClient for consistency
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

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  return response.json();
}
