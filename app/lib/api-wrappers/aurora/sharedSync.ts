import { BoardName } from '../../types';
import { API_HOSTS, SyncOptions } from './types';

export async function sharedSync(
  board: BoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
): Promise<any> {
  const { tables = [], sharedSyncs = [] } = options;

  const response = await fetch(`${API_HOSTS[board]}/v1/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
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
          },
          tables,
          include_multiframe_climbs: 1,
          include_all_beta_links: 1,
          include_null_climb_stats: 1,
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
