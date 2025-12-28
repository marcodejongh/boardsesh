import type { QueueEvent, SessionEvent } from '@boardsesh/shared-schema';
import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Channel naming convention
const QUEUE_CHANNEL_PREFIX = 'boardsesh:queue:';
const SESSION_CHANNEL_PREFIX = 'boardsesh:session:';

interface RedisMessage {
  instanceId: string;
  event: QueueEvent | SessionEvent;
  timestamp: number;
}

export interface RedisPubSubAdapter {
  publishQueueEvent(sessionId: string, event: QueueEvent): Promise<void>;
  publishSessionEvent(sessionId: string, event: SessionEvent): Promise<void>;
  subscribeQueueChannel(sessionId: string): Promise<void>;
  subscribeSessionChannel(sessionId: string): Promise<void>;
  unsubscribeQueueChannel(sessionId: string): Promise<void>;
  unsubscribeSessionChannel(sessionId: string): Promise<void>;
  onQueueMessage(callback: (sessionId: string, event: QueueEvent) => void): void;
  onSessionMessage(callback: (sessionId: string, event: SessionEvent) => void): void;
  getInstanceId(): string;
}

export function createRedisPubSubAdapter(
  publisher: Redis,
  subscriber: Redis
): RedisPubSubAdapter {
  const instanceId = uuidv4();
  const subscribedQueueChannels = new Set<string>();
  const subscribedSessionChannels = new Set<string>();

  let queueMessageCallback: ((sessionId: string, event: QueueEvent) => void) | null = null;
  let sessionMessageCallback: ((sessionId: string, event: SessionEvent) => void) | null = null;

  // Set up message handler
  subscriber.on('message', (channel: string, message: string) => {
    try {
      const parsed = JSON.parse(message) as RedisMessage;

      // Skip messages from this instance (already delivered locally)
      if (parsed.instanceId === instanceId) {
        return;
      }

      console.log(`[Redis] Received cross-instance message from ${parsed.instanceId.slice(0, 8)} on channel: ${channel}`);

      if (channel.startsWith(QUEUE_CHANNEL_PREFIX)) {
        const sessionId = channel.slice(QUEUE_CHANNEL_PREFIX.length);
        if (queueMessageCallback) {
          queueMessageCallback(sessionId, parsed.event as QueueEvent);
        }
      } else if (channel.startsWith(SESSION_CHANNEL_PREFIX)) {
        const sessionId = channel.slice(SESSION_CHANNEL_PREFIX.length);
        if (sessionMessageCallback) {
          sessionMessageCallback(sessionId, parsed.event as SessionEvent);
        }
      }
    } catch (error) {
      console.error('[Redis] Failed to parse message:', error);
    }
  });

  return {
    async publishQueueEvent(sessionId: string, event: QueueEvent): Promise<void> {
      const channel = `${QUEUE_CHANNEL_PREFIX}${sessionId}`;
      const message: RedisMessage = {
        instanceId,
        event,
        timestamp: Date.now(),
      };
      console.log(`[Redis] Publishing queue event to channel: ${sessionId} (type: ${event.__typename})`);
      await publisher.publish(channel, JSON.stringify(message));
    },

    async publishSessionEvent(sessionId: string, event: SessionEvent): Promise<void> {
      const channel = `${SESSION_CHANNEL_PREFIX}${sessionId}`;
      const message: RedisMessage = {
        instanceId,
        event,
        timestamp: Date.now(),
      };
      console.log(`[Redis] Publishing session event to channel: ${sessionId} (type: ${event.__typename})`);
      await publisher.publish(channel, JSON.stringify(message));
    },

    async subscribeQueueChannel(sessionId: string): Promise<void> {
      const channel = `${QUEUE_CHANNEL_PREFIX}${sessionId}`;
      if (subscribedQueueChannels.has(channel)) {
        return;
      }
      await subscriber.subscribe(channel);
      subscribedQueueChannels.add(channel);
      console.log(`[Redis] Subscribed to queue channel: ${sessionId}`);
    },

    async subscribeSessionChannel(sessionId: string): Promise<void> {
      const channel = `${SESSION_CHANNEL_PREFIX}${sessionId}`;
      if (subscribedSessionChannels.has(channel)) {
        return;
      }
      await subscriber.subscribe(channel);
      subscribedSessionChannels.add(channel);
      console.log(`[Redis] Subscribed to session channel: ${sessionId}`);
    },

    async unsubscribeQueueChannel(sessionId: string): Promise<void> {
      const channel = `${QUEUE_CHANNEL_PREFIX}${sessionId}`;
      if (!subscribedQueueChannels.has(channel)) {
        return;
      }
      await subscriber.unsubscribe(channel);
      subscribedQueueChannels.delete(channel);
      console.log(`[Redis] Unsubscribed from queue channel: ${sessionId}`);
    },

    async unsubscribeSessionChannel(sessionId: string): Promise<void> {
      const channel = `${SESSION_CHANNEL_PREFIX}${sessionId}`;
      if (!subscribedSessionChannels.has(channel)) {
        return;
      }
      await subscriber.unsubscribe(channel);
      subscribedSessionChannels.delete(channel);
      console.log(`[Redis] Unsubscribed from session channel: ${sessionId}`);
    },

    onQueueMessage(callback: (sessionId: string, event: QueueEvent) => void): void {
      queueMessageCallback = callback;
    },

    onSessionMessage(callback: (sessionId: string, event: SessionEvent) => void): void {
      sessionMessageCallback = callback;
    },

    getInstanceId(): string {
      return instanceId;
    },
  };
}
