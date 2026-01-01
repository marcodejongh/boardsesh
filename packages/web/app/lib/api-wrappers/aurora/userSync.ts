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

  // Build URL-encoded form data using URLSearchParams for proper encoding
  const searchParams = new URLSearchParams();

  // Add shared sync timestamps
  sharedSyncs.forEach((sync) => {
    searchParams.append(sync.table_name, sync.last_synchronized_at);
  });

  // Add user sync timestamps
  userSyncs.forEach((sync) => {
    searchParams.append(sync.table_name, sync.last_synchronized_at);
  });

  const requestBody = searchParams.toString();
  console.log('requestBody', requestBody);

  const webUrl = `${WEB_HOSTS[board]}/sync`;
  const hostName = new URL(webUrl).hostname;
  console.log(`Calling user sync endpoint: ${webUrl}`);
  console.log(`Token length: ${token?.length}, Token prefix: ${token?.substring(0, 10)}...`);

  // Match headers from AuroraClimbingClient for consistency with login request
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

  console.log('Request headers:', JSON.stringify(headers, null, 2));

  const response = await fetch(webUrl, {
    method: 'POST',
    cache: 'no-store',
    next: { revalidate: 0 }, // Ensure no Vercel/Next.js caching
    headers,
    body: requestBody,
  });

  console.log(`Response status: ${response.status} ${response.statusText}`);
  console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response body:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
