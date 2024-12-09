import { sql } from '@/lib/db';
import { BoardName } from '../../types';
import { API_HOSTS, LoginResponse } from './types';
import { syncUserData } from './syncAllUserData';

async function checkUserExists(board: BoardName, userId: number): Promise<boolean> {
  const tableName = board === 'tension' || board === 'kilter' ? `${board}_users` : 'users';

  const result = await sql.query(`SELECT 1 FROM ${tableName} WHERE id = $1 LIMIT 1`, [userId]);

  return result.rows.length > 0;
}

export async function login(board: BoardName, username: string, password: string): Promise<LoginResponse> {
  // First perform the API login
  const response = await fetch(`${API_HOSTS[board]}/v1/logins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const loginResponse: LoginResponse = await response.json();

  if (loginResponse.user_id) {
    const tableName = board === 'tension' || board === 'kilter' ? `${board}_users` : 'users';
    const userExists = await checkUserExists(board, loginResponse.user_id);

    // Insert/update user in our database
    await sql.query(
      `
      INSERT INTO ${tableName} (id, username, created_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username
      `,
      [loginResponse.user_id, loginResponse.username, new Date(loginResponse.login.created_at)],
    );

    // If it's a new user, perform full sync
    if (!userExists) {
      try {
        await syncUserData(
          board,
          loginResponse.token,
          loginResponse.user_id.toString(),
          undefined, // undefined means sync all tables
        );
      } catch (error) {
        console.error('Initial sync error:', error);
        // We don't throw here as login was successful
      }
    }
  }

  return loginResponse;
}
