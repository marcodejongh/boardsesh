import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { API_HOSTS, SyncOptions } from './types';

//TODO: Can probably be consolidated with sharedSync
export async function userSync(
  board: BoardName,
  userId: string,
  options: SyncOptions = {},
  token: string,
): Promise<SyncData> {
  const { tables = [], walls = [], wallExpungements = [], sharedSyncs = [], userSyncs = [] } = options;

  const response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
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
            user_syncs: userSyncs,
          },
          tables,
          user_id: userId,
          include_multiframe_climbs: 1,
          include_all_beta_links: 1,
          include_null_climb_stats: 1,
        },
      },
      PUT: {
        walls,
        wall_expungements: wallExpungements,
      },
    }),
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  return response.json();
}
