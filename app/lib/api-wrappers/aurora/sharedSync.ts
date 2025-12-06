import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { WEB_HOSTS, SyncOptions } from './types';

//TODO: Can probably be consolidated with userSync
export async function sharedSync(
  board: BoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  token: string,
   
): Promise<SyncData> {
  const { sharedSyncs = [] } = options;

  // Try multiple sync endpoints for shared sync

  // Build URL-encoded form data - Aurora expects this format!
  const params: string[] = [];

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
  orderedTables.forEach((tableName) => {
    const timestamp = syncMap.get(tableName) || '1970-01-01 00:00:00.000000';
    params.push(`${encodeURIComponent(tableName)}=${encodeURIComponent(timestamp)}`);
  });

  const requestBody = params.join('&');
  console.log('Shared sync request body:', requestBody);

  const webUrl = `${WEB_HOSTS[board]}/sync`;
  console.log(`Calling sync endpoint: ${webUrl}`);

  const response = await fetch(webUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
    cache: 'no-store',
    body: requestBody,
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  console.log(`Shared sync successful with status: ${response.status}`);
  return response.json();
}
