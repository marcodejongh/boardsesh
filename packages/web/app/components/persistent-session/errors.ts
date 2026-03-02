/**
 * Thrown when a JoinSession mutation completes but returns no usable payload.
 * This is a transient condition (e.g. the server accepted the connection but
 * the session state wasn't ready yet) and can be retried with backoff.
 */
export class TransientJoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientJoinError';
  }
}
