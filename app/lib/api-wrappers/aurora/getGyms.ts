import { BoardName, GymInfo } from "./util";
import { API_HOSTS } from './types';


async function getGyms(board: BoardName): Promise<{ gyms: GymInfo[]; }> {
  const response = await fetch(`${API_HOSTS[board]}/v1/pins?types=gym`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
