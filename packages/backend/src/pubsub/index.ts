import type { QueueEvent, SessionEvent } from '@boardsesh/shared-schema';
import { redisClientManager } from '../redis/client.js';
import { createRedisPubSubAdapter, type RedisPubSubAdapter } from './redis-adapter.js';

type QueueSubscriber = (event: QueueEvent) => void;
type SessionSubscriber = (event: SessionEvent) => void;

/**
 * Hybrid PubSub that supports both local-only and Redis-backed modes.
 *
 * In Redis mode (multi-instance):
 * - Events are published to Redis channels
 * - Events from other instances are received and dispatched to local subscribers
 * - Local dispatch happens first for low latency
 *
 * In local-only mode (single instance, no Redis):
 * - Events are only dispatched to local subscribers
 * - Used when REDIS_URL is not configured
 */
class PubSub {
  private queueSubscribers: Map<string, Set<QueueSubscriber>> = new Map();
  private sessionSubscribers: Map<string, Set<SessionSubscriber>> = new Map();
  private redisAdapter: RedisPubSubAdapter | null = null;
  private initialized = false;
  private redisRequired = false;

  /**
   * Initialize the PubSub system.
   * Connects to Redis if configured.
   *
   * @throws If Redis is configured but connection fails (fail-closed behavior)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.redisRequired = redisClientManager.isRedisConfigured();

    if (this.redisRequired) {
      // Fail-closed: require Redis connection when configured
      const connected = await redisClientManager.connect();

      if (!connected) {
        throw new Error('Redis is configured but connection failed');
      }

      const { publisher, subscriber } = redisClientManager.getClients();
      this.redisAdapter = createRedisPubSubAdapter(publisher, subscriber);
      this.setupRedisMessageHandlers();

      console.log(`[PubSub] Redis mode enabled (instance: ${this.redisAdapter.getInstanceId()})`);
    } else {
      console.log('[PubSub] Local-only mode (single instance - no REDIS_URL configured)');
    }

    this.initialized = true;
  }

  /**
   * Check if Redis is connected and available.
   */
  isRedisConnected(): boolean {
    return this.redisAdapter !== null && redisClientManager.isRedisConnected();
  }

  /**
   * Check if Redis is required (REDIS_URL was configured at startup).
   */
  isRedisRequired(): boolean {
    return this.redisRequired;
  }

  private setupRedisMessageHandlers(): void {
    if (!this.redisAdapter) return;

    this.redisAdapter.onQueueMessage((sessionId, event) => {
      this.dispatchToLocalQueueSubscribers(sessionId, event);
    });

    this.redisAdapter.onSessionMessage((sessionId, event) => {
      this.dispatchToLocalSessionSubscribers(sessionId, event);
    });
  }

  /**
   * Subscribe to queue events for a session.
   * @returns Promise that resolves to an unsubscribe function
   * @throws If Redis is required but not connected, or if Redis subscription fails
   */
  async subscribeQueue(sessionId: string, callback: QueueSubscriber): Promise<() => void> {
    this.ensureRedisIfRequired();

    const isFirstSubscriber = !this.queueSubscribers.has(sessionId);

    if (!this.queueSubscribers.has(sessionId)) {
      this.queueSubscribers.set(sessionId, new Set());
    }
    this.queueSubscribers.get(sessionId)!.add(callback);

    // Subscribe to Redis channel if this is first local subscriber for session
    // IMPORTANT: We must await this to ensure Redis subscription is active
    // before returning, otherwise events from other instances could be missed
    if (isFirstSubscriber && this.redisAdapter) {
      try {
        await this.redisAdapter.subscribeQueueChannel(sessionId);
      } catch (error) {
        console.error(`[PubSub] Failed to subscribe to Redis queue channel: ${error}`);
        // Remove the subscriber since Redis subscription failed
        this.queueSubscribers.get(sessionId)?.delete(callback);
        if (this.queueSubscribers.get(sessionId)?.size === 0) {
          this.queueSubscribers.delete(sessionId);
        }
        if (this.redisRequired) {
          throw error;
        }
      }
    }

    return () => {
      this.queueSubscribers.get(sessionId)?.delete(callback);

      // Clean up empty sets and unsubscribe from Redis
      if (this.queueSubscribers.get(sessionId)?.size === 0) {
        this.queueSubscribers.delete(sessionId);

        if (this.redisAdapter) {
          this.redisAdapter.unsubscribeQueueChannel(sessionId).catch((error) => {
            console.error(`[PubSub] Failed to unsubscribe from Redis queue channel: ${error}`);
          });
        }
      }
    };
  }

