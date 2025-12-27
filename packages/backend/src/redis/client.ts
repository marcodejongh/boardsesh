import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

export interface RedisClients {
  publisher: Redis;
  subscriber: Redis;
}

class RedisClientManager {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;

  /**
   * Connect to Redis. Returns true if connected, false if Redis is not configured.
   * Throws if connection fails (fail-closed behavior).
   */
  async connect(): Promise<boolean> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!REDIS_URL) {
      console.log('[Redis] No REDIS_URL configured - Redis pub/sub is required for multi-instance mode');
      return false;
    }

    this.connectionPromise = this.doConnect();
    return this.connectionPromise;
  }

  private async doConnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('[Redis] Connecting to Redis...');

      // Create publisher connection
      this.publisher = new Redis(REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 10) {
            console.error('[Redis] Max reconnection attempts reached');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 1000, 5000);
          console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
        lazyConnect: false,
      });

      // Create subscriber connection (required by ioredis - subscriber enters special mode)
      this.subscriber = new Redis(REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 10) {
            return null;
          }
          return Math.min(times * 1000, 5000);
        },
        lazyConnect: false,
      });

      let publisherReady = false;
      let subscriberReady = false;

      const checkBothReady = () => {
        if (publisherReady && subscriberReady) {
          this.isConnected = true;
          console.log('[Redis] Connected successfully');
          resolve(true);
        }
      };

      this.publisher.on('ready', () => {
        publisherReady = true;
        checkBothReady();
      });

      this.subscriber.on('ready', () => {
        subscriberReady = true;
        checkBothReady();
      });

      this.publisher.on('error', (err) => {
        console.error('[Redis] Publisher error:', err.message);
        if (!this.isConnected) {
          reject(new Error(`Redis publisher connection failed: ${err.message}`));
        }
      });

      this.subscriber.on('error', (err) => {
        console.error('[Redis] Subscriber error:', err.message);
        if (!this.isConnected) {
          reject(new Error(`Redis subscriber connection failed: ${err.message}`));
        }
      });

      // Handle disconnection after initial connection
      this.publisher.on('close', () => {
        if (this.isConnected) {
          console.warn('[Redis] Publisher connection closed');
          this.isConnected = false;
        }
      });

      this.subscriber.on('close', () => {
        if (this.isConnected) {
          console.warn('[Redis] Subscriber connection closed');
          this.isConnected = false;
        }
      });

      // Handle reconnection
      this.publisher.on('reconnecting', () => {
        console.log('[Redis] Publisher reconnecting...');
      });

      this.subscriber.on('reconnecting', () => {
        console.log('[Redis] Subscriber reconnecting...');
      });
    });
  }

  /**
   * Get Redis clients. Throws if not connected.
   */
  getClients(): RedisClients {
    if (!this.publisher || !this.subscriber) {
      throw new Error('Redis not connected - call connect() first');
    }
    return {
      publisher: this.publisher,
      subscriber: this.subscriber,
    };
  }

  /**
   * Check if Redis is connected and available.
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if Redis is configured (REDIS_URL is set).
   */
  isRedisConfigured(): boolean {
    return !!REDIS_URL;
  }

  /**
   * Gracefully disconnect from Redis.
   */
  async disconnect(): Promise<void> {
    console.log('[Redis] Disconnecting...');

    const disconnectPromises: Promise<void>[] = [];

    if (this.publisher) {
      disconnectPromises.push(
        this.publisher.quit().then(() => {
          console.log('[Redis] Publisher disconnected');
        })
      );
    }

    if (this.subscriber) {
      disconnectPromises.push(
        this.subscriber.quit().then(() => {
          console.log('[Redis] Subscriber disconnected');
        })
      );
    }

    await Promise.all(disconnectPromises);

    this.publisher = null;
    this.subscriber = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }
}

export const redisClientManager = new RedisClientManager();
