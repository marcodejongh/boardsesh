import { BoardName } from '../../types';
import { SyncData } from '../sync-api-types';
import { WEB_HOSTS, SyncOptions } from './types';

//TODO: Can probably be consolidated with sharedSync
export async function userSync(
  board: BoardName,
  userId: number,
  options: SyncOptions = {},
  token: string,
): Promise<SyncData> {
  const { sharedSyncs = [], userSyncs = [] } = options;

  // Try multiple sync endpoints

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

  const webUrl = `${WEB_HOSTS[board]}/sync`;
  console.log(`Calling user sync endpoint: ${webUrl}`);

  const response = await fetch(webUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
    body: requestBody,
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  return response.json();
}
