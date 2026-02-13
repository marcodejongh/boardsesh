import { fetch } from 'undici';
import { SyncData } from '../sync-api-types';
import { WEB_HOSTS, SyncOptions, AuroraBoardName } from './types';
import { handleAuroraApiResponse } from './util';

//TODO: Can probably be consolidated with userSync
export async function sharedSync(
  board: AuroraBoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  token: string,
   
): Promise<SyncData> {
  const { sharedSyncs = [] } = options;

  // Try multiple sync endpoints for shared sync

  // Build URL-encoded form data using URLSearchParams for proper encoding
  // Add shared sync timestamps - matching Android app's table order
  const orderedTables = [
    'products',
    'product_sizes',
    'holes',
    'leds',
    'products_angles',
    'layouts',
    'product_sizes_layouts_sets',
    'placements',
    'sets',
    'placement_roles',
    'climbs',
    'climb_stats',
    'beta_links',
    'attempts',
    'kits',
  ];

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
  // Explicitly set Host header in case Vercel's fetch doesn't set it correctly
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

  handleAuroraApiResponse(response, `Shared sync failed for ${board}`);

  return response.json() as Promise<SyncData>;
}
