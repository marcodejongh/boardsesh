import { vi } from 'vitest';

export class FakeClient {
  listeners = new Map<string, (...args: any[]) => void>();
  terminate = vi.fn();
  dispose = vi.fn();

  on(event: string, listener: (...args: any[]) => void) {
    this.listeners.set(event, listener);
    return () => this.listeners.delete(event);
  }

  emit(event: string, ...args: any[]) {
    const handler = this.listeners.get(event);
    if (handler) handler(...args);
  }
}
