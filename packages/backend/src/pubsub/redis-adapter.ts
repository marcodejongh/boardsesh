import type { QueueEvent, SessionEvent, NotificationEvent, CommentEvent, NewClimbCreatedEvent } from '@boardsesh/shared-schema';
import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Channel naming convention
const QUEUE_CHANNEL_PREFIX = 'boardsesh:queue:';
const SESSION_CHANNEL_PREFIX = 'boardsesh:session:';
const NOTIFICATION_CHANNEL_PREFIX = 'boardsesh:notifications:';
const COMMENT_CHANNEL_PREFIX = 'boardsesh:comments:';
const NEW_CLIMB_CHANNEL_PREFIX = 'boardsesh:new-climbs:';

interface RedisMessage {
  instanceId: string;
  event: QueueEvent | SessionEvent | NotificationEvent | CommentEvent | NewClimbCreatedEvent;
  timestamp: number;
}

export interface RedisPubSubAdapter {
  publishQueueEvent(sessionId: string, event: QueueEvent): Promise<void>;
  publishSessionEvent(sessionId: string, event: SessionEvent): Promise<void>;
  publishNotificationEvent(userId: string, event: NotificationEvent): Promise<void>;
  publishCommentEvent(entityKey: string, event: CommentEvent): Promise<void>;
  publishNewClimbEvent(channelKey: string, event: NewClimbCreatedEvent): Promise<void>;
  subscribeQueueChannel(sessionId: string): Promise<void>;
  subscribeSessionChannel(sessionId: string): Promise<void>;
  subscribeNotificationChannel(userId: string): Promise<void>;
  subscribeCommentChannel(entityKey: string): Promise<void>;
  subscribeNewClimbChannel(channelKey: string): Promise<void>;
  unsubscribeQueueChannel(sessionId: string): Promise<void>;
  unsubscribeSessionChannel(sessionId: string): Promise<void>;
  unsubscribeNotificationChannel(userId: string): Promise<void>;
  unsubscribeCommentChannel(entityKey: string): Promise<void>;
  unsubscribeNewClimbChannel(channelKey: string): Promise<void>;
  onQueueMessage(callback: (sessionId: string, event: QueueEvent) => void): void;
  onSessionMessage(callback: (sessionId: string, event: SessionEvent) => void): void;
  onNotificationMessage(callback: (userId: string, event: NotificationEvent) => void): void;
  onCommentMessage(callback: (entityKey: string, event: CommentEvent) => void): void;
  onNewClimbMessage(callback: (channelKey: string, event: NewClimbCreatedEvent) => void): void;
  getInstanceId(): string;
}

