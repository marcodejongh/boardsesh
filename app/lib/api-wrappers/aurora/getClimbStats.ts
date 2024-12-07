import { BoardName, ClimbStats } from "./util";
import { API_HOSTS } from './types';


async function getClimbStats(board: BoardName, token: string, climbId: string, angle: number): Promise<ClimbStats> {
  const response = await fetch(`${API_HOSTS[board]}/v1/climbs/${climbId}/info?angle=${angle}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
