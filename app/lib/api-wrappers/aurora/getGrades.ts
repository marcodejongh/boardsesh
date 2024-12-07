import { BoardName } from '../../types';
import { sharedSync } from './sharedSync';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function getGrades(board: BoardName): Promise<any[]> {
  const syncResults = await sharedSync(board, { tables: ['difficulty_grades'] });
  return syncResults.PUT.difficulty_grades;
}