export function createRedisPubSubAdapter(
  publisher: Redis,
  subscriber: Redis
): RedisPubSubAdapter {
  const instanceId = uuidv4();
  const subscribedQueueChannels = new Set<string>();
  const subscribedSessionChannels = new Set<string>();
  const subscribedNotificationChannels = new Set<string>();
  const subscribedCommentChannels = new Set<string>();
  const subscribedNewClimbChannels = new Set<string>();

  let queueMessageCallback: ((sessionId: string, event: QueueEvent) => void) | null = null;
  let sessionMessageCallback: ((sessionId: string, event: SessionEvent) => void) | null = null;
  let notificationMessageCallback: ((userId: string, event: NotificationEvent) => void) | null = null;
  let commentMessageCallback: ((entityKey: string, event: CommentEvent) => void) | null = null;
  let newClimbMessageCallback: ((channelKey: string, event: NewClimbCreatedEvent) => void) | null = null;

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
      } else if (channel.startsWith(NOTIFICATION_CHANNEL_PREFIX)) {
        const userId = channel.slice(NOTIFICATION_CHANNEL_PREFIX.length);
        if (notificationMessageCallback) {
          notificationMessageCallback(userId, parsed.event as NotificationEvent);
        }
      } else if (channel.startsWith(COMMENT_CHANNEL_PREFIX)) {
        const entityKey = channel.slice(COMMENT_CHANNEL_PREFIX.length);
        if (commentMessageCallback) {
          commentMessageCallback(entityKey, parsed.event as CommentEvent);
        }
      } else if (channel.startsWith(NEW_CLIMB_CHANNEL_PREFIX)) {
        const channelKey = channel.slice(NEW_CLIMB_CHANNEL_PREFIX.length);
        if (newClimbMessageCallback) {
          newClimbMessageCallback(channelKey, parsed.event as NewClimbCreatedEvent);
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

    async publishNotificationEvent(userId: string, event: NotificationEvent): Promise<void> {
      const channel = `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;
      const message: RedisMessage = {
        instanceId,
        event,
        timestamp: Date.now(),
      };
      await publisher.publish(channel, JSON.stringify(message));
    },

    async publishCommentEvent(entityKey: string, event: CommentEvent): Promise<void> {
      const channel = `${COMMENT_CHANNEL_PREFIX}${entityKey}`;
      const message: RedisMessage = {
        instanceId,
        event,
        timestamp: Date.now(),
      };
      await publisher.publish(channel, JSON.stringify(message));
    },

    async publishNewClimbEvent(channelKey: string, event: NewClimbCreatedEvent): Promise<void> {
      const channel = `${NEW_CLIMB_CHANNEL_PREFIX}${channelKey}`;
      const message: RedisMessage = {
        instanceId,
        event,
        timestamp: Date.now(),
      };
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

    async subscribeNotificationChannel(userId: string): Promise<void> {
      const channel = `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;
      if (subscribedNotificationChannels.has(channel)) {
        return;
      }
      await subscriber.subscribe(channel);
      subscribedNotificationChannels.add(channel);
    },

    async subscribeCommentChannel(entityKey: string): Promise<void> {
      const channel = `${COMMENT_CHANNEL_PREFIX}${entityKey}`;
      if (subscribedCommentChannels.has(channel)) {
        return;
      }
      await subscriber.subscribe(channel);
      subscribedCommentChannels.add(channel);
    },

    async subscribeNewClimbChannel(channelKey: string): Promise<void> {
      const channel = `${NEW_CLIMB_CHANNEL_PREFIX}${channelKey}`;
      if (subscribedNewClimbChannels.has(channel)) {
        return;
      }
      await subscriber.subscribe(channel);
      subscribedNewClimbChannels.add(channel);
      console.log(`[Redis] Subscribed to new climb channel: ${channelKey}`);
    },

    async unsubscribeNotificationChannel(userId: string): Promise<void> {
      const channel = `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;
      if (!subscribedNotificationChannels.has(channel)) {
        return;
      }
      await subscriber.unsubscribe(channel);
      subscribedNotificationChannels.delete(channel);
    },

    async unsubscribeCommentChannel(entityKey: string): Promise<void> {
      const channel = `${COMMENT_CHANNEL_PREFIX}${entityKey}`;
      if (!subscribedCommentChannels.has(channel)) {
        return;
      }
      await subscriber.unsubscribe(channel);
      subscribedCommentChannels.delete(channel);
    },

    async unsubscribeNewClimbChannel(channelKey: string): Promise<void> {
      const channel = `${NEW_CLIMB_CHANNEL_PREFIX}${channelKey}`;
      if (!subscribedNewClimbChannels.has(channel)) {
        return;
      }
      await subscriber.unsubscribe(channel);
      subscribedNewClimbChannels.delete(channel);
      console.log(`[Redis] Unsubscribed from new climb channel: ${channelKey}`);
    },

    onQueueMessage(callback: (sessionId: string, event: QueueEvent) => void): void {
      queueMessageCallback = callback;
    },

    onSessionMessage(callback: (sessionId: string, event: SessionEvent) => void): void {
      sessionMessageCallback = callback;
    },

    onNotificationMessage(callback: (userId: string, event: NotificationEvent) => void): void {
      notificationMessageCallback = callback;
    },

    onCommentMessage(callback: (entityKey: string, event: CommentEvent) => void): void {
      commentMessageCallback = callback;
    },

    onNewClimbMessage(callback: (channelKey: string, event: NewClimbCreatedEvent) => void): void {
      newClimbMessageCallback = callback;
    },

    getInstanceId(): string {
      return instanceId;
    },
  };
}
