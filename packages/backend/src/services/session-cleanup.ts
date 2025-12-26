import { roomManager } from './room-manager.js';

/**
 * Service for cleaning up expired sessions.
 * Sessions expire after 7 days of inactivity.
 */
export class SessionCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the cleanup service with a specified interval.
   * @param intervalMs Interval between cleanup runs in milliseconds (default: 1 hour)
   */
  start(intervalMs: number = 60 * 60 * 1000): void {
    if (this.isRunning) {
      console.warn('[SessionCleanup] Service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[SessionCleanup] Starting cleanup service (interval: ${intervalMs / 1000}s)`);

    // Run immediately on start
    this.cleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => this.cleanup(), intervalMs);
  }

  /**
   * Stop the cleanup service.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SessionCleanup] Service stopped');
  }

  /**
   * Run a cleanup cycle.
   * @returns Number of sessions cleaned up
   */
  async cleanup(): Promise<number> {
    try {
      const deletedCount = await roomManager.cleanupExpiredSessions();

      if (deletedCount > 0) {
        console.log(`[SessionCleanup] Cleaned up ${deletedCount} expired session(s)`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[SessionCleanup] Error during cleanup:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const sessionCleanupService = new SessionCleanupService();
