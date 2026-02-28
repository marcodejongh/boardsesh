import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getMostRecentQueue,
  saveQueueState,
} from '../queue-storage-db';
import type { ClimbQueueItem } from '../../components/queue-control/types';
import type { BoardDetails, Climb } from '../types';

const DB_NAME = 'boardsesh-queue';
const STORE_NAME = 'queues';

function createTestBoardDetails(overrides?: Partial<BoardDetails>): BoardDetails {
  return {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 10,
    set_ids: '1,2',
    images_to_holds: {},
    holdsData: {},
    edge_left: 0,
    edge_right: 100,
    edge_bottom: 0,
    edge_top: 100,
    boardHeight: 100,
    boardWidth: 100,
    layout_name: 'Original',
    size_name: '12x12',
    ...overrides,
  } as BoardDetails;
}

function createTestClimb(uuid: string): Climb {
  return {
    uuid: `climb-${uuid}`,
    name: `Climb ${uuid}`,
    setter_username: 'tester',
    description: '',
    frames: '',
    angle: 40,
    ascensionist_count: 10,
    difficulty: '5',
    quality_average: '3',
    stars: 3,
    difficulty_error: '',
    litUpHoldsMap: {},
    mirrored: false,
    benchmark_difficulty: null,
    userAscents: 0,
    userAttempts: 0,
  } as Climb;
}

function createTestClimbQueueItem(uuid: string): ClimbQueueItem {
  return {
    uuid,
    climb: createTestClimb(uuid),
    addedBy: null,
    suggested: false,
  };
}

beforeEach(async () => {
  // Clear the store contents using a separate short-lived connection
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  await db.clear(STORE_NAME);
  db.close();
});

describe('getMostRecentQueue', () => {
  it('returns null when no queues are stored', async () => {
    const result = await getMostRecentQueue();
    expect(result).toBeNull();
  });

  it('returns the queue with the highest updatedAt', async () => {
    const boardDetails = createTestBoardDetails();

    // Write directly to IndexedDB with controlled timestamps to avoid
    // Date.now() non-determinism in saveQueueState (which overwrites updatedAt).
    const db = await openDB(DB_NAME, 1);
    await db.put(
      STORE_NAME,
      {
        boardPath: '/kilter/1/10/1,2/40',
        queue: [createTestClimbQueueItem('a')],
        currentClimbQueueItem: null,
        boardDetails,
        updatedAt: 1000,
      },
      'queue:/kilter/1/10/1,2/40',
    );
    await db.put(
      STORE_NAME,
      {
        boardPath: '/tension/1/10/1,2/45',
        queue: [createTestClimbQueueItem('b')],
        currentClimbQueueItem: null,
        boardDetails: createTestBoardDetails({ board_name: 'tension' }),
        updatedAt: 2000,
      },
      'queue:/tension/1/10/1,2/45',
    );
    db.close();

    const result = await getMostRecentQueue();
    expect(result).not.toBeNull();
    expect(result!.boardPath).toBe('/tension/1/10/1,2/45');
    expect(result!.queue).toHaveLength(1);
    expect(result!.queue[0].uuid).toBe('b');
  });

  it('filters out corrupted items (null/undefined climbs)', async () => {
    const boardDetails = createTestBoardDetails();
    const validItem = createTestClimbQueueItem('valid');

    // Save directly to DB with corrupted items to test filtering
    const db = await openDB(DB_NAME, 1);
    await db.put(
      STORE_NAME,
      {
        boardPath: '/kilter/1/10/1,2/40',
        queue: [validItem, null, undefined, { uuid: 'bad', climb: null }],
        currentClimbQueueItem: validItem,
        boardDetails,
        updatedAt: Date.now(),
      },
      'queue:/kilter/1/10/1,2/40',
    );
    db.close();

    const result = await getMostRecentQueue();
    expect(result).not.toBeNull();
    expect(result!.queue).toHaveLength(1);
    expect(result!.queue[0].uuid).toBe('valid');
  });

  it('returns the single stored queue when only one exists', async () => {
    const boardDetails = createTestBoardDetails();
    const item = createTestClimbQueueItem('only');

    await saveQueueState({
      boardPath: '/kilter/1/10/1,2/40',
      queue: [item],
      currentClimbQueueItem: item,
      boardDetails,
      updatedAt: Date.now(),
    });

    const result = await getMostRecentQueue();
    expect(result).not.toBeNull();
    expect(result!.queue).toHaveLength(1);
    expect(result!.currentClimbQueueItem?.uuid).toBe('only');
  });
});