  /**
   * Subscribe to session events (user joins/leaves, leader changes).
   * @returns Promise that resolves to an unsubscribe function
   * @throws If Redis is required but not connected, or if Redis subscription fails
   */
  async subscribeSession(sessionId: string, callback: SessionSubscriber): Promise<() => void> {
    this.ensureRedisIfRequired();

    const isFirstSubscriber = !this.sessionSubscribers.has(sessionId);

    if (!this.sessionSubscribers.has(sessionId)) {
      this.sessionSubscribers.set(sessionId, new Set());
    }
    this.sessionSubscribers.get(sessionId)!.add(callback);

    // Subscribe to Redis channel if this is first local subscriber for session
    // IMPORTANT: We must await this to ensure Redis subscription is active
    // before returning, otherwise events from other instances could be missed
    if (isFirstSubscriber && this.redisAdapter) {
      try {
        await this.redisAdapter.subscribeSessionChannel(sessionId);
      } catch (error) {
        console.error(`[PubSub] Failed to subscribe to Redis session channel: ${error}`);
        // Remove the subscriber since Redis subscription failed
        this.sessionSubscribers.get(sessionId)?.delete(callback);
        if (this.sessionSubscribers.get(sessionId)?.size === 0) {
          this.sessionSubscribers.delete(sessionId);
        }
        if (this.redisRequired) {
          throw error;
        }
      }
    }

    return () => {
      this.sessionSubscribers.get(sessionId)?.delete(callback);

      // Clean up empty sets and unsubscribe from Redis
      if (this.sessionSubscribers.get(sessionId)?.size === 0) {
        this.sessionSubscribers.delete(sessionId);

        if (this.redisAdapter) {
          this.redisAdapter.unsubscribeSessionChannel(sessionId).catch((error) => {
            console.error(`[PubSub] Failed to unsubscribe from Redis session channel: ${error}`);
          });
        }
      }
    };
  }

  /**
   * Publish a queue event to all subscribers of a session.
   * Dispatches locally first, then publishes to Redis for other instances.
   *
   * Note: Redis publish errors are logged but not thrown to avoid blocking
   * the local dispatch. In Redis mode, events may not reach other instances
   * if Redis publish fails.
   */
  publishQueueEvent(sessionId: string, event: QueueEvent): void {
    // Always dispatch to local subscribers first (low latency)
    this.dispatchToLocalQueueSubscribers(sessionId, event);

    // Also publish to Redis if available
    if (this.redisAdapter) {
      this.redisAdapter.publishQueueEvent(sessionId, event).catch((error) => {
        console.error('[PubSub] Redis queue publish failed:', error);
        // Log but don't throw - local dispatch already succeeded
        // Health check will report Redis as unhealthy if connection is lost
      });
    }
  }

  /**
   * Publish a session event to all subscribers.
   * Dispatches locally first, then publishes to Redis for other instances.
   *
   * Note: Redis publish errors are logged but not thrown to avoid blocking
   * the local dispatch. In Redis mode, events may not reach other instances
   * if Redis publish fails.
   */
  publishSessionEvent(sessionId: string, event: SessionEvent): void {
    // Always dispatch to local subscribers first (low latency)
    this.dispatchToLocalSessionSubscribers(sessionId, event);

    // Also publish to Redis if available
    if (this.redisAdapter) {
      this.redisAdapter.publishSessionEvent(sessionId, event).catch((error) => {
        console.error('[PubSub] Redis session publish failed:', error);
        // Log but don't throw - local dispatch already succeeded
        // Health check will report Redis as unhealthy if connection is lost
      });
    }
  }

  private dispatchToLocalQueueSubscribers(sessionId: string, event: QueueEvent): void {
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

  private dispatchToLocalSessionSubscribers(sessionId: string, event: SessionEvent): void {
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
   * Ensure Redis is connected if it's required.
   * @throws If Redis is required but not connected
   */
  private ensureRedisIfRequired(): void {
    if (this.redisRequired && !this.isRedisConnected()) {
      throw new Error('Redis is required but not connected');
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
