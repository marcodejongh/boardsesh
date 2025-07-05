import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { API_HOSTS, WEB_HOSTS, SyncOptions } from './types';

//TODO: Can probably be consolidated with sharedSync
export async function userSync(
  board: BoardName,
  userId: number,
  options: SyncOptions = {},
  token: string,
): Promise<SyncData> {
  const { tables = [], walls = [], wallExpungements = [], sharedSyncs = [], userSyncs = [] } = options;

  // Try multiple sync endpoints
  let response: Response;
  
  // Build URL-encoded form data - Aurora expects this format!
  const params: string[] = [];
  
  // Add shared sync timestamps
  sharedSyncs.forEach((sync) => {
    params.push(`${encodeURIComponent(sync.table_name)}=${encodeURIComponent(sync.last_synchronized_at)}`);
  });
  
  // Add user sync timestamps
  userSyncs.forEach((sync) => {
    params.push(`${encodeURIComponent(sync.table_name)}=${encodeURIComponent(sync.last_synchronized_at)}`);
  });
  
  const requestBody = params.join('&');
  console.log('requestBody', requestBody);

  try {
    // First try /sync on web host (no v1 prefix)
    response = await fetch(`${WEB_HOSTS[board]}/sync`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`,
      },
      body: requestBody,
    });

    // If web host returns 404, try API host with /v1/sync
    if (response.status === 404) {
      console.log(`Web host sync failed with 404, falling back to API host`);
      response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
          'Cookie': `token=${token}`,
        },
        body: requestBody,
      });
    }
  } catch (error) {
    // If web host fetch fails completely, try API host as fallback
    console.log(`Web host sync failed with error, falling back to API host`);
    response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`,
      },
      body: requestBody,
    });
  }

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  

  return response.json();
}
