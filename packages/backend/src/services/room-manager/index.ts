export { RoomManager } from './room-manager';
export { VersionConflictError } from './types';
export type { ConnectedClient, DiscoverableSession, QueueState, PendingWrite } from './types';

import { RoomManager } from './room-manager';

export const roomManager = new RoomManager();
