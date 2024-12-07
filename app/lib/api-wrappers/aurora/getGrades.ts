import { BoardName } from './util';
import { sharedSync } from './sharedSync';

async function getGrades(board: BoardName): Promise<any[]> {
  const syncResults = await sharedSync(board, { tables: ['difficulty_grades'] });
  return syncResults.PUT.difficulty_grades;
}
