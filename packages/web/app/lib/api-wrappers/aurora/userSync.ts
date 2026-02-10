import { SyncData } from '../sync-api-types';
import { SyncOptions, AuroraBoardName } from './types';
import { auroraSync } from './auroraSync';

export async function userSync(
  board: AuroraBoardName,
  _userId: number,
  options: SyncOptions = {},
  token: string,
): Promise<SyncData> {
  const { sharedSyncs = [], userSyncs = [] } = options;

  return auroraSync({
    board,
    token,
    sharedSyncs,
    userSyncs,
  });
}
