import { BoardName } from '../../types';
import { userSync } from './userSync';

interface Bid {
  uuid: string;
  user_id: number;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  bid_count: number;
  comment: string;
  climbed_at: string;
  created_at: string;
}

export async function getBidsLogbook(board: BoardName, token: string, userId: string): Promise<Bid[]> {
  const syncResults = await userSync(board, Number(userId), { tables: ['bids'] }, token);
  return (syncResults.bids as Bid[]) || [];
}
