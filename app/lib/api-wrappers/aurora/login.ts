import { BoardName, LoginResponse } from "./util";
import { API_HOSTS } from './types';


async function login(board: BoardName, username: string, password: string): Promise<LoginResponse> {
  console.log(`${API_HOSTS[board]}/v1/logins`);
  const response = await fetch(`${API_HOSTS[board]}/v1/logins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
