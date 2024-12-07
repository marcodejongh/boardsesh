import { BoardName } from '../../types';
import { userSync } from './userSync';

export async function getBidsLogbook(board: BoardName, token: string, userId: string): Promise<any[]> {
  const syncResults = await userSync(board, token, userId, { tables: ['bids'] });
  return syncResults.PUT.bids || [];
}
