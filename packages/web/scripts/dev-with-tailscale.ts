import { execFileSync, spawn } from 'node:child_process';

type HostResolution = {
  hostname: string;
  source: 'env' | 'tailscale' | 'fallback';
  reason?: string;
};

const DEFAULT_WEB_PORT = '3000';
const DEFAULT_BACKEND_PORT = '8080';
const TAILSCALE_STATUS_TIMEOUT_MS = 1500;
const DEFAULT_OTLP_PORT = '4318';

function normalizeHostname(value: string): string | null {
  const trimmed = value.trim().replace(/\.$/, '');
  if (!trimmed) return null;

  if (trimmed.includes('://') || trimmed.includes('/') || trimmed.includes(':')) {
    return null;
  }

  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

function resolveHostname(): HostResolution {
  const envHostnameRaw = process.env.TAILSCALE_HOSTNAME;
  if (envHostnameRaw !== undefined) {
    const envHostname = normalizeHostname(envHostnameRaw);
    if (envHostname) {
      return { hostname: envHostname, source: 'env' };
    }

    return {
      hostname: 'localhost',
      source: 'fallback',
      reason: 'TAILSCALE_HOSTNAME is invalid; falling back to localhost',
    };
  }

  try {
    const statusJson = execFileSync('tailscale', ['status', '--json'], {
      encoding: 'utf8',
      timeout: TAILSCALE_STATUS_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const parsed = JSON.parse(statusJson) as { Self?: { DNSName?: string } };
    const dnsName = parsed.Self?.DNSName;

    if (!dnsName) {
      return {
        hostname: 'localhost',
        source: 'fallback',
        reason: 'tailscale status missing Self.DNSName; falling back to localhost',
      };
    }

    const normalizedDnsName = normalizeHostname(dnsName);
    if (!normalizedDnsName) {
      return {
        hostname: 'localhost',
        source: 'fallback',
        reason: 'tailscale DNSName invalid; falling back to localhost',
      };
    }

    return { hostname: normalizedDnsName, source: 'tailscale' };
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'ENOENT') {
      return {
        hostname: 'localhost',
        source: 'fallback',
        reason: 'tailscale CLI not installed; falling back to localhost',
      };
    }

    return {
      hostname: 'localhost',
      source: 'fallback',
      reason: 'tailscale unavailable; falling back to localhost',
    };
  }
}

function setDefaultEnv(key: string, value: string): void {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

function main(): void {
  const webPort = process.env.PORT || DEFAULT_WEB_PORT;
  const backendPort = process.env.BACKEND_PORT || DEFAULT_BACKEND_PORT;
  const resolution = resolveHostname();

  setDefaultEnv('NEXT_PUBLIC_WS_URL', `ws://${resolution.hostname}:${backendPort}/graphql`);
  setDefaultEnv('NEXTAUTH_URL', `http://${resolution.hostname}:${webPort}`);
  setDefaultEnv('BASE_URL', `http://${resolution.hostname}:${webPort}`);
  setDefaultEnv('NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT', `http://${resolution.hostname}:${DEFAULT_OTLP_PORT}/v1/traces`);

  console.log(`[dev] Hostname: ${resolution.hostname} (${resolution.source})`);
  if (resolution.reason) {
    console.log(`[dev] ${resolution.reason}`);
  }
  console.log(`[dev] Web URL: http://${resolution.hostname}:${webPort}`);
  console.log(`[dev] Backend WS URL: ${process.env.NEXT_PUBLIC_WS_URL}`);

  const nextProcess = spawn('next', ['dev', '--hostname', '0.0.0.0', '--turbopack'], {
    env: process.env,
    stdio: 'inherit',
  });

  nextProcess.on('error', (error) => {
    console.error('[dev] Failed to start Next.js dev server:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main();
