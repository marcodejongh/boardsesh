/**
 * GATT Operation Queue
 *
 * Serializes Bluetooth GATT operations to prevent "GATT operation already in progress" errors.
 * Only one operation can run at a time per characteristic.
 */

type QueuedOperation<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  key?: string;
};

/**
 * Creates a queue that serializes async operations.
 * Operations are executed one at a time in the order they are added.
 */
export function createGattQueue() {
  const queue: QueuedOperation<unknown>[] = [];
  let isProcessing = false;

  async function processQueue() {
    if (isProcessing || queue.length === 0) {
      return;
    }

    isProcessing = true;

    while (queue.length > 0) {
      const operation = queue.shift()!;

      try {
        const result = await operation.execute();
        operation.resolve(result);
      } catch (error) {
        operation.reject(error);
      }
    }

    isProcessing = false;
  }

  /**
   * Enqueues an async operation to be executed when the queue is free.
   * Returns a promise that resolves when the operation completes.
   *
   * @param execute - The async operation to execute
   * @param key - Optional key to identify the operation type. If provided,
   *              any pending operations with the same key will be cancelled
   *              before adding this one. This is useful for "latest only" semantics
   *              where only the most recent operation of a type matters.
   */
  function enqueue<T>(execute: () => Promise<T>, key?: string): Promise<T> {
    // If a key is provided, remove any pending operations with the same key
    if (key) {
      const pendingWithSameKey = queue.filter((op) => op.key === key);
      for (const op of pendingWithSameKey) {
        const index = queue.indexOf(op);
        if (index !== -1) {
          queue.splice(index, 1);
          // Resolve with undefined to indicate the operation was superseded
          op.resolve(undefined);
        }
      }
    }

    return new Promise<T>((resolve, reject) => {
      queue.push({
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        key,
      });
      processQueue();
    });
  }

  /**
   * Clears all pending operations from the queue.
   * Does not cancel the currently executing operation.
   */
  function clear() {
    const pendingOps = queue.splice(0, queue.length);
    for (const op of pendingOps) {
      op.reject(new Error('Queue cleared'));
    }
  }

  /**
   * Returns the number of pending operations in the queue.
   */
  function size() {
    return queue.length;
  }

  /**
   * Returns whether an operation is currently being processed.
   */
  function isBusy() {
    return isProcessing;
  }

  return {
    enqueue,
    clear,
    size,
    isBusy,
  };
}

export type GattQueue = ReturnType<typeof createGattQueue>;

// Singleton queue for GATT operations
// Using a single queue ensures no concurrent GATT operations across the entire app
let globalGattQueue: GattQueue | null = null;

export function getGlobalGattQueue(): GattQueue {
  if (!globalGattQueue) {
    globalGattQueue = createGattQueue();
  }
  return globalGattQueue;
}
