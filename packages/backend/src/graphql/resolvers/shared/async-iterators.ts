// Maximum queue size for subscriptions to prevent memory issues with slow clients
const MAX_SUBSCRIPTION_QUEUE_SIZE = 1000;

/**
 * Helper to create an async iterator from an async callback-based subscription.
 * Used for GraphQL subscriptions.
 * Includes bounded queue to prevent memory issues with slow clients.
 *
 * NOTE: This function is async because the subscribe function may need to
 * establish Redis connections before returning. We must await subscription
 * setup to ensure multi-instance pub/sub is ready before yielding events.
 */
export async function createAsyncIterator<T>(
  subscribe: (push: (value: T) => void) => Promise<() => void>
): Promise<AsyncIterable<T>> {
  const queue: T[] = [];
  const pending: Array<(value: IteratorResult<T>) => void> = [];
  let done = false;

  // Subscribe and await Redis channel setup before returning iterator
  const unsubscribe = await subscribe((value: T) => {
    if (pending.length > 0) {
      pending.shift()!({ value, done: false });
    } else {
      // Bounded queue: drop oldest events if queue is full
      if (queue.length >= MAX_SUBSCRIPTION_QUEUE_SIZE) {
        queue.shift(); // Drop oldest
        console.warn('[Subscription] Queue full, dropping oldest event');
      }
      queue.push(value);
    }
  });

  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          if (done) {
            return { value: undefined as unknown as T, done: true };
          }
          return new Promise((resolve) => pending.push(resolve));
        },
        async return(): Promise<IteratorResult<T>> {
          done = true;
          unsubscribe();
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}

/**
 * Helper to create an async iterator that subscribes IMMEDIATELY (eagerly).
 * Unlike createAsyncIterator which subscribes lazily when iteration starts,
 * this version subscribes right away to avoid missing events during setup.
 * This is critical for preventing race conditions where events could be
 * published between fetching initial state and starting to listen.
 *
 * NOTE: This function is async because the subscribe function may need to
 * establish Redis connections before returning. We must await subscription
 * setup to ensure multi-instance pub/sub is ready before yielding events.
 */
export async function createEagerAsyncIterator<T>(
  subscribe: (push: (value: T) => void) => Promise<() => void>
): Promise<AsyncIterable<T>> {
  const queue: T[] = [];
  const pending: Array<(value: IteratorResult<T>) => void> = [];
  let done = false;

  // Subscribe IMMEDIATELY and await Redis channel setup
  const unsubscribe = await subscribe((value: T) => {
    if (pending.length > 0) {
      pending.shift()!({ value, done: false });
    } else {
      // Bounded queue: drop oldest events if queue is full
      if (queue.length >= MAX_SUBSCRIPTION_QUEUE_SIZE) {
        queue.shift(); // Drop oldest
        console.warn('[Subscription] Queue full, dropping oldest event');
      }
      queue.push(value);
    }
  });

  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          if (done) {
            return { value: undefined as unknown as T, done: true };
          }
          return new Promise((resolve) => pending.push(resolve));
        },
        async return(): Promise<IteratorResult<T>> {
          done = true;
          unsubscribe();
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}
