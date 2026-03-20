import type { SessionUser } from '@boardsesh/shared-schema';

interface UuidItem {
  uuid: string;
}

export function upsertSessionUser(users: SessionUser[], user: SessionUser): SessionUser[] {
  const existingIndex = users.findIndex((existingUser) => existingUser.id === user.id);
  if (existingIndex === -1) {
    return [...users, user];
  }

  const nextUsers = [...users];
  nextUsers[existingIndex] = {
    ...nextUsers[existingIndex],
    ...user,
  };
  return nextUsers;
}

export function insertQueueItemIdempotent<T extends UuidItem>(
  queue: T[],
  item: T,
  position?: number,
): T[] {
  if (queue.some((existingItem) => existingItem.uuid === item.uuid)) {
    return queue;
  }

  const nextQueue = [...queue];
  if (position !== undefined && position >= 0 && position <= nextQueue.length) {
    nextQueue.splice(position, 0, item);
    return nextQueue;
  }

  nextQueue.push(item);
  return nextQueue;
}

export type QueueSequenceDecision = 'apply' | 'ignore-stale' | 'gap';

export function evaluateQueueEventSequence(
  lastSequence: number | null,
  eventSequence: number,
): QueueSequenceDecision {
  if (lastSequence === null) {
    return 'apply';
  }

  if (eventSequence <= lastSequence) {
    return 'ignore-stale';
  }

  if (eventSequence > lastSequence + 1) {
    return 'gap';
  }

  return 'apply';
}
