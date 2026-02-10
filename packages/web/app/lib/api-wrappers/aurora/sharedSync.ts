import { SyncData } from '../sync-api-types';
import { SyncOptions, AuroraBoardName } from './types';
import { auroraSync } from './auroraSync';

export async function sharedSync(
  board: AuroraBoardName,
  options: Omit<SyncOptions, 'walls' | 'wallExpungements'> = {},
  token: string,
): Promise<SyncData> {
  const { sharedSyncs = [] } = options;

  return auroraSync({
    board,
    token,
    sharedSyncs,
    useOrderedSharedTables: true,
  });
}
