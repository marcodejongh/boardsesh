import { BoardName } from '../../types';
import { WEB_HOSTS, SaveClimbOptions } from './types';
import { generateUuid } from './util';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function saveClimb(board: BoardName, token: string, options: SaveClimbOptions): Promise<any> {
  const uuid = generateUuid();

  // Build URL-encoded form data - Aurora expects this format!
  const requestBody = new URLSearchParams();
  requestBody.append('uuid', uuid);
  requestBody.append('layout_id', String(options.layout_id));
  requestBody.append('setter_id', String(options.setter_id));
  requestBody.append('name', options.name);
  requestBody.append('description', options.description);
  requestBody.append('is_draft', options.is_draft ? '1' : '0');
  requestBody.append('frames', options.frames);
  requestBody.append('frames_count', String(options.frames_count ?? 1));
  requestBody.append('frames_pace', String(options.frames_pace ?? 0));
  requestBody.append('angle', String(options.angle));

  // Use the web host endpoint with POST method (same pattern as saveAscent)
  const url = `${WEB_HOSTS[board]}/climbs/save`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
    body: requestBody.toString(),
  });

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
    throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
