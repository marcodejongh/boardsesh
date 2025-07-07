import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { API_HOSTS, WEB_HOSTS, SyncOptions } from './types';

//TODO: Can probably be consolidated with userSync
export async function sharedSync(
  board: BoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  token: string,
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
): Promise<SyncData> {
  const { sharedSyncs = [] } = options;

  // Try multiple sync endpoints for shared sync
  let response: Response;
  
  // Build URL-encoded form data - Aurora expects this format!
  const params: string[] = [];
  
  // Add shared sync timestamps - matching Android app's table order
  const orderedTables = [
    'products', 'product_sizes', 'holes', 'leds', 'products_angles', 
    'layouts', 'product_sizes_layouts_sets', 'placements', 'sets', 
    'placement_roles', 'climbs', 'climb_stats', 'beta_links', 'attempts', 'kits'
  ];
  
  // Create a map for quick lookup
  const syncMap = new Map(sharedSyncs.map(s => [s.table_name, s.last_synchronized_at]));
  
  // Add parameters in the same order as Android app
  orderedTables.forEach((tableName) => {
    const timestamp = syncMap.get(tableName) || '1970-01-01 00:00:00.000000';
    params.push(`${encodeURIComponent(tableName)}=${encodeURIComponent(timestamp)}`);
  });
  
  const requestBody = params.join('&');
  console.log('Shared sync request body:', requestBody);
  
  try {
    // First try web host (no v1 prefix)
    const webUrl = `${WEB_HOSTS[board]}/sync`;
    console.log(`Trying web host: ${webUrl}`);
    response = await fetch(webUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`
      },
      cache: 'no-store',
      body: requestBody,
    });

    // If web host returns 404, try API host with /v1/sync
    if (response.status === 404) {
      const apiUrl = `${API_HOSTS[board]}/v1/sync`;
      console.log(`Web host shared sync failed with 404, trying API host: ${apiUrl}`);
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
          'Cookie': `token=${token}`
        },
        cache: 'no-store',
        body: requestBody,
      });
    }
  } catch (error) {
    // If web host fetch fails completely, try API host as fallback
    console.log(`Web host shared sync failed with error, trying API host`);
    response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`
      },
      cache: 'no-store',
      body: requestBody,
    });
  }
  
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  console.log(`Shared sync successful with status: ${response.status}`);
  return response.json();
}
