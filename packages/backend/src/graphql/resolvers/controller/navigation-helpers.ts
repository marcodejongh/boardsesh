import type { ClimbQueueItem, QueueNavigationItem, QueueNavigationContext } from '@boardsesh/shared-schema';
import { getGradeColor } from './grade-colors';

/**
 * Build a minimal navigation item from a queue item for ESP32 display
 * Contains only the essential info needed to show prev/next climb indicators
 */
export function buildNavigationItem(item: ClimbQueueItem): QueueNavigationItem {
  const climb = item.climb;
  return {
    name: climb.name,
    grade: climb.difficulty,
    gradeColor: getGradeColor(climb.difficulty),
  };
}

/**
 * Build navigation context for the current climb in the queue
 * Returns prev/next climbs and position info for ESP32 navigation UI
 *
 * @param queue - Full queue array
 * @param currentIndex - Index of the current climb in the queue (-1 if not in queue)
 * @returns Navigation context with up to 3 previous climbs and 1 next climb
 */
export function buildNavigationContext(
  queue: ClimbQueueItem[],
  currentIndex: number
): QueueNavigationContext {
  const previousClimbs: QueueNavigationItem[] = [];
  let nextClimb: QueueNavigationItem | null = null;

  // Get up to 3 previous climbs (most recent first)
  if (currentIndex > 0) {
    const startIdx = Math.max(0, currentIndex - 3);
    for (let i = currentIndex - 1; i >= startIdx; i--) {
      previousClimbs.push(buildNavigationItem(queue[i]));
    }
  }

  // Get next climb if available
  if (currentIndex >= 0 && currentIndex < queue.length - 1) {
    nextClimb = buildNavigationItem(queue[currentIndex + 1]);
  }

  return {
    previousClimbs,
    nextClimb,
    currentIndex: Math.max(0, currentIndex),
    totalCount: queue.length,
  };
}

/**
 * Find the index of a climb in the queue by UUID
 * @param queue - Full queue array
 * @param climbUuid - UUID of the climb to find
 * @returns Index of the climb, or -1 if not found
 */
export function findClimbIndex(queue: ClimbQueueItem[], climbUuid: string | undefined): number {
  if (!climbUuid) return -1;
  return queue.findIndex((item) => item.uuid === climbUuid);
}
