import type Redis from 'ioredis';
import { DistributedStateManager } from './distributed-state';

export { DistributedStateManager } from './distributed-state';
export type { DistributedConnection } from './constants';

// Singleton instance - initialized when Redis is available
let distributedStateManager: DistributedStateManager | null = null;

/**
 * Initialize the distributed state manager.
 * Call this during server startup when Redis is available.
 *
 * Safe for hot module reload: if already initialized, returns existing instance
 * and logs a warning (once per instance to avoid log spam).
 */
export function initializeDistributedState(
  redis: Redis,
  instanceId?: string
): DistributedStateManager {
  if (distributedStateManager) {
    if (
      !(distributedStateManager as DistributedStateManager & { _hasWarnedReInit?: boolean })
        ._hasWarnedReInit
    ) {
      console.warn('[DistributedState] Already initialized, returning existing instance');
      (
        distributedStateManager as DistributedStateManager & { _hasWarnedReInit?: boolean }
      )._hasWarnedReInit = true;
    }
    return distributedStateManager;
  }

  distributedStateManager = new DistributedStateManager(redis, instanceId);
  return distributedStateManager;
}

/**
 * Get the distributed state manager instance.
 * Returns null if not initialized (single-instance mode).
 */
export function getDistributedState(): DistributedStateManager | null {
  return distributedStateManager;
}

/**
 * Check if distributed state is enabled (Redis available).
 */
export function isDistributedStateEnabled(): boolean {
  return distributedStateManager !== null;
}

/**
 * Shutdown the distributed state manager.
 */
export async function shutdownDistributedState(): Promise<void> {
  if (distributedStateManager) {
    await distributedStateManager.stop();
    distributedStateManager = null;
  }
}

/**
 * Reset the singleton state (for testing and hot-reload scenarios).
 * This stops the manager (clearing intervals and cleaning up connections) before clearing.
 * For synchronous reset without cleanup (e.g., after manual stop()), use forceResetDistributedState().
 */
export async function resetDistributedState(): Promise<void> {
  if (distributedStateManager) {
    await distributedStateManager.stop();
    distributedStateManager = null;
  }
}

/**
 * Force reset the singleton state synchronously.
 * This clears the heartbeat interval to prevent memory leaks, but does NOT
 * clean up Redis state (connections, sessions). Use this in tests where
 * Redis cleanup is handled separately, or when you need a synchronous reset.
 *
 * For proper cleanup including Redis state, use shutdownDistributedState() instead.
 */
export function forceResetDistributedState(): void {
  if (distributedStateManager) {
    if (!distributedStateManager.isStopped()) {
      console.warn(
        '[DistributedState] Force resetting without prior stop() - ' +
          'clearing heartbeat interval but Redis state may be orphaned'
      );
      distributedStateManager.stopHeartbeat();
    }
  }
  distributedStateManager = null;
}
