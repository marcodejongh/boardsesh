import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { API_HOSTS, WEB_HOSTS, SyncOptions } from './types';

export async function sharedSync(
  board: BoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
): Promise<SyncData> {
  const { tables = [], sharedSyncs = [] } = options;

  // Try multiple sync endpoints for shared sync
  let response: Response;
  const requestBody = JSON.stringify({
    client: {
      enforces_product_passwords: 1,
      enforces_layout_passwords: 1,
      manages_power_responsibly: 1,
      ufd: 1,
    },
    GET: {
      query: {
        syncs: {
          shared_syncs: sharedSyncs,
        },
        tables,
        include_multiframe_climbs: 1,
        include_all_beta_links: 1,
        include_null_climb_stats: 1,
      },
    },
  });
  
  try {
    // First try web host (no v1 prefix)
    response = await fetch(`${WEB_HOSTS[board]}/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0'
      },
      cache: 'no-store',
      body: requestBody,
    });

    // If web host returns 404, try API host with /v1/sync
    if (response.status === 404) {
      console.log(`Web host shared sync failed with 404, trying API host`);
      response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0'
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
        'Content-Type': 'application/json',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0'
      },
      cache: 'no-store',
      body: requestBody,
    });
  }
  
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  console.log(`Shared sync successful with status: ${response.status}`);
  return response.json();
}
