import type Redis from 'ioredis';
import type { SocialEvent } from '@boardsesh/shared-schema';
import { v4 as uuidv4 } from 'uuid';

const STREAM_KEY = 'boardsesh:events';
const CONSUMER_GROUP = 'notification-workers';
const BATCH_SIZE = 50;
const BLOCK_MS = 5000;
const CLAIM_IDLE_MS = 30000;
const MAX_STREAM_LEN = 10000;

export class EventBroker {
  /** Used for non-blocking operations: xadd, xack, xgroup */
  private publisher: Redis | null = null;
  /** Dedicated connection for blocking operations: xreadgroup, xautoclaim */
  private consumer: Redis | null = null;
  private consumerName: string;
  private running = false;
  private consumerTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.consumerName = `instance-${uuidv4().slice(0, 8)}`;
  }

  async initialize(publisher: Redis, consumer: Redis): Promise<void> {
    this.publisher = publisher;
    this.consumer = consumer;

    // Create consumer group (idempotent) - uses publisher (non-blocking)
    try {
      await this.publisher.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '$', 'MKSTREAM');
      console.log(`[EventBroker] Created consumer group "${CONSUMER_GROUP}" on "${STREAM_KEY}"`);
    } catch (error: unknown) {
      // BUSYGROUP means group already exists, which is fine
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        console.log(`[EventBroker] Consumer group "${CONSUMER_GROUP}" already exists`);
      } else {
        throw error;
      }
    }

    console.log(`[EventBroker] Initialized (consumer: ${this.consumerName})`);
  }

  isInitialized(): boolean {
    return this.publisher !== null;
  }

  async publish(event: SocialEvent): Promise<void> {
    if (!this.publisher) {
      console.warn('[EventBroker] Not initialized, skipping publish');
      return;
    }

    try {
      await this.publisher.xadd(
        STREAM_KEY,
        'MAXLEN', '~', String(MAX_STREAM_LEN),
        '*',
        'type', event.type,
        'actorId', event.actorId,
        'entityType', event.entityType,
        'entityId', event.entityId,
        'timestamp', String(event.timestamp),
        'metadata', JSON.stringify(event.metadata),
      );
    } catch (error) {
      console.error('[EventBroker] Failed to publish event:', error);
    }
  }

  startConsumer(handler: (event: SocialEvent) => Promise<void>): void {
    if (!this.publisher || !this.consumer) {
      console.warn('[EventBroker] Not initialized, cannot start consumer');
      return;
    }

    this.running = true;
    console.log(`[EventBroker] Starting consumer "${this.consumerName}"`);

    const runLoop = async () => {
      let consecutiveErrors = 0;

      while (this.running) {
        // Check if Redis connection is permanently closed
        if (this.consumer?.status === 'end') {
          console.error('[EventBroker] Redis connection permanently closed, stopping consumer loop');
          this.running = false;
          break;
        }

        try {
          // 1. Reclaim dead consumer events
          await this.reclaimPendingEvents(handler);

          // 2. Read new events
          await this.readNewEvents(handler);

          consecutiveErrors = 0;
        } catch (error) {
          consecutiveErrors++;
          const delay = Math.min(1000 * Math.pow(2, consecutiveErrors - 1), 30000);
          console.error(`[EventBroker] Consumer loop error (attempt ${consecutiveErrors}, retry in ${delay}ms):`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    runLoop();
  }

  private async reclaimPendingEvents(handler: (event: SocialEvent) => Promise<void>): Promise<void> {
    if (!this.consumer || !this.publisher) return;

    try {
      const result = await this.consumer.xautoclaim(
        STREAM_KEY,
        CONSUMER_GROUP,
        this.consumerName,
        CLAIM_IDLE_MS,
        '0-0',
        'COUNT', 10,
      );

      // xautoclaim returns [nextStartId, claimedEntries, ...]
      const entries = result[1] as Array<[string, string[]]>;
      if (entries && entries.length > 0) {
        console.log(`[EventBroker] Reclaimed ${entries.length} pending events`);
        for (const [messageId, fields] of entries) {
          const event = this.parseEvent(fields);
          if (event) {
            try {
              await handler(event);
              // Only acknowledge after successful processing (non-blocking)
              await this.publisher.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
            } catch (error) {
              console.error(`[EventBroker] Error processing reclaimed event ${messageId}, will retry:`, error);
            }
          } else {
            // Unparseable event - ack to avoid infinite retry
            await this.publisher.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
          }
        }
      }
    } catch (error) {
      // xautoclaim may not be available on older Redis versions
      if (error instanceof Error && error.message.includes('ERR unknown command')) {
        // Silently skip - xautoclaim requires Redis 6.2+
      } else if (error instanceof Error && error.message.includes('Connection is closed')) {
        // Re-throw connection errors so the outer loop handles them with backoff
        throw error;
      } else {
        console.error('[EventBroker] Error reclaiming events:', error);
      }
    }
  }

  private async readNewEvents(handler: (event: SocialEvent) => Promise<void>): Promise<void> {
    if (!this.consumer || !this.publisher) return;

    const result = await this.consumer.xreadgroup(
      'GROUP', CONSUMER_GROUP, this.consumerName,
      'COUNT', BATCH_SIZE,
      'BLOCK', BLOCK_MS,
      'STREAMS', STREAM_KEY, '>',
    );

    if (!result) return; // Timed out with no new events

    const streams = result as Array<[string, Array<[string, string[]]>]>;
    for (const [, entries] of streams) {
      for (const [messageId, fields] of entries) {
        const event = this.parseEvent(fields);
        if (event) {
          try {
            await handler(event);
            // Only acknowledge after successful processing (non-blocking)
            await this.publisher.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
          } catch (error) {
            console.error(`[EventBroker] Error processing event ${messageId}, will retry:`, error);
          }
        } else {
          // Unparseable event - ack to avoid infinite retry
          await this.publisher.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
        }
      }
    }
  }

  private parseEvent(fields: string[]): SocialEvent | null {
    try {
      const map = new Map<string, string>();
      for (let i = 0; i < fields.length; i += 2) {
        map.set(fields[i], fields[i + 1]);
      }

      return {
        type: map.get('type') as SocialEvent['type'],
        actorId: map.get('actorId')!,
        entityType: map.get('entityType')!,
        entityId: map.get('entityId')!,
        timestamp: Number(map.get('timestamp')),
        metadata: JSON.parse(map.get('metadata') || '{}'),
      };
    } catch (error) {
      console.error('[EventBroker] Failed to parse event:', error);
      return null;
    }
  }

  shutdown(): void {
    this.running = false;
    if (this.consumerTimeout) {
      clearTimeout(this.consumerTimeout);
      this.consumerTimeout = null;
    }
    console.log(`[EventBroker] Consumer "${this.consumerName}" shut down`);
  }
}
