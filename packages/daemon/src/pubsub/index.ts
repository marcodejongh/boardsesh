import type { QueueEvent, SessionEvent } from '@boardsesh/shared-schema';

type QueueSubscriber = (event: QueueEvent) => void;
type SessionSubscriber = (event: SessionEvent) => void;

/**
 * Simple PubSub for managing session-scoped subscriptions.
 * Used by GraphQL subscriptions to receive real-time updates.
 */
class PubSub {
  private queueSubscribers: Map<string, Set<QueueSubscriber>> = new Map();
  private sessionSubscribers: Map<string, Set<SessionSubscriber>> = new Map();

  /**
   * Subscribe to queue events for a session.
   * @returns Unsubscribe function
   */
  subscribeQueue(sessionId: string, callback: QueueSubscriber): () => void {
    if (!this.queueSubscribers.has(sessionId)) {
      this.queueSubscribers.set(sessionId, new Set());
    }
    this.queueSubscribers.get(sessionId)!.add(callback);

    return () => {
      this.queueSubscribers.get(sessionId)?.delete(callback);
      // Clean up empty sets
      if (this.queueSubscribers.get(sessionId)?.size === 0) {
        this.queueSubscribers.delete(sessionId);
      }
    };
  }

  /**
   * Subscribe to session events (user joins/leaves, leader changes).
   * @returns Unsubscribe function
   */
  subscribeSession(sessionId: string, callback: SessionSubscriber): () => void {
    if (!this.sessionSubscribers.has(sessionId)) {
      this.sessionSubscribers.set(sessionId, new Set());
    }
    this.sessionSubscribers.get(sessionId)!.add(callback);

    return () => {
      this.sessionSubscribers.get(sessionId)?.delete(callback);
      // Clean up empty sets
      if (this.sessionSubscribers.get(sessionId)?.size === 0) {
        this.sessionSubscribers.delete(sessionId);
      }
    };
  }

  /**
   * Publish a queue event to all subscribers of a session.
   */
  publishQueueEvent(sessionId: string, event: QueueEvent): void {
    const subscribers = this.queueSubscribers.get(sessionId);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in queue subscriber:', error);
        }
      }
    }
  }

  /**
   * Publish a session event to all subscribers.
   */
  publishSessionEvent(sessionId: string, event: SessionEvent): void {
    const subscribers = this.sessionSubscribers.get(sessionId);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in session subscriber:', error);
        }
      }
    }
  }

  /**
   * Get count of subscribers for debugging
   */
  getSubscriberCounts(sessionId: string): { queue: number; session: number } {
    return {
      queue: this.queueSubscribers.get(sessionId)?.size ?? 0,
      session: this.sessionSubscribers.get(sessionId)?.size ?? 0,
    };
  }
}

export const pubsub = new PubSub();
