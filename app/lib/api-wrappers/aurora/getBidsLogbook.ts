import { BoardName } from './util';
import { userSync } from './userSync';

async function getBidsLogbook(board: BoardName, token: string, userId: string): Promise<any[]> {
  const syncResults = await userSync(board, token, userId, { tables: ['bids'] });
  return syncResults.PUT.bids || [];
}
