import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deriveWsUrlFromHost } from '../backend-url';

describe('deriveWsUrlFromHost', () => {
  it('should derive wss URL for secure preview domain', () => {
    expect(deriveWsUrlFromHost('42.preview.boardsesh.com', true)).toBe(
      'wss://42.ws.preview.boardsesh.com/graphql',
    );
  });

  it('should derive ws URL for insecure preview domain', () => {
    expect(deriveWsUrlFromHost('42.preview.boardsesh.com', false)).toBe(
      'ws://42.ws.preview.boardsesh.com/graphql',
    );
  });

  it('should work with multi-digit PR numbers', () => {
    expect(deriveWsUrlFromHost('123.preview.boardsesh.com', true)).toBe(
      'wss://123.ws.preview.boardsesh.com/graphql',
    );
  });

  it('should return null for localhost', () => {
    expect(deriveWsUrlFromHost('localhost', true)).toBeNull();
  });

  it('should return null for bare boardsesh.com', () => {
    expect(deriveWsUrlFromHost('boardsesh.com', true)).toBeNull();
  });

  it('should return null for non-numeric prefix', () => {
    expect(deriveWsUrlFromHost('abc.preview.boardsesh.com', true)).toBeNull();
  });

  it('should return null for ws subdomain (not a frontend hostname)', () => {
    expect(deriveWsUrlFromHost('42.ws.preview.boardsesh.com', true)).toBeNull();
  });
});

describe('getBackendWsUrl (SSR context)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return NEXT_PUBLIC_WS_URL when set', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://backend.example.com/graphql';
    const { getBackendWsUrl } = await import('../backend-url');
    expect(getBackendWsUrl()).toBe('wss://backend.example.com/graphql');
  });

  it('should return null when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    const { getBackendWsUrl } = await import('../backend-url');
    expect(getBackendWsUrl()).toBeNull();
  });
});

describe('getGraphQLHttpUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should convert wss:// to https://', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://backend.example.com/graphql';
    const { getGraphQLHttpUrl } = await import('../backend-url');
    expect(getGraphQLHttpUrl()).toBe('https://backend.example.com/graphql');
  });

  it('should convert ws:// to http://', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:4000/graphql';
    const { getGraphQLHttpUrl } = await import('../backend-url');
    expect(getGraphQLHttpUrl()).toBe('http://localhost:4000/graphql');
  });

  it('should throw when no URL is available', async () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    const { getGraphQLHttpUrl } = await import('../backend-url');
    expect(() => getGraphQLHttpUrl()).toThrow(
      'Backend WebSocket URL could not be determined',
    );
  });
});

describe('getBackendHttpUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return HTTP base URL without /graphql path', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://backend.example.com/graphql';
    const { getBackendHttpUrl } = await import('../backend-url');
    expect(getBackendHttpUrl()).toBe('https://backend.example.com');
  });

  it('should return null when no URL is available', async () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    const { getBackendHttpUrl } = await import('../backend-url');
    expect(getBackendHttpUrl()).toBeNull();
  });

  it('should convert ws:// protocol to http://', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:4000/graphql';
    const { getBackendHttpUrl } = await import('../backend-url');
    expect(getBackendHttpUrl()).toBe('http://localhost:4000');
  });
});
