import { BoardName } from '../../types';
import { userSync } from './userSync';

export async function getLogbook(board: BoardName, token: string, userId: string): Promise<any[]> {
  const syncResults = await userSync(board, token, userId, { tables: ['ascents'] });
  return syncResults.PUT.ascents || [];
}
