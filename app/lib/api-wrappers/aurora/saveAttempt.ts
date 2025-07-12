import { BoardName } from '../../types';
import { WEB_HOSTS, SaveAttemptOptions } from './types';
import { generateUuid } from './util';
import dayjs from 'dayjs';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function saveAttempt(board: BoardName, token: string, options: SaveAttemptOptions): Promise<any> {
  const uuid = generateUuid();
  
  // Convert the ISO date to the required format "YYYY-MM-DD HH:mm:ss"
  const formattedDate = dayjs(options.climbed_at).format('YYYY-MM-DD HH:mm:ss');

  // Match the Kotlin implementation structure
  const requestData = {
    uuid,
    user_id: options.user_id,
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    is_mirror: options.is_mirror ? 1 : 0,
    bid_count: options.bid_count,
    comment: options.comment,
    climbed_at: formattedDate,
  };

  // Build URL-encoded form data
  const requestBody = new URLSearchParams();
  Object.entries(requestData).forEach(([key, value]) => {
    requestBody.append(key, String(value));
  });

  // Use the web host endpoint with POST method
  const url = `${WEB_HOSTS[board]}/bids/save`;
  console.log(`Saving attempt to: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
    body: requestBody.toString(),
  });

  console.log(`Save attempt response status: ${response.status}`);
  console.log(`Save attempt response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const responseClone = response.clone();
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      try {
        errorData = await responseClone.text();
      } catch {
        errorData = 'Could not read error response';
      }
    }
    console.error('Error response:', {
      status: response.status,
      statusText: response.statusText,
      errors: errorData,
    });
    throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
  }

  // Handle response
  let responseData: unknown;
  try {
    const responseText = await response.text();
    console.log(`Save attempt response body: ${responseText}`);

    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from API');
    }
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
    throw new Error(`Failed to parse API response: ${parseError}`);
  }

  return responseData;
}
