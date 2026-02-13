import { WEB_HOSTS, AuroraBoardName } from './types';
import { handleAuroraApiResponse } from './util';


export async function getClimbName(board: AuroraBoardName, climbId: string): Promise<string | null> {
  const response = await fetch(`${WEB_HOSTS[board]}/climbs/${climbId}`);
  handleAuroraApiResponse(response);
  const text = await response.text();
  const match = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return match ? match[1].trim() : null;
}
